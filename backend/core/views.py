import json
import logging
import random
import tempfile
import os
import urllib.request
import urllib.error
from decimal import Decimal

from django.conf import settings as django_settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import F, Max, Q, Sum
from django.db.models.functions import Coalesce
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response

from .models import TradeRecord, EmailOTP, UserProfile

logger = logging.getLogger("core")


def _send_email(subject, message, recipient_list, fail_silently=True):
    """Send email via Resend HTTP API."""
    api_key = django_settings.RESEND_API_KEY
    if not api_key:
        logger.warning("RESEND_API_KEY not set — email not sent")
        return
    payload = json.dumps({
        "from": django_settings.DEFAULT_FROM_EMAIL,
        "to": recipient_list,
        "subject": subject,
        "text": message,
    }).encode()
    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=payload,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            resp.read()
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        logger.error("Resend API error %s: %s", e.code, body)
        if not fail_silently:
            raise
    except Exception:
        if not fail_silently:
            raise
        logger.exception("Resend email failed to %s", recipient_list)


def _apply_filters(qs, params):
    """Apply common filters to a queryset."""
    year        = params.get("year")
    sector      = params.get("sector")
    hs2         = params.get("hs2")
    hs4         = params.get("hs4")
    brochure2   = params.get("brochure2")
    hs2_description = params.get("hs2_description")
    keyword     = params.get("keyword")
    macrosector = params.get("macrosector")
    search      = params.get("search", "").strip()

    if year:
        qs = qs.filter(year=year)
    if sector:
        qs = qs.filter(sector=sector)
    if hs2:
        qs = qs.filter(hs2=hs2)
    if hs4:
        qs = qs.filter(hs4=hs4)
    if brochure2:
        qs = qs.filter(brochure2=brochure2)
    if hs2_description:
        qs = qs.filter(hs2_description=hs2_description)
    if keyword:
        qs = qs.filter(keyword=keyword)
    if macrosector:
        qs = qs.filter(macrosector=macrosector)
    if search:
        qs = qs.filter(
            Q(description__icontains=search) |
            Q(sector__icontains=search) |
            Q(hs2__icontains=search) |
            Q(hs4__icontains=search) |
            Q(hs2_description__icontains=search)
        )
    return qs


# ── PUBLIC STATS ──────────────────────────────────────────────────────────────


@api_view(["GET"])
@permission_classes([AllowAny])
def stats_summary(request):
    """KPI cards: bilateral trade totals. Uses HS2-level rows to avoid double-counting."""
    qs = TradeRecord.objects.filter(hs4="")
    qs = _apply_filters(qs, request.query_params)

    totals = qs.aggregate(
        italy_to_india=Coalesce(Sum("italy_to_india_value"), Decimal("0")),
        india_to_italy=Coalesce(Sum("india_to_italy_value"), Decimal("0")),
    )

    bilateral = totals["italy_to_india"] + totals["india_to_italy"]

    return Response({
        "bilateral_trade_value":    float(bilateral),
        "india_imports_from_italy": float(totals["italy_to_india"]),
        "italy_imports_from_india": float(totals["india_to_italy"]),
    })


@api_view(["GET"])
@permission_classes([AllowAny])
def stats_yearwise(request):
    """Year-wise bar chart data. Uses HS2-level rows."""
    qs = TradeRecord.objects.filter(hs4="")
    qs = _apply_filters(qs, request.query_params)

    rows = (
        qs.values("year")
        .annotate(
            italy_to_india=Coalesce(Sum("italy_to_india_value"), Decimal("0")),
            india_to_italy=Coalesce(Sum("india_to_italy_value"), Decimal("0")),
        )
        .order_by("year")
    )

    return Response({
        "rows": [
            {
                "year":          r["year"],
                "italy_to_india": float(r["italy_to_india"]),
                "india_to_italy": float(r["india_to_italy"]),
            }
            for r in rows
        ]
    })


@api_view(["GET"])
@permission_classes([AllowAny])
def stats_sector_wise(request):
    """Sector-wise breakdown. Uses HS2-level rows."""
    qs = TradeRecord.objects.filter(hs4="").exclude(sector="")
    qs = _apply_filters(qs, request.query_params)

    rows = (
        qs.values("sector")
        .annotate(
            italy_to_india=Coalesce(Sum("italy_to_india_value"), Decimal("0")),
            india_to_italy=Coalesce(Sum("india_to_italy_value"), Decimal("0")),
        )
        .order_by("-italy_to_india")
    )

    return Response({
        "rows": [
            {
                "sector":        r["sector"],
                "italy_to_india": float(r["italy_to_india"]),
                "india_to_italy": float(r["india_to_italy"]),
            }
            for r in rows
        ]
    })


@api_view(["GET"])
@permission_classes([AllowAny])
def stats_top_products(request):
    """Top 10 HS4 product categories by total trade value."""
    qs = TradeRecord.objects.exclude(hs4="")
    qs = _apply_filters(qs, request.query_params)

    rows = (
        qs.values("hs4")
        .annotate(
            description=Max("description"),
            italy_to_india=Coalesce(Sum("italy_to_india_value"), Decimal("0")),
            india_to_italy=Coalesce(Sum("india_to_italy_value"), Decimal("0")),
        )
        .annotate(total=F("italy_to_india") + F("india_to_italy"))
        .order_by("-total")[:10]
    )

    return Response({
        "rows": [
            {
                "hs4":           r["hs4"],
                "description":   r["description"],
                "italy_to_india": float(r["italy_to_india"]),
                "india_to_italy": float(r["india_to_italy"]),
                "total":          float(r["total"]),
            }
            for r in rows
        ]
    })


@api_view(["GET"])
@permission_classes([AllowAny])
def filter_options(request):
    """Return all available filter values for dropdowns."""
    years = sorted(TradeRecord.objects.values_list("year", flat=True).distinct())
    sectors = sorted(
        TradeRecord.objects.exclude(sector="").values_list("sector", flat=True).distinct()
    )
    hs2_options = list(
        TradeRecord.objects.filter(hs4="")
        .values("hs2", "description").distinct().order_by("hs2")
    )
    hs4_options = list(
        TradeRecord.objects.exclude(hs4="")
        .values("hs4", "description").distinct().order_by("hs4")
    )
    brochure2_options = sorted(
        TradeRecord.objects.exclude(brochure2="").values_list("brochure2", flat=True).distinct()
    )
    hs2_desc_options = list(
        TradeRecord.objects.filter(hs4="").exclude(hs2_description="")
        .values("hs2", "hs2_description").distinct().order_by("hs2")
    )
    keyword_options = sorted(
        TradeRecord.objects.exclude(keyword="").values_list("keyword", flat=True).distinct()
    )
    macrosector_options = sorted(
        TradeRecord.objects.exclude(macrosector="").values_list("macrosector", flat=True).distinct()
    )

    return Response({
        "years":             years,
        "sectors":           sectors,
        "hs2_options":       hs2_options,
        "hs4_options":       hs4_options,
        "brochure2_options": brochure2_options,
        "hs2_desc_options":  hs2_desc_options,
        "keyword_options":   keyword_options,
        "macrosector_options": macrosector_options,
    })


# ── PRIVATE DATA TABLE ────────────────────────────────────────────────────────


MAX_PAGE_SIZE = 100


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def trade_table(request):
    qs = TradeRecord.objects.all().order_by("-year", "hs2", "hs4")
    qs = _apply_filters(qs, request.query_params)

    try:
        page = max(1, int(request.query_params.get("page", 1)))
    except (ValueError, TypeError):
        page = 1

    try:
        page_size = min(MAX_PAGE_SIZE, max(1, int(request.query_params.get("page_size", 25))))
    except (ValueError, TypeError):
        page_size = 25

    start = (page - 1) * page_size
    end   = start + page_size
    total = qs.count()

    items = qs.values(
        "id", "year", "quarter", "hs2", "hs4",
        "description", "hs2_description", "sector", "brochure2",
        "macrosector", "keyword",
        "italy_to_india_value", "india_to_italy_value",
    )[start:end]

    return Response({
        "total":     total,
        "page":      page,
        "page_size": page_size,
        "items":     list(items),
    })


# ── AUTH ──────────────────────────────────────────────────────────────────────


@api_view(["GET"])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def csrf(request):
    return Response({"csrfToken": get_token(request)})


@api_view(["POST"])
@permission_classes([AllowAny])
def session_login(request):
    username = request.data.get("username", "")
    password = request.data.get("password", "")

    if not isinstance(username, str) or not isinstance(password, str):
        return Response({"detail": "Invalid input."}, status=400)
    if not username or len(username) > 150 or len(password) > 128:
        return Response({"detail": "Invalid credentials"}, status=400)

    user = authenticate(request, username=username, password=password)
    if user is None:
        return Response({"detail": "Invalid credentials"}, status=400)

    profile = getattr(user, "profile", None)
    if profile:
        if profile.approval_status == UserProfile.PENDING:
            return Response({"detail": "Your account is pending admin approval."}, status=403)
        if profile.approval_status == UserProfile.REJECTED:
            return Response({"detail": "Your account request was not approved."}, status=403)

    login(request, user)
    return Response({"detail": "Logged in", "username": user.username, "is_staff": user.is_staff})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def session_logout(request):
    logout(request)
    return Response({"detail": "Logged out"})


@api_view(["GET"])
@permission_classes([AllowAny])
def me(request):
    if not request.user.is_authenticated:
        return Response({"authenticated": False})
    return Response({
        "authenticated": True,
        "username":    request.user.username,
        "is_staff":    request.user.is_staff,
        "is_superuser": request.user.is_superuser,
    })


# ── ADMIN: USER MANAGEMENT ────────────────────────────────────────────────────


def _serialize_user(u):
    profile = getattr(u, "profile", None)
    return {
        "id":              u.id,
        "username":        u.username,
        "email":           u.email,
        "is_staff":        u.is_staff,
        "is_superuser":    u.is_superuser,
        "is_active":       u.is_active,
        "date_joined":     u.date_joined.isoformat(),
        "approval_status": profile.approval_status if profile else "approved",
    }


@api_view(["GET"])
@permission_classes([IsAdminUser])
def admin_list_users(request):
    users = User.objects.all().order_by("-date_joined")
    return Response({"users": [_serialize_user(u) for u in users]})


@api_view(["POST"])
@permission_classes([IsAdminUser])
def admin_create_user(request):
    username = request.data.get("username", "").strip()
    password = request.data.get("password", "")
    email    = request.data.get("email", "").strip()
    is_staff = request.data.get("is_staff", False)

    if not username or not password:
        return Response({"detail": "Username and password required"}, status=400)
    if User.objects.filter(username=username).exists():
        return Response({"detail": "Username already exists"}, status=400)

    user = User.objects.create_user(
        username=username, password=password, email=email, is_staff=is_staff
    )
    logger.info("USER_CREATED by=%s target=%s is_staff=%s", request.user.username, user.username, is_staff)
    return Response(_serialize_user(user), status=201)


@api_view(["PUT"])
@permission_classes([IsAdminUser])
def admin_update_user(request, user_id):
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found"}, status=404)

    if "email"     in request.data: user.email     = request.data["email"]
    if "is_staff"  in request.data: user.is_staff  = request.data["is_staff"]
    if "is_active" in request.data: user.is_active = request.data["is_active"]
    if "password"  in request.data and request.data["password"]:
        user.set_password(request.data["password"])

    user.save()
    logger.info("USER_UPDATED by=%s target=%s", request.user.username, user.username)
    return Response(_serialize_user(user))


@api_view(["DELETE"])
@permission_classes([IsAdminUser])
def admin_delete_user(request, user_id):
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found"}, status=404)

    if user.id == request.user.id:
        return Response({"detail": "Cannot delete yourself"}, status=400)

    logger.info("USER_DELETED by=%s target=%s", request.user.username, user.username)
    user.delete()
    return Response({"detail": "User deleted"})


@api_view(["GET"])
@permission_classes([IsAdminUser])
def admin_stats(request):
    return Response({
        "total_users":   User.objects.count(),
        "active_users":  User.objects.filter(is_active=True).count(),
        "staff_users":   User.objects.filter(is_staff=True).count(),
        "total_records": TradeRecord.objects.count(),
        "pending_users": UserProfile.objects.filter(approval_status=UserProfile.PENDING).count(),
    })


@api_view(["POST"])
@permission_classes([IsAdminUser])
def admin_import_excel(request):
    """Upload and import an Excel file. Replaces all existing trade data atomically."""
    import openpyxl

    file = request.FILES.get("file")
    if not file:
        return Response({"detail": "No file uploaded."}, status=400)
    if not file.name.endswith((".xlsx", ".xls")):
        return Response({"detail": "File must be .xlsx or .xls."}, status=400)

    suffix = ".xlsx" if file.name.endswith(".xlsx") else ".xls"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        for chunk in file.chunks():
            tmp.write(chunk)
        tmp_path = tmp.name

    try:
        wb = openpyxl.load_workbook(tmp_path, read_only=True, data_only=True)
        ws = wb.active

        records = []
        skipped = 0

        for row in ws.iter_rows(min_row=2, values_only=True):
            if len(row) < 14:
                skipped += 1
                continue

            year = row[0]
            if not year:
                skipped += 1
                continue

            hs2             = str(row[1] or "").strip()
            hs2_desc        = str(row[2] or "").strip()
            hs4             = str(row[3] or "").strip() if row[3] else ""
            hs4_desc        = str(row[4] or "").strip() if row[4] else ""
            sector          = str(row[5] or "").strip()
            brochure2       = str(row[6] or "").strip()
            macrosector     = str(row[7] or "").strip()
            hs2_sector_desc = str(row[8] or "").strip()
            keyword         = str(row[9] or "").strip()

            if hs4:
                italy_val   = row[12] or 0
                india_val   = row[13] or 0
                description = hs4_desc or hs2_desc
            else:
                italy_val   = row[10] or 0
                india_val   = row[11] or 0
                description = hs2_desc or hs2_sector_desc

            records.append(TradeRecord(
                year=int(year),
                hs2=hs2,
                hs4=hs4,
                description=description,
                hs2_description=hs2_desc,
                sector=sector,
                brochure2=brochure2,
                macrosector=macrosector,
                keyword=keyword,
                italy_to_india_value=Decimal(str(italy_val)),
                india_to_italy_value=Decimal(str(india_val)),
            ))

        wb.close()

        with transaction.atomic():
            deleted, _ = TradeRecord.objects.all().delete()
            TradeRecord.objects.bulk_create(records, batch_size=500)

        logger.info(
            "DATA_IMPORT by=%s imported=%d deleted=%d skipped=%d file=%s",
            request.user.username, len(records), deleted, skipped, file.name,
        )

        return Response({
            "detail":   "Import successful.",
            "imported": len(records),
            "deleted":  deleted,
            "skipped":  skipped,
        })

    except Exception:
        logger.exception("Excel import failed (uploaded by %s)", request.user.username)
        return Response({"detail": "Import failed. Check server logs."}, status=500)
    finally:
        os.unlink(tmp_path)


# ── SIGNUP / EMAIL OTP ────────────────────────────────────────────────────────


@api_view(["POST"])
@permission_classes([AllowAny])
def request_otp(request):
    email = request.data.get("email", "").strip().lower()
    if not email or "@" not in email or len(email) > 254:
        return Response({"detail": "Valid email required."}, status=400)
    if User.objects.filter(email=email).exists():
        return Response({"detail": "An account with this email already exists."}, status=400)

    EmailOTP.objects.filter(email=email, is_used=False).delete()
    otp = f"{random.randint(0, 999999):06d}"
    EmailOTP.objects.create(email=email, otp=otp)

    try:
        _send_email(
            subject="Your IICCI verification code",
            message=f"Your one-time code is: {otp}\n\nThis code expires in 10 minutes.\nDo not share it with anyone.",
            recipient_list=[email],
            fail_silently=False,
        )
    except Exception:
        logger.exception("Failed to send OTP to %s", email)
        return Response({"detail": "Failed to send email. Try again later."}, status=500)

    return Response({"detail": "OTP sent to your email."})


@api_view(["POST"])
@permission_classes([AllowAny])
def verify_otp(request):
    email = request.data.get("email", "").strip().lower()
    otp = request.data.get("otp", "").strip()

    if not email or not otp:
        return Response({"detail": "Email and OTP required."}, status=400)

    record = EmailOTP.objects.filter(email=email, otp=otp, is_used=False).order_by("-created_at").first()
    if not record:
        return Response({"detail": "Invalid OTP."}, status=400)
    if record.is_expired():
        return Response({"detail": "OTP expired. Request a new one."}, status=400)

    record.is_used = True
    record.save()
    request.session["verified_email"] = email

    return Response({"detail": "Email verified."})


@api_view(["POST"])
@permission_classes([AllowAny])
def signup(request):
    email = request.session.get("verified_email")
    if not email:
        return Response({"detail": "Email not verified. Complete OTP step first."}, status=400)

    username = request.data.get("username", "").strip()
    password = request.data.get("password", "")

    if not username or len(username) > 150:
        return Response({"detail": "Valid username required."}, status=400)
    if len(password) < 8:
        return Response({"detail": "Password must be at least 8 characters."}, status=400)
    if User.objects.filter(username=username).exists():
        return Response({"detail": "Username already taken."}, status=400)
    if User.objects.filter(email=email).exists():
        return Response({"detail": "An account with this email already exists."}, status=400)

    user = User.objects.create_user(username=username, password=password, email=email, is_active=True)
    UserProfile.objects.create(user=user, approval_status=UserProfile.PENDING)
    del request.session["verified_email"]

    logger.info("SIGNUP_REQUEST user=%s email=%s", username, email)

    admin_emails = list(User.objects.filter(is_staff=True).exclude(email="").values_list("email", flat=True))
    if admin_emails:
        try:
            _send_email(
                subject=f"New signup request: {username}",
                message=f"User '{username}' ({email}) has requested access.\n\nLog in to approve or reject: https://iicci.up.railway.app/admin",
                recipient_list=admin_emails,
                fail_silently=True,
            )
        except Exception:
            pass

    return Response({"detail": "Account created. Awaiting admin approval."}, status=201)


# ── ADMIN: APPROVE / REJECT ───────────────────────────────────────────────────


@api_view(["POST"])
@permission_classes([IsAdminUser])
def approve_user(request, user_id):
    try:
        u = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found."}, status=404)

    profile, _ = UserProfile.objects.get_or_create(user=u)
    profile.approval_status = UserProfile.APPROVED
    profile.save()
    u.is_active = True
    u.save()
    logger.info("USER_APPROVED by=%s target=%s", request.user.username, u.username)

    if u.email:
        try:
            _send_email(
                subject="Your IICCI account has been approved",
                message=f"Hi {u.username},\n\nYour account has been approved. You can now log in at https://iicci.up.railway.app/login",
                recipient_list=[u.email],
                fail_silently=True,
            )
        except Exception:
            pass

    return Response(_serialize_user(u))


@api_view(["POST"])
@permission_classes([IsAdminUser])
def reject_user(request, user_id):
    try:
        u = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found."}, status=404)

    profile, _ = UserProfile.objects.get_or_create(user=u)
    profile.approval_status = UserProfile.REJECTED
    profile.save()
    u.is_active = False
    u.save()
    logger.info("USER_REJECTED by=%s target=%s", request.user.username, u.username)

    if u.email:
        try:
            _send_email(
                subject="Your IICCI account request",
                message=f"Hi {u.username},\n\nUnfortunately your account request has not been approved at this time.",
                recipient_list=[u.email],
                fail_silently=True,
            )
        except Exception:
            pass

    return Response(_serialize_user(u))

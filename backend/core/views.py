import logging
import tempfile
import os
from decimal import Decimal

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

from .models import TradeRecord

logger = logging.getLogger("core")


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
    return {
        "id":           u.id,
        "username":     u.username,
        "email":        u.email,
        "is_staff":     u.is_staff,
        "is_superuser": u.is_superuser,
        "is_active":    u.is_active,
        "date_joined":  u.date_joined.isoformat(),
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

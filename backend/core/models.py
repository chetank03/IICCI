from django.db import models
from django.utils import timezone


class TradeRecord(models.Model):
    year = models.IntegerField()
    quarter = models.CharField(max_length=2, blank=True, default="")

    hs2 = models.CharField(max_length=10)
    hs4 = models.CharField(max_length=10, blank=True, default="")

    description = models.TextField()
    hs2_description = models.TextField(blank=True, default="")
    sector = models.CharField(max_length=255, blank=True, default="")   # IICCI Brochure 1
    brochure2 = models.CharField(max_length=255, blank=True, default="")  # IICCI Brochure 2
    keyword = models.CharField(max_length=255, blank=True, default="")   # IICCI Subsector (HS4) description
    macrosector = models.CharField(max_length=500, blank=True, default="")  # Macrosector (col H)
    hs2_sector_desc = models.TextField(blank=True, default="")  # IICCI Sector (HS2) description (col I)

    # NULL means the source workbook left the cell blank (no data reported).
    # This is distinct from a reported value of 0.
    italy_to_india_value = models.DecimalField(
        max_digits=20, decimal_places=6, null=True, blank=True, default=None
    )
    india_to_italy_value = models.DecimalField(
        max_digits=20, decimal_places=6, null=True, blank=True, default=None
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            # Single-column indexes for filter dropdowns and standalone filters
            models.Index(fields=["year"]),
            models.Index(fields=["hs2"]),
            models.Index(fields=["hs4"]),
            models.Index(fields=["sector"]),
            models.Index(fields=["brochure2"]),
            models.Index(fields=["keyword"]),
            models.Index(fields=["macrosector"]),
            # Composite indexes for the most common query shapes
            models.Index(fields=["hs4", "year"]),        # stats views: filter(hs4="", year=...)
            models.Index(fields=["hs4", "sector"]),      # sector_wise: filter(hs4="").exclude(sector="")
            models.Index(fields=["year", "hs2", "hs4"]), # trade_table ordering with year filter
        ]

    def __str__(self):
        code = self.hs4 or self.hs2
        return f"{self.year} - {code}"


class UserProfile(models.Model):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    STATUS_CHOICES = [
        (PENDING, "Pending"),
        (APPROVED, "Approved"),
        (REJECTED, "Rejected"),
    ]
    user = models.OneToOneField(
        "auth.User", on_delete=models.CASCADE, related_name="profile"
    )
    approval_status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default=PENDING
    )

    def __str__(self):
        return f"{self.user.username} ({self.approval_status})"

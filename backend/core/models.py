from django.db import models


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

    italy_to_india_value = models.DecimalField(
        max_digits=20, decimal_places=2, default=0
    )
    india_to_italy_value = models.DecimalField(
        max_digits=20, decimal_places=2, default=0
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

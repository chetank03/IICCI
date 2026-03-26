"""
Import trade data from the IICCI Excel file into TradeRecord.

Column mapping (0-indexed):
  0  A  CY (year)
  1  B  HS Code 2
  2  C  HS Code 2 Description
  3  D  HS Code 4
  4  E  HS Code 4 Description
  5  F  IICCI brochure 1  (sector)
  6  G  IICCI brochure 2
  7  H  Macrosector
  8  I  IICCI Sector (HS2) description
  9  J  IICCI Subsector (HS4) description  (keyword)
 10  K  Imports from Italy (HS2)
 11  L  Imports from India (HS2)
 12  M  Imports from Italy (HS4)
 13  N  Imports from India (HS4)
"""

from decimal import Decimal
from django.core.management.base import BaseCommand
from core.models import TradeRecord
import openpyxl


class Command(BaseCommand):
    help = "Import trade data from Excel file"

    def add_arguments(self, parser):
        parser.add_argument(
            "file",
            nargs="?",
            default="260311_HS Codes_IMPEX_Stats (1).xlsx",
            help="Path to the Excel file",
        )

    def handle(self, *args, **options):
        path = options["file"]
        self.stdout.write(f"Loading {path}...")

        wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
        ws = wb.active

        records = []
        skipped = 0

        for i, row in enumerate(ws.iter_rows(min_row=2, values_only=True)):
            year = row[0]
            if not year:
                skipped += 1
                continue

            hs2             = str(row[1] or "").strip()
            hs2_desc        = str(row[2] or "").strip()
            hs4             = str(row[3] or "").strip() if row[3] else ""
            hs4_desc        = str(row[4] or "").strip() if row[4] else ""
            sector          = str(row[5] or "").strip()   # IICCI Brochure 1
            brochure2       = str(row[6] or "").strip()   # IICCI Brochure 2
            macrosector     = str(row[7] or "").strip()   # Macrosector
            hs2_sector_desc = str(row[8] or "").strip()   # IICCI Sector (HS2) description
            keyword         = str(row[9] or "").strip()   # IICCI Subsector (HS4) description

            if hs4:
                italy_val   = row[12] or 0   # Imports from Italy (HS4)
                india_val   = row[13] or 0   # Imports from India (HS4)
                description = hs4_desc or hs2_desc
            else:
                italy_val   = row[10] or 0   # Imports from Italy (HS2)
                india_val   = row[11] or 0   # Imports from India (HS2)
                description = hs2_desc or hs2_sector_desc

            records.append(
                TradeRecord(
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
                )
            )

        wb.close()

        # Clear old data and bulk insert
        deleted, _ = TradeRecord.objects.all().delete()
        if deleted:
            self.stdout.write(f"Deleted {deleted} existing records")

        TradeRecord.objects.bulk_create(records, batch_size=500)
        self.stdout.write(
            self.style.SUCCESS(
                f"Imported {len(records)} records ({skipped} rows skipped)"
            )
        )

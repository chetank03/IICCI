"""Import trade data from the IICCI Excel file into TradeRecord.

The workbook layout and all row parsing live in `core.tradeformat`, shared with
the admin upload endpoint and the exporters.
"""

from django.core.management.base import BaseCommand
from core.models import TradeRecord
from core.tradeformat import parse_row
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

        for row in ws.iter_rows(min_row=2, values_only=True):
            fields = parse_row(row)
            if fields is None:
                skipped += 1
                continue
            records.append(TradeRecord(**fields))

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

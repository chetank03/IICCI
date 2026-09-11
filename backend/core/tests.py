"""Tests for the trade analytics API.

Run with:
    python manage.py test --settings=backend.settings_test

The suite targets the things that would silently produce wrong numbers rather than
obvious breakage: the hs4 convention that separates aggregate rows from product rows,
the country filter, cache keying, pagination bounds, and admin authorisation.
"""

import io
from decimal import Decimal

from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase
import openpyxl
from rest_framework.test import APIClient

from .models import TradeRecord
from .tradeformat import EXPORT_FIELDS, SOURCE_HEADERS, build_row, parse_row

ITALY_IMPORTS_FROM_INDIA = "italy_imports_from_india"
INDIA_IMPORTS_FROM_ITALY = "india_imports_from_italy"


def record(**kwargs):
    """A TradeRecord with defaults, so each test states only what it cares about."""
    defaults = dict(
        year=2024,
        hs2="72",
        hs4="",
        description="Iron and steel",
        sector="Metals",
        keyword="steel",
        macrosector="Industrial",
        italy_to_india_value=Decimal("100"),
        india_to_italy_value=Decimal("40"),
    )
    defaults.update(kwargs)
    return TradeRecord.objects.create(**defaults)


class StatsAggregationTests(TestCase):
    """The hs4 convention is the load bearing rule in this dataset.

    Rows with hs4="" are HS2 level aggregates. Rows with a non-empty hs4 are the product
    level breakdown of those same values. Summary, yearwise and sector endpoints must use
    only the aggregate rows, or every total double counts.
    """

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        record(year=2023, hs2="72", hs4="", italy_to_india_value=100, india_to_italy_value=40)
        record(year=2024, hs2="72", hs4="", italy_to_india_value=200, india_to_italy_value=60)
        record(year=2024, hs2="84", hs4="", sector="Machinery",
               italy_to_india_value=300, india_to_italy_value=10)
        # Product level rows. These must NOT be counted by the summary.
        record(year=2024, hs2="72", hs4="7208", description="Flat rolled",
               italy_to_india_value=150, india_to_italy_value=50)
        record(year=2024, hs2="84", hs4="8407", description="Engines",
               italy_to_india_value=250, india_to_italy_value=5)

    def test_summary_counts_only_aggregate_rows(self):
        r = self.client.get("/api/stats/summary/").json()
        # 100+200+300 aggregate only; the 150 and 250 product rows are excluded.
        self.assertEqual(r["india_imports_from_italy"], 600.0)
        self.assertEqual(r["italy_imports_from_india"], 110.0)
        self.assertEqual(r["bilateral_trade_value"], 710.0)

    def test_year_filter_narrows_the_summary(self):
        r = self.client.get("/api/stats/summary/", {"year": 2023}).json()
        self.assertEqual(r["india_imports_from_italy"], 100.0)
        self.assertEqual(r["italy_imports_from_india"], 40.0)

    def test_country_filter_zeroes_the_opposite_direction(self):
        r = self.client.get("/api/stats/summary/", {"country": ITALY_IMPORTS_FROM_INDIA}).json()
        self.assertEqual(r["india_imports_from_italy"], 0.0)
        self.assertGreater(r["italy_imports_from_india"], 0.0)

        r = self.client.get("/api/stats/summary/", {"country": INDIA_IMPORTS_FROM_ITALY}).json()
        self.assertGreater(r["india_imports_from_italy"], 0.0)
        self.assertEqual(r["italy_imports_from_india"], 0.0)

    def test_yearwise_is_grouped_and_ordered_by_year(self):
        rows = self.client.get("/api/stats/yearwise/").json()["rows"]
        self.assertEqual([r["year"] for r in rows], [2023, 2024])
        self.assertEqual(rows[0]["italy_to_india"], 100.0)
        self.assertEqual(rows[1]["italy_to_india"], 500.0)  # 200 + 300

    def test_sector_wise_excludes_blank_sectors_and_sorts_desc(self):
        record(year=2024, hs2="99", hs4="", sector="", italy_to_india_value=999)
        rows = self.client.get("/api/stats/sector-wise/").json()["rows"]
        self.assertNotIn("", [r["sector"] for r in rows])
        values = [r["italy_to_india"] for r in rows]
        self.assertEqual(values, sorted(values, reverse=True))

    def test_top_products_uses_only_product_rows(self):
        rows = self.client.get("/api/stats/top-products/").json()["rows"]
        codes = [r["hs4"] for r in rows]
        self.assertNotIn("", codes)
        self.assertCountEqual(codes, ["7208", "8407"])
        # Highest combined total first: 8407 is 255, 7208 is 200.
        self.assertEqual(rows[0]["hs4"], "8407")

    def test_top_products_is_capped_at_ten(self):
        for i in range(15):
            record(hs4=f"90{i:02d}", italy_to_india_value=1000 + i)
        rows = self.client.get("/api/stats/top-products/").json()["rows"]
        self.assertEqual(len(rows), 10)


class SearchAndFilterTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        record(hs2="72", hs4="", description="Stainless steel sheets", sector="Metals")
        record(hs2="84", hs4="", description="Textile machinery", sector="Machinery",
               keyword="looms", macrosector="Industrial")

    def test_search_matches_description_case_insensitively(self):
        r = self.client.get("/api/trade/table/", {"search": "STAINLESS"}).json()
        self.assertEqual(r["total"], 1)
        self.assertIn("Stainless", r["items"][0]["description"])

    def test_search_also_matches_sector_and_keyword(self):
        self.assertEqual(self.client.get("/api/trade/table/", {"search": "Machinery"}).json()["total"], 1)
        self.assertEqual(self.client.get("/api/trade/table/", {"search": "looms"}).json()["total"], 1)

    def test_unknown_search_returns_empty_not_everything(self):
        """A filter matching nothing must narrow to zero, never fall back to all rows."""
        self.assertEqual(self.client.get("/api/trade/table/", {"search": "zzzznope"}).json()["total"], 0)

    def test_filter_options_returns_lists(self):
        r = self.client.get("/api/stats/filters/").json()
        self.assertIsInstance(r, dict)
        self.assertTrue(any(isinstance(v, list) for v in r.values()))


class TradeTablePaginationTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        for i in range(30):
            record(hs2=f"{i:02d}", hs4="", description=f"row {i}")

    def test_default_page_size_is_25(self):
        r = self.client.get("/api/trade/table/").json()
        self.assertEqual(r["total"], 30)
        self.assertEqual(len(r["items"]), 25)
        self.assertEqual(r["page"], 1)

    def test_second_page_returns_the_remainder(self):
        r = self.client.get("/api/trade/table/", {"page": 2}).json()
        self.assertEqual(len(r["items"]), 5)

    def test_garbage_pagination_falls_back_instead_of_erroring(self):
        for params in ({"page": "abc"}, {"page": -5}, {"page_size": "xyz"}):
            r = self.client.get("/api/trade/table/", params)
            self.assertEqual(r.status_code, 200, params)
            self.assertGreaterEqual(r.json()["page"], 1)

    def test_page_size_is_capped(self):
        """An unbounded page_size is a free way to make the server serialize everything."""
        r = self.client.get("/api/trade/table/", {"page_size": 100000}).json()
        self.assertLess(r["page_size"], 100000)


class DashboardCacheTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        record(year=2024, hs4="", italy_to_india_value=100)

    def test_repeat_request_is_served_from_cache(self):
        first = self.client.get("/api/stats/dashboard/").json()
        # Change the data underneath. A cached response should not notice within the TTL.
        record(year=2024, hs4="", italy_to_india_value=500)
        second = self.client.get("/api/stats/dashboard/").json()
        self.assertEqual(first, second)

    def test_different_filters_do_not_share_a_cache_entry(self):
        """Cache keys are hashed from query params. If they collided, one user's filtered
        dashboard would be served to another."""
        a = self.client.get("/api/stats/dashboard/", {"year": 2024}).json()
        b = self.client.get("/api/stats/dashboard/", {"year": 1999}).json()
        self.assertNotEqual(a, b)


class AdminAuthorizationTests(TestCase):
    """Every admin endpoint must reject anonymous and non-staff callers."""

    ADMIN_PATHS = ["/api/admin/stats/", "/api/admin/users/"]

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.staff = User.objects.create_user("boss", password="pw", is_staff=True)
        self.plain = User.objects.create_user("worker", password="pw")

    def test_anonymous_is_rejected(self):
        for path in self.ADMIN_PATHS:
            self.assertIn(self.client.get(path).status_code, (401, 403), path)

    def test_authenticated_non_staff_is_rejected(self):
        self.client.force_authenticate(self.plain)
        for path in self.ADMIN_PATHS:
            self.assertEqual(self.client.get(path).status_code, 403, path)

    def test_staff_is_allowed(self):
        self.client.force_authenticate(self.staff)
        for path in self.ADMIN_PATHS:
            self.assertEqual(self.client.get(path).status_code, 200, path)

    def test_non_staff_cannot_create_users(self):
        self.client.force_authenticate(self.plain)
        before = User.objects.count()
        r = self.client.post("/api/admin/users/create/", {
            "username": "sneaky", "password": "pw", "email": "x@y.z", "is_staff": True,
        })
        self.assertEqual(r.status_code, 403)
        self.assertEqual(User.objects.count(), before)

    def test_non_staff_cannot_delete_users(self):
        self.client.force_authenticate(self.plain)
        r = self.client.delete(f"/api/admin/users/{self.staff.id}/delete/")
        self.assertEqual(r.status_code, 403)
        self.assertTrue(User.objects.filter(id=self.staff.id).exists())


class PublicEndpointTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def test_stats_endpoints_work_on_an_empty_database(self):
        """A fresh deployment has no rows. Nothing should divide by zero or 500."""
        for path in [
            "/api/stats/summary/",
            "/api/stats/yearwise/",
            "/api/stats/sector-wise/",
            "/api/stats/top-products/",
            "/api/stats/dashboard/",
            "/api/trade/table/",
        ]:
            self.assertEqual(self.client.get(path).status_code, 200, path)

    def test_summary_on_empty_database_is_zero_not_null(self):
        r = self.client.get("/api/stats/summary/").json()
        self.assertEqual(r["bilateral_trade_value"], 0.0)


class TradeFormatTests(TestCase):
    """The client maintains their master data in one fixed workbook layout.

    An exported file has to be re-importable without edits, so these tests pin
    the layout and the two rules that are easy to break: blank is not zero, and
    HS codes keep their leading zeros.
    """

    def test_headers_match_the_source_workbook(self):
        self.assertEqual(len(SOURCE_HEADERS), 14)
        self.assertEqual(SOURCE_HEADERS[0], "CY")
        # The trailing space is in the client's own file. Keep it.
        self.assertEqual(SOURCE_HEADERS[7], "Macrosector ")

    def test_numeric_hs_codes_keep_leading_zeros(self):
        """Excel stores "01" as text but "10" as a number.

        Without padding, a numeric 1 imports as "1" and silently splits into a
        second filter value alongside the text "01".
        """
        row = [2024, 1, "01 - Live animals", 101, "0101 - HORSES", "Agri&Food",
               "", "Live animals", "", "", None, None, 5, 7]
        fields = parse_row(row)
        self.assertEqual(fields["hs2"], "01")
        self.assertEqual(fields["hs4"], "0101")

    def test_blank_value_cells_import_as_null_not_zero(self):
        """A blank cell means no figure was reported, which is not a zero."""
        row = [2024, "72", "72 - Iron and steel", "", "", "Metals",
               "", "Base metals", "", "", None, 0, None, None]
        fields = parse_row(row)
        self.assertIsNone(fields["italy_to_india_value"])
        self.assertEqual(fields["india_to_italy_value"], Decimal("0"))

    def test_round_trip_preserves_every_column(self):
        source = [
            2024, "01", "01 - Live animals", "0101", "0101 - HORSES",
            "Agri&Food", "Brochure two", "Live animals; animal products",
            "Live animals", "Live animals - equines",
            None, None, 1.93, 0.0029,
        ]
        record = parse_row(source)
        TradeRecord.objects.create(**record)
        stored = TradeRecord.objects.values(*EXPORT_FIELDS).first()

        exported = build_row(stored)
        self.assertEqual(exported, source)

    def test_hs2_level_rows_export_values_in_the_hs2_columns(self):
        """HS2 rows carry K/L and leave M/N blank. HS4 rows do the reverse."""
        source = [
            2024, "72", "72 - Iron and steel", "", "", "Metals", "",
            "Base metals", "Iron and steel", "", 12.5, 8.25, None, None,
        ]
        record = parse_row(source)
        TradeRecord.objects.create(**record)
        exported = build_row(TradeRecord.objects.values(*EXPORT_FIELDS).first())

        self.assertEqual(exported[10:12], [12.5, 8.25])   # K/L filled
        self.assertEqual(exported[12:14], [None, None])   # M/N blank
        self.assertEqual(exported, source)

    def test_rows_without_a_year_are_skipped(self):
        self.assertIsNone(parse_row([None] * 14))
        self.assertIsNone(parse_row(["", "01"] + [None] * 12))

    def test_short_rows_are_skipped(self):
        self.assertIsNone(parse_row([2024, "01", "desc"]))


class ExportEndpointTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user("exporter", password="pw")
        TradeRecord.objects.create(**parse_row([
            2024, "01", "01 - Live animals", "", "", "Agri&Food", "",
            "Live animals; animal products", "Live animals", "",
            4.5, None, None, None,
        ]))

    def test_exports_require_authentication(self):
        for path in ["/api/trade/export/xlsx/", "/api/trade/export/csv/"]:
            self.assertEqual(self.client.get(path).status_code, 403, path)

    def test_csv_export_uses_the_source_header_row(self):
        self.client.force_authenticate(self.user)
        r = self.client.get("/api/trade/export/csv/")
        self.assertEqual(r.status_code, 200)

        body = r.content.decode("utf-8-sig")
        header = body.splitlines()[0]
        self.assertEqual(header.split(","), SOURCE_HEADERS)

    def test_csv_export_writes_blanks_not_zeros(self):
        self.client.force_authenticate(self.user)
        body = self.client.get("/api/trade/export/csv/").content.decode("utf-8-sig")
        cells = body.splitlines()[1].split(",")

        self.assertEqual(cells[10], "4.5")   # Imports from Italy (HS2)
        self.assertEqual(cells[11], "")      # blank in the source stays blank

    def test_xlsx_export_is_a_workbook_with_the_source_layout(self):
        self.client.force_authenticate(self.user)
        r = self.client.get("/api/trade/export/xlsx/")
        self.assertEqual(r.status_code, 200)

        wb = openpyxl.load_workbook(io.BytesIO(r.content), data_only=True)
        rows = list(wb.active.iter_rows(values_only=True))
        self.assertEqual(list(rows[0]), SOURCE_HEADERS)
        self.assertEqual(rows[1][10], 4.5)
        self.assertIsNone(rows[1][11])

    def test_export_respects_dashboard_filters(self):
        TradeRecord.objects.create(**parse_row([
            2023, "02", "02 - Meat", "", "", "Agri&Food", "", "Meat",
            "Meat", "", 1.0, 1.0, None, None,
        ]))
        self.client.force_authenticate(self.user)
        body = self.client.get("/api/trade/export/csv/?year=2024").content.decode("utf-8-sig")

        data_rows = [line for line in body.splitlines()[1:] if line.strip()]
        self.assertEqual(len(data_rows), 1)
        self.assertTrue(data_rows[0].startswith("2024,"))

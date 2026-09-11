"""Single source of truth for the IICCI trade workbook layout.

The client maintains their master data in one fixed Excel layout. Both the
importer and the exporters go through this module so an uploaded workbook and a
downloaded one are the same shape, column for column.

Column mapping (0-indexed), as it appears in the client's workbook:

   0  A  CY (year)
   1  B  HS Code 2
   2  C  HS Code 2 Description
   3  D  HS Code 4
   4  E  HS Code 4 Description
   5  F  IICCI brochure 1                     -> TradeRecord.sector
   6  G  IICCI brochure 2                     -> TradeRecord.brochure2
   7  H  Macrosector                          -> TradeRecord.macrosector
   8  I  IICCI Sector (HS2) description       -> TradeRecord.hs2_sector_desc
   9  J  IICCI Subsector (HS4) description    -> TradeRecord.keyword
  10  K  Imports from Italy (HS2)
  11  L  Imports from India (HS2)
  12  M  Imports from Italy (HS4)
  13  N  Imports from India (HS4)

Two layout rules the data obeys and the exporters must reproduce:

1. A row is either HS2-level (column D blank) or HS4-level (column D filled).
   HS2-level rows carry their values in K/L and leave M/N blank; HS4-level rows
   do the reverse. No row in the client's master carries both pairs.
2. A blank value cell means "no data reported" and is NOT the same as 0. It is
   stored as NULL and exported as a blank cell.
"""

from decimal import Decimal, InvalidOperation

# Exact header text from the client's workbook. "Macrosector " keeps its
# trailing space on purpose so an exported file matches the source byte for byte.
SOURCE_HEADERS = [
    "CY",
    "HS Code 2",
    "HS Code 2 Description",
    "HS Code 4",
    "HS Code 4 Description",
    "IICCI brochure 1",
    "IICCI brochure 2",
    "Macrosector ",
    "IICCI Sector (HS2) description",
    "IICCI Subsector (HS4) description",
    "Imports from Italy (HS2)",
    "Imports from India (HS2)",
    "Imports from Italy (HS4)",
    "Imports from India (HS4)",
]

# Model fields the exporters need to read, in one place so `.values()` calls and
# the row builder cannot drift apart.
EXPORT_FIELDS = [
    "year",
    "hs2",
    "hs2_description",
    "hs4",
    "description",
    "sector",
    "brochure2",
    "macrosector",
    "hs2_sector_desc",
    "keyword",
    "italy_to_india_value",
    "india_to_italy_value",
]

MIN_SOURCE_COLUMNS = 14


def _text(value):
    """Normalise a cell to trimmed text. Blank and None both become ""."""
    if value is None:
        return ""
    return str(value).strip()


def _code(value, width):
    """Normalise an HS code, restoring leading zeros.

    Excel stores chapter "01" as text but chapter "10" as a number, so the same
    logical code can arrive as either. Without padding, a numeric "01" imports
    as "1" and silently splits into a second, separate filter value.
    """
    text = _text(value)
    if not text:
        return ""
    if text.isdigit() and len(text) < width:
        return text.zfill(width)
    return text


def _value(cell):
    """Convert a value cell to Decimal, preserving blank as None.

    A blank cell means the figure was not reported. Coercing it to 0 would make
    it indistinguishable from a genuine zero and would understate nothing while
    silently inflating the count of "zero trade" rows.
    """
    if cell is None or cell == "":
        return None
    try:
        return Decimal(str(cell))
    except (InvalidOperation, ValueError, TypeError):
        return None


def parse_row(row):
    """Turn one source row into TradeRecord kwargs, or None if unusable.

    Returns a dict ready to splat into TradeRecord(**kwargs).
    """
    if len(row) < MIN_SOURCE_COLUMNS:
        return None

    year = row[0]
    if year in (None, ""):
        return None
    try:
        year = int(year)
    except (ValueError, TypeError):
        return None

    hs2 = _code(row[1], 2)
    hs2_desc = _text(row[2])
    hs4 = _code(row[3], 4)
    hs4_desc = _text(row[4])
    hs2_sector_desc = _text(row[8])

    if hs4:
        italy_val = _value(row[12])
        india_val = _value(row[13])
        description = hs4_desc or hs2_desc
    else:
        italy_val = _value(row[10])
        india_val = _value(row[11])
        description = hs2_desc or hs2_sector_desc

    return {
        "year": year,
        "hs2": hs2,
        "hs4": hs4,
        "description": description,
        "hs2_description": hs2_desc,
        "sector": _text(row[5]),
        "brochure2": _text(row[6]),
        "macrosector": _text(row[7]),
        "hs2_sector_desc": hs2_sector_desc,
        "keyword": _text(row[9]),
        "italy_to_india_value": italy_val,
        "india_to_italy_value": india_val,
    }


def _number(value):
    """Render a stored Decimal for export, dropping trailing zeros.

    The source workbook holds plain numbers (0, 1.93, 0.0029), not fixed-width
    decimals, so 1.930000 has to go back out as 1.93.
    """
    if value is None:
        return None
    dec = Decimal(str(value))
    dec = dec.quantize(Decimal(1)) if dec == dec.to_integral_value() else dec.normalize()
    return float(dec)


def build_row(record):
    """Turn one record (a dict from `.values()`) into a source-layout row.

    Values land in the HS2 or HS4 column pair according to the row's own level,
    exactly as in the client's master. The unused pair stays blank.
    """
    hs4 = record.get("hs4") or ""
    italy = _number(record.get("italy_to_india_value"))
    india = _number(record.get("india_to_italy_value"))

    if hs4:
        hs4_desc = record.get("description") or ""
        hs2_values = (None, None)
        hs4_values = (italy, india)
    else:
        hs4_desc = ""
        hs2_values = (italy, india)
        hs4_values = (None, None)

    return [
        record.get("year"),
        record.get("hs2") or "",
        record.get("hs2_description") or "",
        hs4,
        hs4_desc,
        record.get("sector") or "",
        record.get("brochure2") or "",
        record.get("macrosector") or "",
        record.get("hs2_sector_desc") or "",
        record.get("keyword") or "",
        hs2_values[0],
        hs2_values[1],
        hs4_values[0],
        hs4_values[1],
    ]

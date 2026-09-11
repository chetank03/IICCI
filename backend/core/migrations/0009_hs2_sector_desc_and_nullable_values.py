from django.db import migrations, models


class Migration(migrations.Migration):
    """Round-trip support for the IICCI source workbook.

    Adds `hs2_sector_desc` (column I, "IICCI Sector (HS2) description"), which
    was previously read by the importer and discarded.

    Makes the two value fields nullable so a blank cell in the source workbook
    survives as NULL ("no data reported") instead of being coerced to 0.
    Existing rows keep whatever value they already hold: rows imported before
    this migration cannot be told apart from genuine zeros, so a re-import of
    the source workbook is required to restore blanks.

    Precision widens to 6 decimal places to preserve source values such as
    0.0029 without rounding.
    """

    dependencies = [
        ("core", "0008_delete_emailotp"),
    ]

    operations = [
        migrations.AddField(
            model_name="traderecord",
            name="hs2_sector_desc",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AlterField(
            model_name="traderecord",
            name="italy_to_india_value",
            field=models.DecimalField(
                blank=True, decimal_places=6, default=None, max_digits=20, null=True
            ),
        ),
        migrations.AlterField(
            model_name="traderecord",
            name="india_to_italy_value",
            field=models.DecimalField(
                blank=True, decimal_places=6, default=None, max_digits=20, null=True
            ),
        ),
    ]

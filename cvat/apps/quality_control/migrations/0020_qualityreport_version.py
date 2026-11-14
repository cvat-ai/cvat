from datetime import datetime, timezone

from django.db import migrations, models
from django.utils import timezone as django_timezone

# QualityReport.data format versions at the time of the migration
LEGACY_VERSION = "1.0"
GENERALIZED_VERSION = "2.0"
VERSION_CHOICES = [(LEGACY_VERSION, "Legacy"), (GENERALIZED_VERSION, "Generalized")]

# The first release with the generalized format, v2.74.0 (the tagged commit date).
# Instances running development builds could get the format earlier, with the 0012 migration.
GENERALIZED_FORMAT_RELEASE_DATE = datetime(2026, 8, 26, 17, 48, 32, tzinfo=timezone.utc)

# QualityReport.data is a JSON object serialized into a JSON string. Its text representation
# can contain escaped or unescaped quotes around the object keys.
GENERALIZED_REPORT_DATA_REGEX = r'\\?"groups\\?"\s*:'


def _get_0012_migration_date(schema_editor) -> datetime:
    with schema_editor.connection.cursor() as cursor:
        cursor.execute(
            """\
            SELECT applied
            FROM django_migrations
            WHERE app = %s AND name = %s
            """,
            ["quality_control", "0012_qualityrequirement_and_more"],
        )
        migration_date = cursor.fetchone()[0]

    # With USE_TZ, the dates are stored in UTC. The DB backends without time zone support
    # (SQLite) return them as naive values from raw queries.
    if django_timezone.is_naive(migration_date):
        migration_date = django_timezone.make_aware(migration_date, timezone.utc)

    return migration_date


def init_report_versions(apps, schema_editor):
    # The reports created before both the release and the 0012 migration are legacy,
    # they keep the version set by AddField.
    # The reports created after the 0012 migration are generalized.
    # The reports in between are checked by the contents: 0012 could have been unapplied
    # and applied again, and only the last application date is recorded.
    migration_date = _get_0012_migration_date(schema_editor)

    QualityReport = apps.get_model("quality_control", "QualityReport")
    QualityReport.objects.filter(
        created_date__gte=min(GENERALIZED_FORMAT_RELEASE_DATE, migration_date)
    ).update(
        version=models.Case(
            models.When(
                created_date__gte=migration_date,
                then=models.Value(GENERALIZED_VERSION),
            ),
            models.When(
                data__regex=GENERALIZED_REPORT_DATA_REGEX,
                then=models.Value(GENERALIZED_VERSION),
            ),
            default=models.Value(LEGACY_VERSION),
        )
    )


class Migration(migrations.Migration):

    dependencies = [
        ("quality_control", "0019_annotationconflict_requirements"),
    ]

    operations = [
        migrations.AddField(
            model_name="qualityreport",
            name="version",
            field=models.CharField(max_length=32, choices=VERSION_CHOICES, default=LEGACY_VERSION),
            preserve_default=False,
        ),
        migrations.RunPython(init_report_versions, reverse_code=migrations.RunPython.noop),
        migrations.AlterField(
            model_name="qualityreport",
            name="version",
            field=models.CharField(
                max_length=32, choices=VERSION_CHOICES, default=GENERALIZED_VERSION
            ),
        ),
    ]

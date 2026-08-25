# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.core.management.base import CommandError
from django.db import migrations

OLD_APP_LABEL = "auth"
NEW_APP_LABEL = "iam"

CONFLICTING_USER_CONTENT_TYPE_ERROR = """\
Cannot re-label the user content type: the "{db_table}" table holds both
"{old_label}|user" (id={old_id}) and "{new_label}|user" (id={new_id}) rows.
Only one of them may exist. The migration stopped without changing anything.

This is likely because this migration was applied previously and then was rolled back:

- upgrade:
   The "{new_label}|user" row is created or re-labelled from the old "{old_label}|user" in place.

- downgrade:
   The row is re-labelled back to "{old_label}|user". Django ContentTypes' post_migrate
   handler automatically creates a new "{new_label}|user" row after all migrations,
   because "{new_label}.User" is still an installed model after the migration.

- upgrade (the current call):
   Both rows now exist and conflict between each other.

This migration deliberately does not merge or delete the duplicate for you. Anything
created while "{new_label}|user" existed - permission grants, admin log entries, or any row
with a ForeignKey to ContentType or a GenericForeignKey - still points at id={new_id},
and only you can decide which of those records should survive.

To continue:

1. Re-point everything that references the "{new_label}|user" (id={new_id}) content type at
   "{old_label}|user" (id={old_id}).
2. Delete the "{new_label}|user" row once nothing references it. This can be done manually or
   via the "django manage.py remove_stale_contenttypes" command after switching to the previous
   version of the repository.
3. Re-run this migration.
"""


def move_user_content_type(apps, schema_editor):
    ContentType = apps.get_model("contenttypes", "ContentType")
    rows = ContentType.objects.filter(model="user")

    old_content_type_row = rows.filter(app_label=OLD_APP_LABEL).first()
    if not old_content_type_row:
        # Fresh installation - auth.User is swapped out, so auth|user is never created and
        # there is nothing to migrate.
        return

    new_content_type_row = rows.filter(app_label=NEW_APP_LABEL).first()
    if new_content_type_row:
        raise CommandError(
            CONFLICTING_USER_CONTENT_TYPE_ERROR.format(
                db_table=ContentType._meta.db_table,
                old_label=OLD_APP_LABEL,
                new_label=NEW_APP_LABEL,
                old_id=old_content_type_row.pk,
                new_id=new_content_type_row.pk,
            )
        )

    rows.filter(pk=old_content_type_row.pk).update(app_label=NEW_APP_LABEL)
    ContentType.objects.clear_cache()


def restore_user_content_type(apps, schema_editor):
    ContentType = apps.get_model("contenttypes", "ContentType")

    ContentType.objects.filter(app_label=NEW_APP_LABEL, model="user").update(
        app_label=OLD_APP_LABEL
    )
    ContentType.objects.clear_cache()


class Migration(migrations.Migration):

    dependencies = [
        ("iam", "0002_delete_dummy_email_addresses_and_fix_case_related_mismatches"),
        ("contenttypes", "0002_remove_content_type_name"),
    ]

    operations = [
        migrations.RunPython(
            move_user_content_type,
            reverse_code=restore_user_content_type,
        ),
    ]

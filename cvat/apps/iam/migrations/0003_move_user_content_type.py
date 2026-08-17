# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.core.management.base import CommandError
from django.db import migrations

OLD_APP_LABEL = "auth"
NEW_APP_LABEL = "iam"

STALE_USER_CONTENT_TYPE_ERROR = """\
Cannot re-label the user content type: django_content_type table holds both
"{old_label}|user" (id={old_id}) and "{new_label}|user" (id={new_id}). Only one of them may exist,
so this migration stopped without changing anything.

Why both exist - an upgrade -> downgrade -> upgrade sequence:

  upgrade    "{old_label}|user" is re-labelled to "{new_label}|user" in place, so the row id - and
             every auth_permission row and GenericForeignKey pointing at it - stays valid.
  downgrade  the row is re-labelled back to "{old_label}|user". post_migrate then re-creates
             "{new_label}|user" as a brand-new row, because iam.User is still an installed
             model. It gets a fresh id and a fresh set of permissions.
  upgrade    both rows now exist, so re-labelling "{old_label}|user" would violate the
             (app_label, model) unique constraint.

This migration deliberately does not merge or delete the duplicate for you. Anything
created while "{new_label}|user" existed - permission grants, admin log entries, or any row
with a ForeignKey to ContentType or a GenericForeignKey - still points at id={new_id},
and only you can decide which of those records should survive.

To continue:

  1. Re-point everything that references content type id={new_id} at id={old_id}.
  2. Delete the "{new_label}|user" row once nothing references it.
  3. Re-run this migration.
"""


def move_user_content_type(apps, schema_editor):
    ContentType = apps.get_model("contenttypes", "ContentType")
    rows = ContentType.objects.filter(model="user")

    old_content_type_row = rows.filter(app_label=OLD_APP_LABEL).first()
    if not old_content_type_row:
        # Fresh installation - auth.User is swapped out, so auth|user is never created and
        # there is nothing to move. Any iam|user row here is the real one (post_migrate
        # created it and auth_permission points at it), so it must not be deleted.
        return

    contenttype_post_migration_created_row = rows.filter(app_label=NEW_APP_LABEL).first()
    if contenttype_post_migration_created_row:
        raise CommandError(
            STALE_USER_CONTENT_TYPE_ERROR.format(
                old_label=OLD_APP_LABEL,
                new_label=NEW_APP_LABEL,
                old_id=old_content_type_row.pk,
                new_id=contenttype_post_migration_created_row.pk,
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

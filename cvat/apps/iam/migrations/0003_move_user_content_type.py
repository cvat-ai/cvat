# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db import migrations

OLD_APP_LABEL = "auth"
NEW_APP_LABEL = "iam"


def move_user_content_type(apps, schema_editor):
    """Re-label auth|user in place so permission and GFK row ids stay valid.

    On a fresh DB this is a no-op (post_migrate creates iam|user later).
    Swapped-out auth.User is excluded from get_models(), so auth|user is never recreated.
    """
    ContentType = apps.get_model("contenttypes", "ContentType")
    rows = ContentType.objects.using(schema_editor.connection.alias)

    old = rows.filter(app_label=OLD_APP_LABEL, model="user").first()
    if old is None:
        # Nothing to promote, so any iam|user present is the real row - the one every
        # auth_permission points at. Deleting it here would cascade away every grant.
        return

    stale = rows.filter(app_label=NEW_APP_LABEL, model="user").first()
    if stale is not None:
        # Left behind by a previous rollback: restore_user_content_type re-labels the
        # real row back to auth|user, then post_migrate immediately recreates iam|user
        # (iam.User is still an installed model) with a fresh, ungranted permission set.
        # Drop that empty row so `old` can reclaim the (app_label, model) unique key.
        rows.filter(pk=stale.pk).delete()

    rows.filter(pk=old.pk).update(app_label=NEW_APP_LABEL)
    ContentType.objects.clear_cache()


def restore_user_content_type(apps, schema_editor):
    ContentType = apps.get_model("contenttypes", "ContentType")
    db_alias = schema_editor.connection.alias

    ContentType.objects.using(db_alias).filter(app_label=NEW_APP_LABEL, model="user").update(
        app_label=OLD_APP_LABEL
    )


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

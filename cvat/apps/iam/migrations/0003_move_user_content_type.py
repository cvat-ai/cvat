# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.conf import settings
from django.db import migrations

OLD_APP_LABEL = "auth"
NEW_APP_LABEL = "iam"


def _merge_permissions(apps, old_content_type, new_content_type):
    Permission = apps.get_model("auth", "Permission")
    User = apps.get_model(settings.AUTH_USER_MODEL)
    Group = apps.get_model("auth", "Group")

    user_permissions = User.user_permissions.through.objects
    group_permissions = Group.permissions.through.objects

    permissions_on_old_content_type = list(Permission.objects.filter(content_type=old_content_type))
    codename_to_permission_with_old_content_type = {
        permission.codename: permission for permission in permissions_on_old_content_type
    }

    permissions_on_new_content_type = list(Permission.objects.filter(content_type=new_content_type))

    for permission in permissions_on_new_content_type:
        permission_with_old_content_type = codename_to_permission_with_old_content_type.get(
            permission.codename
        )
        if permission_with_old_content_type is None:
            permission.content_type = old_content_type
            permission.save()
            continue

        users_already_granted = user_permissions.filter(
            permission_id=permission_with_old_content_type.pk
        ).values("user_id")
        user_permissions.filter(permission_id=permission.pk).exclude(
            user_id__in=users_already_granted
        ).update(permission_id=permission_with_old_content_type.pk)

        groups_already_granted = group_permissions.filter(
            permission_id=permission_with_old_content_type.pk
        ).values("group_id")
        group_permissions.filter(permission_id=permission.pk).exclude(
            group_id__in=groups_already_granted
        ).update(permission_id=permission_with_old_content_type.pk)

        permission.delete()


def move_user_content_type(apps, schema_editor):
    ContentType = apps.get_model("contenttypes", "ContentType")
    LogEntry = apps.get_model("admin", "LogEntry")
    rows = ContentType.objects.filter(model="user")

    old_content_type_row = rows.filter(app_label=OLD_APP_LABEL).first()
    if not old_content_type_row:
        # Fresh installation - auth.User is swapped out, so auth|user is never created and
        # there is nothing to move. Any iam|user row here is the real one (post_migrate
        # created it and auth_permission points at it), so it must not be deleted.
        return

    # NOTE @sosov: this is not a single UPDATE because of the
    # upgrade -> downgrade -> upgrade sequence:
    #
    #   upgrade    auth|user is re-labelled to iam|user in place, so the row id and every
    #              auth_permission / GenericForeignKey pointing at it stay valid
    #   downgrade  the row is re-labelled back to auth|user, and post_migrate then
    #              re-creates iam|user (iam.User is still an installed model) as a new,
    #              duplicate row with a fresh id and a fresh permission set
    #   upgrade    both rows now exist, so a bare UPDATE would violate the
    #              (app_label, model) unique constraint
    contenttype_post_migration_created_row = rows.filter(app_label=NEW_APP_LABEL).first()
    if contenttype_post_migration_created_row:
        _merge_permissions(apps, old_content_type_row, contenttype_post_migration_created_row)
        LogEntry.objects.filter(content_type=contenttype_post_migration_created_row).update(
            content_type=old_content_type_row
        )
        rows.filter(pk=contenttype_post_migration_created_row.pk).delete()

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
        ("admin", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(
            move_user_content_type,
            reverse_code=restore_user_content_type,
        ),
    ]

# Generated by Django 2.1.3 on 2019-02-05 17:08

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("dataset_repo", "0002_auto_20190123_1305"),
    ]

    replaces = [("git", "0003_gitdata_lfs")]

    operations = [
        migrations.AddField(
            model_name="gitdata",
            name="lfs",
            field=models.BooleanField(default=True),
        ),
    ]

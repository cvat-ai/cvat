from django.db import models


class RedisMigration(models.Model):
    app_label = models.CharField(max_length=128)
    name = models.CharField(max_length=128)
    applied_date = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                name="migration_name_unique",
                fields=("app_label", "name"),
            ),
        ]

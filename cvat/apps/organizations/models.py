from django.db import models
from django.contrib.auth.models import User, Group

class Organization(models.Model):
    name = models.CharField(max_length=256)
    description = models.TextField(blank=True)
    created_date = models.DateTimeField(auto_now_add=True)
    updated_date = models.DateTimeField(auto_now=True)
    owner = models.ForeignKey(User, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="organizations")

    # Roles in the organization
    worker = models.OneToOneField(Group, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="organization")
    developer = models.OneToOneField(Group, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="organization")
    maintainer = models.OneToOneField(Group, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="organization")

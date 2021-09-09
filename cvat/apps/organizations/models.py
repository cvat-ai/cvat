from django.db import models
from django.contrib.auth.models import User, Group

class Organization(models.Model):
    name = models.CharField(max_length=256)
    description = models.TextField(blank=True)
    created_date = models.DateTimeField(auto_now_add=True)
    updated_date = models.DateTimeField(auto_now=True)
    owner = models.ForeignKey(User, null=True,
        on_delete=models.SET_NULL, related_name='+')

class Member(models.Model):
    WORKER = 'W'
    SUPERVISOR = 'S'
    MAINTAINER = 'M'

    user = models.ForeignKey(User, null=True, on_delete=models.SET_NULL,
        related_name='+')
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE,
        related_name='members')
    role = models.CharField(max_length=1, choices=[
        (WORKER, 'Worker'),
        (SUPERVISOR, 'Supervisor'),
        (MAINTAINER, 'Maintainer'),
    ])

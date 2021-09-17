from django.db import models
from django.contrib.auth.models import User, Group

class Organization(models.Model):
    name = models.SlugField(max_length=256, primary_key=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    company = models.CharField(max_length=1024, blank=True)
    email = models.EmailField(required=False, blank=True)
    location = models.CharField(max_length=2048, blank=True)

    owner = models.ForeignKey(User, null=True,
        on_delete=models.SET_NULL, related_name='+')

class Membership(models.Model):
    WORKER = 'W'
    SUPERVISOR = 'S'
    MAINTAINER = 'M'

    user = models.ForeignKey(User, null=True, on_delete=models.SET_NULL,
        related_name='+', unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE,
        related_name='members')
    is_active = models.BooleanField(default=False)
    joined_at = models.DateTimeField(null=True)
    role = models.CharField(max_length=1, choices=[
        (WORKER, 'Worker'),
        (SUPERVISOR, 'Supervisor'),
        (MAINTAINER, 'Maintainer'),
    ])

# Inspried by https://github.com/bee-keeper/django-invitations
class Invitation(models.Model):
    accepted = models.BooleanField(default=False)
    key = models.CharField(max_length=64, unique=True)
    sent_at = models.DateTimeField(null=True)
    inviter = models.ForeignKey(User, null=True, on_delete=models.CASCADE)
    membership = models.OneToOneField(Membership, on_delete=models.CASCADE)

from django.db import models
from django.contrib.auth import get_user_model

class Organization(models.Model):
    slug = models.SlugField(max_length=16, primary_key=True)
    name = models.CharField(max_length=256, blank=True)
    description = models.TextField(blank=True)
    created_date = models.DateTimeField(auto_now_add=True)
    updated_date = models.DateTimeField(auto_now=True)
    company = models.CharField(max_length=1024, blank=True)
    email = models.EmailField(blank=True)
    location = models.CharField(max_length=2048, blank=True)

    owner = models.ForeignKey(get_user_model(), null=True,
        blank=True, on_delete=models.SET_NULL, related_name='+')

    class Meta:
        default_permissions = ()

class Membership(models.Model):
    WORKER = 'W'
    SUPERVISOR = 'S'
    MAINTAINER = 'M'

    user = models.ForeignKey(get_user_model(), on_delete=models.SET_NULL,
        null=True, related_name='+')
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE,
        related_name='members')
    is_active = models.BooleanField(default=False)
    joined_date = models.DateTimeField(null=True)
    role = models.CharField(max_length=1, choices=[
        (WORKER, 'Worker'),
        (SUPERVISOR, 'Supervisor'),
        (MAINTAINER, 'Maintainer'),
    ])

    class Meta:
        default_permissions = ()
        unique_together = ('user', 'organization')


# Inspried by https://github.com/bee-keeper/django-invitations
class Invitation(models.Model):
    key = models.CharField(max_length=64, primary_key=True)
    accepted = models.BooleanField(default=False)
    created_date = models.DateTimeField(null=True)
    owner = models.ForeignKey(get_user_model(), null=True, on_delete=models.CASCADE)
    membership = models.OneToOneField(Membership, on_delete=models.CASCADE)

    def send(self):
        pass

    class Meta:
        default_permissions = ()

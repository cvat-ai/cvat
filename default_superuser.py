import os

from django.contrib.auth.models import User
if not User.objects.filter(username=os.getenv("DJANGO_SUPERUSER_USERNAME","onepaneladmin")).exists():

	u = User(username=os.getenv("DJANGO_SUPERUSER_USERNAME","onepaneladmin"))
	u.set_password(os.getenv("DJANGO_SUPERUSER_PASSWORD","onepaneladmin"))
	u.is_superuser = True
	u.is_staff = True
	u.save()

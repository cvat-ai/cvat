from django.apps import AppConfig

class OrganizationsConfig(AppConfig):
    name = 'cvat.apps.organizations'

    def ready(self) -> None:
        from cvat.apps.iam.permissions import load_app_permissions
        load_app_permissions(self)

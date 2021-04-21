from django.apps import AppConfig


class TrainingConfig(AppConfig):
    name = 'cvat.apps.training'

    def ready(self):
        # Required to define signals in application
        import cvat.apps.training.signals
        # Required in order to silent "unused-import" in pyflake
        assert cvat.apps.training.signals

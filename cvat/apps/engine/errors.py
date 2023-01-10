from django.conf import settings
from django.utils.module_loading import import_string

class CVATError:
    def __getattr__(self, attr):
        dotted_path = settings.CVAT_ERRORS.get(attr)
        if dotted_path is None:
            raise AttributeError("Error '%s' doesn't declared in settings")

        val = import_string(dotted_path)

        setattr(self, attr, val)
        return val

base_error = CVATError()

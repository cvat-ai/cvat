from django.apps import apps

if apps.is_installed("silk"):
    from silk.profiling.profiler import silk_profile  # pylint: disable=unused-import
else:

    def silk_profile(name=None):
        def profile(f):
            return f

        return profile

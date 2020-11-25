from django.apps import apps

if apps.is_installed('silk'):
    from silk.profiling.profiler import silk_profile
else:
    from functools import wraps
    def silk_profile(name=None):
        def profile(f):
            @wraps(f)
            def wrapped(*args, **kwargs):
                return f(*args, **kwargs)
            return wrapped
        return profile
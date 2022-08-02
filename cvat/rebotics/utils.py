from enum import Enum
from django.conf import settings


class InjectionError(AttributeError):
    pass


def injected_property(name: str, error_message: str = None):
    """
    Allows to explicitly mark injected properties on base classes instead of direct monkey patching.
    Replaces AttributeError with more concrete InjectionError on get and suppresses it on delete.
    """
    def inner(cls):
        if name.startswith('_'):
            raise ValueError('Name should not be protected, private or magic.')

        private_name = '_{}'.format(name)
        message = error_message
        if message is None:
            message = "{}'s {} is not set.".format(cls.__name__, name)

        @property
        def prop(obj):
            try:
                return getattr(obj, private_name)
            except AttributeError:
                raise InjectionError(message)

        @prop.setter
        def prop(obj, value):
            setattr(obj, private_name, value)

        @prop.deleter
        def prop(obj):
            try:
                delattr(obj, private_name)
            except AttributeError:
                pass

        setattr(cls, name, prop)

        return cls
    return inner


class ChoicesEnum(Enum):
    @classmethod
    def choices(cls):
        return (x.value for x in cls)


class StrEnum(str, Enum):
    def __str__(self):
        return self.value


def setting(name, default=None):
    # obtain settings which may be not initialized.
    return getattr(settings, name, default)

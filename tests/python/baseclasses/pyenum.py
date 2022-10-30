from enum import Enum


class PyEnum(Enum):
    """
    Метод list будет возвращать все значения в виде списка,
    их мы сможем использовать в parametrize.
    Method that returns all enum values as list,
    so we will use them in parametrize construction.
    """
    @classmethod
    def list(cls):
        return list(map(lambda c: c.value, cls))

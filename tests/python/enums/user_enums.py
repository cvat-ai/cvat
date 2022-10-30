from cvat.tests.python.baseclasses.pyenum import PyEnum


class AccessRights(PyEnum):
    """
    Вариант хранения прав доступа.
    Example of access rights enums.
    """
    admin = ("admin", True)
    business = ("business", True)
    worker = ("worker", False)
    user = ("user", False)

from cvat.apps.engine.permissions import TaskPermission


class TestTaskPermission(TaskPermission):
    """
    Extends TaskPermission so the `annotations_stats` action of this app
    is authorized with the same scope as viewing the task's annotations.
    """

    @classmethod
    def _get_scopes(cls, request, view, obj):
        if view.action == "annotations_stats" and request.method == "GET":
            return [cls.Scopes.VIEW_ANNOTATIONS]

        return super()._get_scopes(request, view, obj)

class Events:
    RESOURCES = {
        "project",
        "task",
        "job",
        "issue",
        "comment",
        "membership",
        "invitation",
    }
    ACTIONS = {"created", "updated", "deleted"}

    @classmethod
    def select(cls, resources):
        ret = set()
        for resource in resources:
            if resource not in cls.RESOURCES:
                continue
            ret |= set(f"{resource}_{action}" for action in cls.RESOURCES)
        return ret

    @classmethod
    def all(cls):
        return set(
            f"{resource}_{action}"
            for resource in cls.RESOURCES
            for action in cls.ACTIONS
        ) | set(("organization_updated",))


class EventTypeChoice:
    @classmethod
    def choices(cls):
        return sorted((val, val.upper()) for val in Events.all())


class ProjectEvents:
    @classmethod
    def available_values(cls):
        return set(("project_updated",)) | Events.select(
            ["job", "task", "issue", "comment"]
        )


class OrganizationEvents:
    @classmethod
    def available_values(cls):
        return (
            set(("organization_updated",))
            | Events.select(["membership", "invitation", "project"])
            | ProjectEvents.choices()
        )

from .models import WebhookTypeChoice


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
            ret |= set(f"{resource}_{action}" for action in cls.ACTIONS)
        return ret


class EventTypeChoice:
    @classmethod
    def choices(cls):
        return sorted((val, val.upper()) for val in AllEvents.events)


class AllEvents:
    webhook_type = "all"
    events = list(
        set(
            f"{resource}_{action}"
            for resource in Events.RESOURCES
            for action in Events.ACTIONS
        )
        | set(("organization_updated",))
    )


class ProjectEvents:
    webhook_type = WebhookTypeChoice.PROJECT
    events = list(
        set(("project_updated",)) | Events.select(["job", "task", "issue", "comment"])
    )


class OrganizationEvents:
    webhook_type = WebhookTypeChoice.ORGANIZATION
    events = list(
        set(("organization_updated",))
        | Events.select(["membership", "invitation", "project"])
        | set(ProjectEvents.events)
    )

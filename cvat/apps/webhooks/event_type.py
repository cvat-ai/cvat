from .models import WebhookTypeChoice


class Events:
    RESOURCES = {
        "project":      ["created", "updated", "deleted"],
        "task":         ["created", "updated", "deleted"],
        "issue":        ["created", "deleted"], # TO-DO: implement issue_updated
        "comment":      ["created", "updated", "deleted"],
        "invitation":   ["created", "updated", "deleted"],
        "membership":   ["updated", "deleted"],
        "job":          ["updated"],
        "organization": ["updated"]
    }

    @classmethod
    def select(cls, resources):
        ret = set()
        for resource in resources:
            ret |= set(f"{resource}_{action}" for action in cls.RESOURCES.get(resource, []))
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
            for resource, actions in Events.RESOURCES.items()
            for action in actions
        )
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

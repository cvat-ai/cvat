import attrs

from cvat.utils.schemas import DTO


@attrs.define(frozen=True)
class EventGroupDTO(DTO):
    display_name: str


@attrs.define(frozen=True)
class EventDTO(DTO):
    action: str
    resource: str
    group: EventGroupDTO

    @property
    def key(self) -> str:
        from cvat.apps.webhooks.event_type import event_key

        return event_key(action=self.action, resource=self.resource)

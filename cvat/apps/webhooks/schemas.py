import attrs


@attrs.define(frozen=True)
class EventGroupDTO:
    display_name: str


@attrs.define(frozen=True)
class EventDTO:
    action: str
    resource: str
    group: EventGroupDTO

    @property
    def key(self) -> str:
        from cvat.apps.webhooks.event_type import event_key

        return event_key(action=self.action, resource=self.resource)

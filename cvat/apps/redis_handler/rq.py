from __future__ import annotations

import base64
from typing import Any, ClassVar
from uuid import UUID

import attrs
from django.conf import settings


def convert_id(value: int | str | UUID) -> int | UUID:
    if isinstance(value, (int, UUID)):
        return value

    assert isinstance(value, str)

    if value.isnumeric():
        return int(value)

    return UUID(value)


def convert_extra(value: dict) -> dict[str, Any]:
    assert isinstance(value, dict), f"Unexpected type: {type(value)}"
    for k, v in value.items():
        if not isinstance(v, str):
            value[k] = str(v)

    return value


@attrs.frozen(kw_only=True)
class RequestId:
    FIELD_SEP: ClassVar[str] = "&"
    KEY_VAL_SEP: ClassVar[str] = "="
    TYPE_SEP: ClassVar[str] = ":"

    queue: settings.CVAT_QUEUES = attrs.field(converter=settings.CVAT_QUEUES)
    action: str = attrs.field(validator=attrs.validators.instance_of(str))
    target: str = attrs.field(validator=attrs.validators.instance_of(str))
    id: int | UUID = attrs.field(
        validator=attrs.validators.instance_of((int, UUID)),
        converter=convert_id,
    )

    # todo: dot access
    extra: dict[str, Any] = attrs.field(converter=convert_extra, factory=dict)

    @property
    def type(self) -> str:
        return self.TYPE_SEP.join([self.action, self.target])

    # @classmethod
    # def from_base(cls, parsed_id: RequestId, /):
    def convert_to(self, child_class: type[RequestId], /):
        # method is going to be used by child classes
        return child_class(
            queue=self.queue,
            action=self.action,
            target=self.target,
            id=self.id,
            extra=self.extra,
        )

    def render(self) -> str:
        # TODO: add queue name indirectly
        bytes = self.FIELD_SEP.join(
            [
                self.KEY_VAL_SEP.join([k, v])
                for k, v in {
                    "queue": self.queue.value,
                    "action": str(self.action),
                    "target": str(self.target),
                    "id": str(self.id),
                    **self.extra,
                }.items()
            ]
        ).encode()

        return base64.b64encode(bytes).decode()

    # TODO: handle exceptions
    @classmethod
    def parse(cls, rq_id: str, /):
        decoded_rq_id = base64.b64decode(rq_id).decode()

        keys = set(attrs.fields_dict(cls).keys()) - {"extra"}
        params = {}

        for pair in decoded_rq_id.split(RequestId.FIELD_SEP):
            key, value = pair.split(RequestId.KEY_VAL_SEP, maxsplit=1)
            if key in keys:
                params[key] = value
            else:
                params.setdefault("extra", {})[key] = value

        return cls(**params)

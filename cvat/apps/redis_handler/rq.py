from __future__ import annotations

from typing import TYPE_CHECKING, ClassVar
from uuid import UUID

import attrs

from cvat.apps.engine.types import ExtendedRequest

if TYPE_CHECKING:
    from django.contrib.auth.models import User

import base64

from django.conf import settings


def convert_id(value: int | str | UUID) -> int | UUID:
    if isinstance(value, (int, UUID)):
        return value

    assert isinstance(value, str)

    if value.isnumeric():
        return int(value)

    return UUID(value)


@attrs.frozen(kw_only=True)
class RQId:
    FIELD_SEP: ClassVar[str] = "&"
    KEY_VAL_SEP: ClassVar[str] = "="

    queue: settings.CVAT_QUEUES = attrs.field(converter=settings.CVAT_QUEUES)
    action: str = attrs.field(validator=attrs.validators.instance_of(str))
    target: str = attrs.field(validator=attrs.validators.instance_of(str))
    id: int | UUID = attrs.field(
        validator=attrs.validators.instance_of((int, UUID)),
        converter=convert_id,
    )

    # todo: dot access
    extra: dict | None = attrs.field(default=None)

    @property
    def type(self) -> str:
        return ":".join([self.action, self.target])

    def render(self) -> str:
        bytes = self.FIELD_SEP.join(
            [
                self.KEY_VAL_SEP.join([k, v])
                for k, v in {
                    "queue": self.queue.value,
                    "action": self.action,
                    "target": self.target,
                    "id": str(self.id),
                    **(self.extra or {}),
                }.items()
            ]
        ).encode()

        return base64.b64encode(bytes).decode()

    # TODO: handle exceptions
    @classmethod
    def parse(cls, rq_id: str, /) -> RQId:
        decoded_rq_id = base64.b64decode(rq_id).decode()

        keys = set(attrs.fields_dict(cls).keys()) - {"extra"}
        params = {}

        for pair in decoded_rq_id.split(RQId.FIELD_SEP):
            key, value = pair.split(RQId.KEY_VAL_SEP, maxsplit=1)
            if key in keys:
                params[key] = value
            else:
                params.setdefault("extra", {})[key] = value

        return cls(**params)

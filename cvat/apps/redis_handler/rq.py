from __future__ import annotations

import base64
from typing import Any, ClassVar
from uuid import UUID

import attrs
from django.conf import settings
from rq.job import Job as RQJob
from typing import Protocol


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


class IncorrectRequestIdError(ValueError):
    pass


@attrs.frozen(kw_only=True)
class RequestId:
    FIELD_SEP: ClassVar[str] = "&"
    KEY_VAL_SEP: ClassVar[str] = "="
    TYPE_SEP: ClassVar[str] = ":"

    queue: str = attrs.field(validator=attrs.validators.instance_of(str))
    action: str = attrs.field(validator=attrs.validators.instance_of(str))
    target: str = attrs.field(validator=attrs.validators.instance_of(str))
    id: int | UUID = attrs.field(
        validator=attrs.validators.instance_of((int, UUID)),
        converter=convert_id,
    )
    extra: dict[str, Any] = attrs.field(converter=convert_extra, factory=dict)

    # todo: prohibit by default to set this field
    user_id: int | None = attrs.field(converter=lambda x: x if x is None else int(x), default=None)

    @property
    def type(self) -> str:
        subresource = getattr(self, "subresource", None)
        return self.TYPE_SEP.join([self.action, subresource or self.target])

    def convert_to(self, child_class: type[RequestId], /):
        # method is going to be used by child classes
        return child_class(
            queue=self.queue,
            action=self.action,
            target=self.target,
            id=self.id,
            user_id=self.user_id,
            extra=self.extra,
        )

    def render(self) -> str:
        data = self.FIELD_SEP.join(
            [
                self.KEY_VAL_SEP.join([k, v])
                for k, v in {
                    "queue": self.queue, # TODO: probably can be added in RequestIdSerializer?
                    "action": str(self.action),
                    "target": str(self.target),
                    "id": str(self.id),
                    **({"user_id": str(self.user_id),} if self.user_id is not None else {}),
                    **self.extra,
                }.items()
            ]
        ).encode()

        return base64.b64encode(data).decode()

    @classmethod
    def parse(cls, request_id: str, /):
        try:
            decoded_rq_id = base64.b64decode(request_id).decode()

            keys = set(attrs.fields_dict(cls).keys()) - {"extra"}
            params = {}

            for pair in decoded_rq_id.split(RequestId.FIELD_SEP):
                key, value = pair.split(RequestId.KEY_VAL_SEP, maxsplit=1)
                if key in keys:
                    params[key] = value
                else:
                    params.setdefault("extra", {})[key] = value

            return cls(**params)
        except Exception as ex:
            raise IncorrectRequestIdError from ex

class WithParsedId(Protocol):
    parsed_id: RequestId

class CustomRQJob(RQJob, WithParsedId):
    pass
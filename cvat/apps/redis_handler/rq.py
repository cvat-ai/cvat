from __future__ import annotations

import urllib.parse
from contextlib import suppress
from types import NoneType
from typing import Any, ClassVar, Protocol, overload
from uuid import UUID

import attrs
from django.conf import settings
from django.utils.module_loading import import_string
from rq.job import Job as RQJob

from cvat.apps.redis_handler.apps import MAPPING


def convert_extra(value: dict) -> dict[str, Any]:
    assert isinstance(value, dict), f"Unexpected type: {type(value)}"

    for k, v in value.items():
        assert v
        if not isinstance(v, str):
            value[k] = str(v)

    return value


class IncorrectRequestIdError(ValueError):
    pass


class RequestIdWithSubresourceMixin:
    TYPE_SEP: ClassVar[str]

    action: str
    target: str
    extra: dict[str, Any]

    @property
    def subresource(self) -> str:
        return self.extra["subresource"]

    @property
    def type(self) -> str:
        return self.TYPE_SEP.join([self.action, self.subresource or self.target])


class RequestIdWithOptionalSubresourceMixin(RequestIdWithSubresourceMixin):
    @property
    def subresource(self) -> str | None:
        with suppress(KeyError):
            return super().subresource

        return None


@attrs.frozen(kw_only=True)
class RequestId:
    FIELD_SEP: ClassVar[str] = "&"
    KEY_VAL_SEP: ClassVar[str] = "="

    ENCODE_MAPPING = {
        ".": "@",
        " ": "_",
    }
    DECODE_MAPPING = {v: k for k, v in ENCODE_MAPPING.items()}
    NOT_ALLOWED_CHARS = {FIELD_SEP, KEY_VAL_SEP, "/"} | set(DECODE_MAPPING.keys())

    TYPE_SEP: ClassVar[str] = ":"  # used in serialization logic

    action: str = attrs.field(validator=attrs.validators.instance_of(str))
    target: str = attrs.field(validator=attrs.validators.instance_of(str))
    target_id: int | None = attrs.field(
        converter=lambda x: x if x is None else int(x), default=None
    )

    id: UUID | None = attrs.field(
        converter=lambda x: x if isinstance(x, (NoneType, UUID)) else UUID(x),
        default=None,
    )  # operation id
    extra: dict[str, str] = attrs.field(converter=convert_extra, factory=dict)
    user_id: int | None = attrs.field(converter=lambda x: x if x is None else int(x), default=None)

    def __attrs_post_init__(self):
        assert (
            sum(1 for i in (self.target_id, self.id) if i) == 1
        ), "Only one of target_id or id should be set"

    @property
    def type(self) -> str:
        return self.TYPE_SEP.join([self.action, self.target])

    def to_dict(self) -> dict[str, Any]:
        base = attrs.asdict(self, filter=lambda _, v: bool(v))
        extra_data = base.pop("extra", {})
        return {**base, **extra_data}

    @classmethod
    def normalize(cls, repr_: dict[str, Any]) -> None:
        for key, value in repr_.items():
            str_value = str(value)
            for reserved in cls.NOT_ALLOWED_CHARS:
                if reserved in str_value:
                    raise IncorrectRequestIdError(f"{key} contains special character: {reserved!r}")

            for from_char, to_char in cls.ENCODE_MAPPING.items():
                if from_char in str_value:
                    str_value = str_value.replace(from_char, to_char)

            repr_[key] = str_value

    def render(self) -> str:
        rq_id_repr = self.to_dict()

        # rq_id is going to be used in urls as path parameter, so it should be URL safe.
        self.normalize(rq_id_repr)
        # urllib.parse.quote/urllib.parse.urlencode are not used here because:
        # - it's client logic to encode request ID
        # - return value is used as RQ job ID and should be
        #   a. in a decoded state
        #   b. readable
        return self.FIELD_SEP.join([f"{k}{self.KEY_VAL_SEP}{v}" for k, v in rq_id_repr.items()])

    @classmethod
    @overload
    def parse(cls, request_id: str, /, *, queue: str) -> RequestId: ...

    @classmethod
    @overload
    def parse(cls, request_id: str, /, *, queue: None = None) -> tuple[RequestId, str]: ...

    @classmethod
    def parse(
        cls, request_id: str, /, *, queue: str | None = None
    ) -> RequestId | tuple[RequestId, str]:
        class _RequestIdForMapping(RequestIdWithOptionalSubresourceMixin, RequestId):
            pass

        try:
            common_keys = set(attrs.fields_dict(cls).keys()) - {"extra"}
            params = {}

            for key, value in dict(urllib.parse.parse_qsl(request_id)).items():
                for from_char, to_char in cls.DECODE_MAPPING.items():
                    if from_char in value:
                        value = value.replace(from_char, to_char)

                if key in common_keys:
                    params[key] = value
                else:
                    params.setdefault("extra", {})[key] = value

            queue_is_known = bool(queue)

            if not queue_is_known:
                _parsed = _RequestIdForMapping(**params)
                queue = MAPPING[(_parsed.action, _parsed.target, _parsed.subresource)]

            if custom_cls_path := settings.RQ_QUEUES[queue].get("PARSED_JOB_ID_CLASS"):
                custom_cls = import_string(custom_cls_path)
                result = custom_cls(**params)
            else:
                result = cls(**params)

            if not queue_is_known:
                result = (result, queue)

            return result
        except Exception as ex:
            raise IncorrectRequestIdError from ex


class _WithParsedId(Protocol):
    parsed_id: RequestId


class CustomRQJob(RQJob, _WithParsedId):
    pass

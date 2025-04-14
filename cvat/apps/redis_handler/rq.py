from __future__ import annotations

import urllib.parse
from functools import cached_property
from typing import Any, ClassVar, Protocol
from uuid import UUID

import attrs
from django.conf import settings
from django.utils.module_loading import import_string
from rq.job import Job as RQJob


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
        assert v
        if not isinstance(v, str):
            value[k] = str(v)

    return value


class IncorrectRequestIdError(ValueError):
    pass


@attrs.frozen(kw_only=True)
class RequestId:
    FIELD_SEP: ClassVar[str] = "&"
    KEY_VAL_SEP: ClassVar[str] = "="

    SPECIAL_CHARS = {FIELD_SEP, KEY_VAL_SEP, "/", "."}
    ENCODE_MAPPING = {
        ".": "@",
    }
    DECODE_MAPPING = {v: k for k, v in ENCODE_MAPPING.items()}

    TYPE_SEP: ClassVar[str] = ":"  # used in serialization logic

    queue: str = attrs.field(validator=attrs.validators.instance_of(str))
    action: str = attrs.field(validator=attrs.validators.instance_of(str))
    target: str = attrs.field(validator=attrs.validators.instance_of(str))
    id: int | UUID = attrs.field(
        validator=attrs.validators.instance_of((int, UUID)),
        converter=convert_id,
    )
    extra: dict[str, Any] = attrs.field(converter=convert_extra, factory=dict)

    user_id: int | None = attrs.field(converter=lambda x: x if x is None else int(x), default=None)

    @cached_property
    def type(self) -> str:
        return self.TYPE_SEP.join([self.action, self.target])

    def to_dict(self) -> dict[str, Any]:
        repr_ = attrs.asdict(self, filter=lambda _, v: bool(v))
        if extra := repr_.pop("extra", None):
            repr_.update(extra)

        return repr_

    @classmethod
    def normalize(cls, repr_: dict[str, Any]) -> None:
        for key, value in repr_.items():
            str_value = str(value)

            for spec_char in cls.SPECIAL_CHARS:
                if spec_char in str_value:
                    if spec_char in cls.ENCODE_MAPPING:
                        str_value = str_value.replace(spec_char, cls.ENCODE_MAPPING[spec_char])
                        continue

                    raise IncorrectRequestIdError(
                        f"{key} contains special characters: {spec_char!r}"
                    )
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
    def parse(cls, request_id: str, /):
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

            if custom_cls_path := settings.RQ_QUEUES[params["queue"]].get("PARSED_JOB_ID_CLASS"):
                custom_cls = import_string(custom_cls_path)
                return custom_cls(**params)

            return cls(**params)
        except Exception as ex:
            raise IncorrectRequestIdError from ex


class WithParsedId(Protocol):
    parsed_id: RequestId


class CustomRQJob(RQJob, WithParsedId):
    pass

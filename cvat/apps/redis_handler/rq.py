from __future__ import annotations

import re
import urllib.parse
from types import NoneType
from typing import Any, ClassVar, Protocol
from uuid import UUID

import attrs
from django.utils.html import escape
from rq.job import Job as RQJob

from cvat.apps.redis_handler.apps import (
    QUEUE_TO_PARSED_JOB_ID_CLS,
    REQUEST_ID_SUBCLASSES,
    SELECTOR_TO_QUEUE,
)


class IncorrectRequestIdError(ValueError):
    pass


def _default_from_class_attr(attr_name: str):
    def factory(self):
        cls = type(self)
        if attrs_value := getattr(cls, attr_name, None):
            return attrs_value
        raise AttributeError(
            f"[{cls.__name__}] Unable to set default value for the {attr_name} attribute"
        )

    return attrs.Factory(factory, takes_self=True)


@attrs.frozen(kw_only=True, slots=False)  # to be able to inherit from RequestId
class RequestId:
    # https://datatracker.ietf.org/doc/html/rfc3986#section-2.3 - ALPHA / DIGIT / "-" / "." / "_" / "~"
    UNRESERVED_BY_RFC3986_SPECIAL_CHARACTERS: ClassVar[tuple[str]] = ("-", ".", "_", "~")
    ENCODE_MAPPING = {
        ".": "~",  # dot is a default DRF path parameter pattern
        " ": "_",
    }

    # "&" and "=" characters are reserved sub-delims symbols, but request ID is going to be used only as path parameter
    FIELD_SEP: ClassVar[str] = "&"
    KEY_VAL_SEP: ClassVar[str] = "="
    TYPE_SEP: ClassVar[str] = ":"  # used in serialization logic

    STR_WITH_UNRESERVED_SPECIAL_CHARACTERS: ClassVar[str] = "".join(
        re.escape(c)
        for c in (
            set(UNRESERVED_BY_RFC3986_SPECIAL_CHARACTERS)
            - {FIELD_SEP, KEY_VAL_SEP, *ENCODE_MAPPING.values()}
        )
    )
    VALIDATION_PATTERN: ClassVar[str] = rf"[\w{STR_WITH_UNRESERVED_SPECIAL_CHARACTERS}]+"

    action: str = attrs.field(
        validator=attrs.validators.instance_of(str),
        default=_default_from_class_attr("ACTION_DEFAULT_VALUE"),
    )
    ACTION_ALLOWED_VALUES: ClassVar[tuple[str]]
    QUEUE_SELECTORS: ClassVar[tuple] = ()

    @action.validator
    def validate_action(self, attribute: attrs.Attribute, value: Any):
        if hasattr(self, "ACTION_ALLOWED_VALUES") and value not in self.ACTION_ALLOWED_VALUES:
            raise ValueError(f"Action must be one of {self.ACTION_ALLOWED_VALUES!r}")

    target: str = attrs.field(validator=attrs.validators.instance_of(str))
    target_id: int | None = attrs.field(
        converter=lambda x: x if x is None else int(x), default=None
    )

    id: UUID | None = attrs.field(
        converter=lambda x: x if isinstance(x, (NoneType, UUID)) else UUID(x),
        default=None,
    )  # operation id
    user_id: int | None = attrs.field(converter=lambda x: x if x is None else int(x), default=None)

    # FUTURE-TODO: remove after several releases
    # backward compatibility with previous ID formats
    LEGACY_FORMAT_PATTERNS: ClassVar[tuple[str]] = ()

    def __attrs_post_init__(self):
        assert (
            sum(1 for i in (self.target_id, self.id) if i) == 1
        ), "Only one of target_id or id should be set"

    @property
    def type(self) -> str:
        return self.TYPE_SEP.join([self.action, self.target])

    def to_dict(self) -> dict[str, Any]:
        return attrs.asdict(self, filter=lambda _, v: bool(v))

    @classmethod
    def normalize(cls, repr_: dict[str, Any]) -> None:
        for key, value in repr_.items():
            str_value = str(value)
            if not re.match(cls.VALIDATION_PATTERN, str_value):
                raise IncorrectRequestIdError(
                    f"{key} does not match allowed format: {cls.VALIDATION_PATTERN}"
                )

            for from_char, to_char in cls.ENCODE_MAPPING.items():
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
    def parse(
        cls,
        request_id: str,
        /,
        *,
        try_legacy_format: bool = False,
    ) -> tuple[RequestId, str]:

        actual_cls = cls
        queue: str | None = None
        dict_repr = {}
        fragments = {}

        try:
            # try to parse ID as key=value pairs (newly introduced format)
            fragments = dict(urllib.parse.parse_qsl(request_id))

            if not fragments:
                # try to use legacy format
                if not try_legacy_format:
                    raise IncorrectRequestIdError(
                        f"Unable to parse request ID: {escape(request_id)!r}"
                    )

                match: re.Match | None = None

                for subclass in REQUEST_ID_SUBCLASSES if cls is RequestId else (cls,):
                    for pattern in subclass.LEGACY_FORMAT_PATTERNS:
                        match = re.match(pattern, request_id)
                        if match:
                            actual_cls = subclass
                            break
                    if match:
                        break
                else:
                    raise IncorrectRequestIdError(
                        f"Unable to parse request ID: {escape(request_id)!r}"
                    )

                queue = SELECTOR_TO_QUEUE[
                    actual_cls.QUEUE_SELECTORS[0]
                ]  # each selector match the same queue
                fragments = match.groupdict()
                # "." was replaced with "@" in previous format
                if "format" in fragments:
                    fragments["format"] = fragments["format"].replace("@", cls.ENCODE_MAPPING["."])

            # init dict representation for request ID
            for key, value in fragments.items():
                for to_char, from_char in cls.ENCODE_MAPPING.items():
                    value = value.replace(from_char, to_char)

                dict_repr[key] = value

            if not queue:
                # try to define queue dynamically based on action/target/subresource
                queue = SELECTOR_TO_QUEUE[
                    (dict_repr["action"], dict_repr["target"], dict_repr.get("subresource"))
                ]

                # queue that could be determined using SELECTOR_TO_QUEUE
                # must also be included into QUEUE_TO_PARSED_JOB_ID_CLS
                assert queue in QUEUE_TO_PARSED_JOB_ID_CLS
                actual_cls = QUEUE_TO_PARSED_JOB_ID_CLS[queue]

            assert issubclass(actual_cls, cls)
            result = actual_cls(**dict_repr)

            return (result, queue)
        except AssertionError:
            raise
        except Exception as ex:
            raise IncorrectRequestIdError from ex

    @classmethod
    def parse_and_validate_queue(
        cls,
        request_id: str,
        /,
        *,
        expected_queue: str,
        try_legacy_format: bool = False,
    ) -> RequestId:
        parsed_request_id, queue = cls.parse(request_id, try_legacy_format=try_legacy_format)
        assert queue == expected_queue
        return parsed_request_id


@attrs.frozen(kw_only=True, slots=False)
class RequestIdWithSubresource(RequestId):
    SUBRESOURCE_ALLOWED_VALUES: ClassVar[tuple[str]]

    subresource: str = attrs.field(
        validator=attrs.validators.instance_of(str),
        default=_default_from_class_attr("SUBRESOURCE_DEFAULT_VALUE"),
    )

    @subresource.validator
    def validate_subresource(self, attribute: attrs.Attribute, value: Any):
        if value not in self.SUBRESOURCE_ALLOWED_VALUES:
            raise ValueError(f"Subresource must be one of {self.SUBRESOURCE_ALLOWED_VALUES!r}")

    @property
    def type(self) -> str:
        return self.TYPE_SEP.join([self.action, self.subresource])


@attrs.frozen(kw_only=True, slots=False)
class RequestIdWithOptionalSubresource(RequestIdWithSubresource):
    subresource: str | None = attrs.field(
        validator=attrs.validators.instance_of((str, NoneType)), default=None
    )

    @subresource.validator
    def validate_subresource(self, attribute: attrs.Attribute, value: Any):
        if value is not None:
            super().validate_subresource(attribute, value)

    @property
    def type(self) -> str:
        return self.TYPE_SEP.join([self.action, self.subresource or self.target])


class _WithParsedId(Protocol):
    parsed_id: RequestId


class CustomRQJob(RQJob, _WithParsedId):
    pass

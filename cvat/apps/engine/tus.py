# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import base64
import json
import os
from functools import cached_property
from pathlib import Path
from types import NoneType
from typing import Any, ClassVar
from uuid import UUID, uuid4

import attrs
from django.conf import settings
from rest_framework import serializers

from cvat.apps.engine.log import ServerLogManager
from cvat.apps.engine.types import ExtendedRequest

slogger = ServerLogManager(__name__)


class TusFileNotFoundError(FileNotFoundError):
    pass


class TusFileForbiddenError(PermissionError):
    pass


class TusTooLargeFileError(Exception):
    pass


class TusChunk:
    def __init__(self, request: ExtendedRequest):
        self.offset = int(request.META.get("HTTP_UPLOAD_OFFSET", 0))

        try:
            self.size = int(request.META["CONTENT_LENGTH"])
        except KeyError as ex:
            raise serializers.ValidationError("Content-Length header is missing") from ex

        self.content = request.body

    @property
    def end_offset(self) -> int:
        return self.offset + self.size


@attrs.define()
class TusFile:
    @attrs.define(kw_only=True)
    class TusMeta:
        MAX_FILE_SIZE: ClassVar[int] = settings.TUS_MAX_FILE_SIZE

        file_size: int = attrs.field()

        @file_size.validator
        def validate_file_size(self, attribute: attrs.Attribute, value: Any):
            if not isinstance(value, int):
                raise ValueError

            if value > self.MAX_FILE_SIZE:
                raise TusTooLargeFileError

        offset: int = attrs.field(validator=attrs.validators.instance_of(int), default=0)

        # optional fields
        message_id: str | None = attrs.field(
            validator=attrs.validators.instance_of((str, NoneType)),
            default=None,
        )
        filename: str | None = attrs.field(
            validator=attrs.validators.instance_of((str, NoneType)),
            default=None,
        )
        filetype: str | None = attrs.field(
            validator=attrs.validators.instance_of((str, NoneType)),
            default=None,
        )

        @classmethod
        def from_request(cls, request: ExtendedRequest, /) -> TusFile.TusMeta:
            # Header details: https://tus.io/protocols/resumable-upload#upload-metadata
            metadata = {"file_size": int(request.META.get("HTTP_UPLOAD_LENGTH", "0"))}

            if message_id := request.META.get("HTTP_MESSAGE_ID"):
                metadata["message_id"] = base64.b64decode(message_id).decode()

            for kv in request.META.get("HTTP_UPLOAD_METADATA", "").split(","):
                splitted_metadata = kv.split(" ")
                if len(splitted_metadata) == 2:
                    key, value = splitted_metadata
                    metadata[key] = base64.b64decode(value).decode()
                else:
                    metadata[splitted_metadata[0]] = ""

            keys_to_keep = attrs.fields_dict(cls).keys()
            return cls(**{k: v for k, v in metadata.items() if k in keys_to_keep})

    @attrs.frozen(kw_only=True, slots=False)
    class FileID:
        SEPARATOR: ClassVar[str] = "_"
        REGEX: ClassVar[str] = (
            rf"(?P<file_id>\b[0-9]+{SEPARATOR}"
            + r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b)"
        )

        user_id: int = attrs.field(converter=int)
        uuid: UUID = attrs.field(
            converter=lambda x: x if isinstance(x, UUID) else UUID(x), factory=uuid4
        )

        @cached_property
        def as_str(self) -> str:
            return self.SEPARATOR.join([str(self.user_id), str(self.uuid)])

        @classmethod
        def parse(cls, file_id: str):
            user_id, uuid = file_id.split(cls.SEPARATOR, maxsplit=1)
            return cls(user_id=user_id, uuid=uuid)

    @attrs.define()
    class TusMetaFile:
        SUFFIX: ClassVar[str] = ".meta"

        _path: Path = attrs.field(
            validator=attrs.validators.instance_of(Path),
            on_setattr=attrs.setters.frozen,
        )
        _meta: TusFile.TusMeta = attrs.field(
            kw_only=True,
            on_setattr=attrs.setters.validate,
            default=None,
        )

        @_meta.validator
        def validate_meta(self, attribute: attrs.Attribute, value: Any):
            if not isinstance(value, (TusFile.TusMeta, NoneType)):
                raise TypeError(f"Unsupported type: {type(value)}")

        @property
        def meta(self):
            return self._meta

        def init_from_file(self):
            assert self._meta is None
            assert self.exists()
            with open(self._path, "r") as fp:
                data = json.load(fp)
            self._meta = TusFile.TusMeta(**data)

        def dump(self):
            assert self._meta is not None
            self._path.parent.mkdir(parents=True, exist_ok=True)
            with open(self._path, "w") as fp:
                json.dump(attrs.asdict(self._meta), fp)

        def exists(self):
            return self._path.exists()

        def delete(self):
            os.remove(self._path)

    file_id: TusFile.FileID = attrs.field(
        converter=lambda x: x if isinstance(x, TusFile.FileID) else TusFile.FileID.parse(x)
    )
    upload_dir: Path = attrs.field(
        validator=attrs.validators.instance_of(Path),
        kw_only=True,
    )
    meta_file: TusMetaFile | None = attrs.field(
        validator=attrs.validators.instance_of((TusMetaFile, NoneType)),
        kw_only=True,
        default=None,
    )
    file_path: Path = attrs.field(validator=attrs.validators.instance_of(Path), init=False)

    def __attrs_post_init__(self):
        self.file_path = self.upload_dir / self.file_id.as_str
        if self.meta_file is None:
            self.meta_file = TusFile.TusMetaFile(
                self.upload_dir / (self.file_id.as_str + TusFile.TusMetaFile.SUFFIX)
            )

    @property
    def filename(self):
        return self.meta_file.meta.filename

    @property
    def file_size(self):
        return self.meta_file.meta.file_size

    @property
    def offset(self):
        return self.meta_file.meta.offset

    def exists(self, *, with_meta: bool = True):
        file_exists = self.file_path.exists()

        if with_meta:
            file_exists = file_exists and self.meta_file.exists()

        return file_exists

    def init_file(self):
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        with open(self.file_path, "wb") as file:
            file.seek(self.file_size - 1)
            file.write(b"\0")

    def write_chunk(self, chunk: TusChunk):
        with open(self.file_path, "r+b") as file:
            file.seek(chunk.offset)
            file.write(chunk.content)
        self.meta_file.meta.offset += chunk.size
        self.meta_file.dump()

    def is_complete(self):
        return self.offset == self.file_size

    def rename(self):
        original_file_path = self.upload_dir / self.filename

        if original_file_path.exists():
            original_file_name, extension = original_file_path.stem, original_file_path.suffix
            file_amount = 1
            while (self.upload_dir / self.filename).exists():
                # FUTURE-FIXME: find a better way; data out of sync (in memory object/file)
                self.meta_file.meta.filename = "{}_{}{}".format(
                    original_file_name, file_amount, extension
                )
                original_file_path = self.upload_dir / self.filename
                file_amount += 1

        self.file_path.rename(original_file_path)

    def clean(self):
        self.meta_file.delete()

    def validate(self, *, user_id: int, with_meta: bool = True):
        if self.file_id.user_id != user_id:
            raise TusFileForbiddenError

        if not self.exists(with_meta=with_meta):
            raise TusFileNotFoundError

    @classmethod
    def create_file(
        cls,
        *,
        metadata: TusFile.TusMeta,
        upload_dir: Path,
        user_id: int,
    ) -> TusFile:
        file_id = cls.FileID(user_id=user_id)
        assert metadata.offset == 0

        meta_file = cls.TusMetaFile(
            path=upload_dir / (file_id.as_str + cls.TusMetaFile.SUFFIX),
            meta=metadata,
        )
        meta_file.dump()

        tus_file = cls(
            file_id,
            upload_dir=upload_dir,
            meta_file=meta_file,
        )
        tus_file.init_file()

        return tus_file

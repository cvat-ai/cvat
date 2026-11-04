# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Read-only annotation model independent of storage and conversion libraries.

Labels refer to positions in the accompanying catalog, not database label IDs.
Adapters retain source references separately from representation-specific IDs.
"""

from abc import ABC, abstractmethod
from collections.abc import Iterator, Mapping, Sequence
from dataclasses import dataclass
from enum import Enum
from functools import cached_property
from typing import Any


class AnnotationType(str, Enum):
    """Standard identifiers; custom annotations may define other string identifiers."""

    TAG = "tag"
    RECTANGLE = "rectangle"
    POLYGON = "polygon"
    POLYLINE = "polyline"
    POINTS = "points"
    ELLIPSE = "ellipse"
    CUBOID = "cuboid"
    MASK = "mask"
    SKELETON = "skeleton"
    INTERVAL = "interval"

    def __str__(self) -> str:
        return self.value


class AnnotationReferenceType(str, Enum):
    SHAPE = "shape"
    TRACK = "track"
    TAG = "tag"
    INTERVAL = "interval"

    def __str__(self) -> str:
        return self.value


@dataclass(frozen=True)
class AnnotationReference:
    obj_id: int
    job_id: int
    type: AnnotationReferenceType
    shape_type: str | None = None


@dataclass(frozen=True)
class AttributeSpec:
    id: int
    name: str
    input_type: str
    default_value: Any


@dataclass(frozen=True)
class Label:
    id: int
    name: str
    type: str
    parent: str = ""
    attributes: tuple[AttributeSpec, ...] = ()


@dataclass(frozen=True)
class LabelCatalog:
    labels: tuple[Label, ...]

    @cached_property
    def _by_name(self) -> Mapping[tuple[str, str], Label]:
        return {(label.name, label.parent): label for label in self.labels}

    def find(self, name: str, *, parent: str = "") -> Label:
        return self._by_name[name, parent]


class Annotation(ABC):
    """Base class for read-only annotation representations."""

    @property
    @abstractmethod
    def id(self) -> int | None:
        raise NotImplementedError

    @property
    @abstractmethod
    def annotation_type(self) -> str:
        """Stable identifier for serialization and filter expressions."""
        raise NotImplementedError

    @property
    @abstractmethod
    def label(self) -> int | None:
        raise NotImplementedError

    @property
    @abstractmethod
    def attributes(self) -> Mapping[str, Any]:
        raise NotImplementedError

    @property
    @abstractmethod
    def reference(self) -> AnnotationReference:
        raise NotImplementedError

    @property
    @abstractmethod
    def source(self) -> str | None:
        raise NotImplementedError

    @property
    @abstractmethod
    def group(self) -> int:
        raise NotImplementedError

    @property
    @abstractmethod
    def score(self) -> float:
        raise NotImplementedError


class Annotation2D(Annotation):
    """An annotation with a two-dimensional area in square pixels."""

    @abstractmethod
    def get_area(self) -> float:
        raise NotImplementedError


class Tag(Annotation):
    annotation_type = AnnotationType.TAG


class Rectangle(Annotation2D):
    annotation_type = AnnotationType.RECTANGLE


class Polygon(Annotation2D):
    annotation_type = AnnotationType.POLYGON


class Polyline(Annotation2D):
    annotation_type = AnnotationType.POLYLINE


class Points(Annotation2D):
    annotation_type = AnnotationType.POINTS


class Ellipse(Annotation2D):
    annotation_type = AnnotationType.ELLIPSE


class Cuboid(Annotation):
    annotation_type = AnnotationType.CUBOID


class Mask(Annotation2D):
    annotation_type = AnnotationType.MASK


class Skeleton(Annotation2D):
    annotation_type = AnnotationType.SKELETON


class Interval(Annotation):
    """An interval in absolute integer milliseconds, with an exclusive stop.

    None preserves an open end. Resolving it requires the consumer's recording scope.
    """

    annotation_type = AnnotationType.INTERVAL

    @property
    @abstractmethod
    def start(self) -> int:
        raise NotImplementedError

    @property
    @abstractmethod
    def stop(self) -> int | None:
        raise NotImplementedError


class Sample(ABC):
    """Annotations for one media item, identified by its ID and subset.

    Frame numbers are optional: a recording does not need an artificial frame.
    Annotation labels index the containing dataset's label catalog.
    """

    @property
    @abstractmethod
    def id(self) -> str:
        raise NotImplementedError

    @property
    @abstractmethod
    def subset(self) -> str:
        raise NotImplementedError

    @property
    @abstractmethod
    def annotations(self) -> Sequence[Annotation]:
        raise NotImplementedError

    @property
    @abstractmethod
    def frame_id(self) -> int | None:
        raise NotImplementedError


class Dataset(ABC):
    """Read-only dataset with lazy item access and a shared label catalog."""

    @property
    @abstractmethod
    def label_catalog(self) -> LabelCatalog:
        raise NotImplementedError

    @abstractmethod
    def __iter__(self) -> Iterator[Sample]:
        raise NotImplementedError

    @abstractmethod
    def __len__(self) -> int:
        raise NotImplementedError

    @abstractmethod
    def get(self, item_id: str, *, subset: str) -> Sample | None:
        raise NotImplementedError

# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import abc
from collections.abc import Sequence, Set
from typing import Protocol, TypeAlias, TypeVar

import attrs
import PIL.Image

import cvat_sdk.models as models

from ..attributes import attribute_value_validator
from .exceptions import BadFunctionError


class AutoAnnotationFunction(Protocol):
    """
    The base interface for all auto-annotation function interfaces.
    """

    @property
    def spec(self) -> object:
        """
        Returns the function's spec.

        In each specific auto-annotation function interface,
        this will be overridden to return a specific spec type.
        """
        ...


@attrs.frozen(kw_only=True)
class DetectionFunctionSpec:
    """
    Static information about an auto-annotation detection function.

    Objects of this class should be treated as immutable;
    do not modify them or any nested objects after they are created.
    """

    labels: Sequence[models.PatchedLabelRequest] = attrs.field()
    """
    Information about labels that the function supports.

    The members of the sequence must follow the same constraints as if they were being
    used to create a CVAT project, and the following additional constraints:

    * The id attribute must be set to a distinct integer.

    * The id attribute of any sublabels must be set to an integer, distinct between all
      sublabels of the same parent label.

    * The id attribute of any attributes must be set to an integer, distinct between all
      attributes of the same label or sublabel.

    `BadFunctionError` will be raised if any constraint violations are detected.

    It's recommended to use the helper factory functions (label_spec, skeleton_label_spec,
    keypoint_spec) to create the label objects, as they are more concise than the model
    constructors and help to follow some of the constraints.
    """

    @classmethod
    def _validate_attributes(
        cls, attributes: Sequence[models.AttributeRequest], label_desc: str
    ) -> None:
        seen_attr_ids = set()

        for attr in attributes:
            attr_desc = f"attribute {attr.name!r} of {label_desc}"

            if not hasattr(attr, "id"):
                raise BadFunctionError(f"{attr_desc} has no ID")

            if attr.id in seen_attr_ids:
                raise BadFunctionError(f"{attr_desc} has same ID as another attribute ({attr.id})")

            seen_attr_ids.add(attr.id)

            try:
                attribute_value_validator(attr)
            except ValueError as ex:
                raise BadFunctionError(f"{attr_desc} has invalid values: {ex}") from ex

    @classmethod
    def _validate_label_spec(cls, label: models.PatchedLabelRequest) -> None:
        label_desc = f"label {label.name!r}"

        cls._validate_attributes(getattr(label, "attributes", []), label_desc)

        if getattr(label, "sublabels", []):
            label_type = getattr(label, "type", "any")
            if label_type != "skeleton":
                raise BadFunctionError(
                    f"{label_desc} with sublabels has type {label_type!r} (should be 'skeleton')"
                )

            seen_sl_ids = set()

            for sl in label.sublabels:
                sl_desc = f"sublabel {sl.name!r} of {label_desc}"

                if not hasattr(sl, "id"):
                    raise BadFunctionError(f"{sl_desc} has no ID")

                if sl.id in seen_sl_ids:
                    raise BadFunctionError(f"{sl_desc} has same ID as another sublabel ({sl.id})")

                seen_sl_ids.add(sl.id)

                if sl.type != "points":
                    raise BadFunctionError(f"{sl_desc} has type {sl.type!r} (should be 'points')")

                cls._validate_attributes(getattr(sl, "attributes", []), sl_desc)

    @labels.validator
    def _validate_labels(self, attribute, value: Sequence[models.PatchedLabelRequest]) -> None:
        seen_label_ids = set()

        for label in value:
            if not hasattr(label, "id"):
                raise BadFunctionError(f"label {label.name!r} has no ID")

            if label.id in seen_label_ids:
                raise BadFunctionError(
                    f"label {label.name} has same ID as another label ({label.id})"
                )
            seen_label_ids.add(label.id)

            self._validate_label_spec(label)


class DetectionFunctionContext(metaclass=abc.ABCMeta):
    """
    Information that is supplied to an auto-annotation detection function.
    """

    @property
    @abc.abstractmethod
    def frame_name(self) -> str:
        """
        The file name of the frame that the current image corresponds to in
        the dataset.
        """

    @property
    @abc.abstractmethod
    def conf_threshold(self) -> float | None:
        """
        The confidence threshold that the function should use for filtering
        detections.

        If the function is able to estimate confidence levels, then:

        * If this value is None, the function may apply a default threshold at its discretion.

        * Otherwise, it will be a number between 0 and 1. The function must only return
          objects with confidence levels greater than or equal to this value.

        If the function is not able to estimate confidence levels, it can ignore this value.
        """

    @property
    @abc.abstractmethod
    def conv_mask_to_poly(self) -> bool:
        """
        If this is true, the function must convert any mask shapes to polygon shapes
        before returning them.

        If the function does not return any mask shapes, then it can ignore this value.
        """


DetectionAnnotation: TypeAlias = models.LabeledImageRequest | models.LabeledShapeRequest


class DetectionFunction(AutoAnnotationFunction, Protocol):
    """
    The interface that an auto-annotation detection function must implement.

    A detection function is supposed to accept an image and return a sequence of annotations
    (tags and/or shapes) describing objects in that image.

    Since the same function could be used with multiple datasets, it needs some way
    to refer to labels without using dataset-specific label IDs. The way this is
    accomplished is that the function declares its own labels via the spec attribute,
    and then refers to those labels in the returned annotations. The caller then matches
    up the labels from the function's spec with the labels in the actual dataset, and
    replaces the label IDs in the returned annotations with IDs of the corresponding
    labels in the dataset.

    The matching of labels between the function and the dataset is done by name.
    Therefore, a function can be used with a dataset if they have (at least some) labels
    that have the same name.
    """

    @property
    def spec(self) -> DetectionFunctionSpec:
        """Returns the function's spec."""
        ...

    def detect(
        self, context: DetectionFunctionContext, image: PIL.Image.Image
    ) -> Sequence[DetectionAnnotation]:
        """
        Detects objects on the supplied image and returns the results.

        The supplied context will contain information about the current image.

        The returned LabeledImageRequest and LabeledShapeRequest objects
        must follow the general constraints imposed by the data model
        (such as the number of points in a shape),
        as well as the following additional constraints:

        * The id attribute must not be set.

        * The source attribute must not be set.

        * The frame_id attribute must be set to 0.

        * The label_id attribute must equal one of the label IDs
          in the function spec.

        * The spec_id attribute of each element of the attributes attribute
          must equal one of the attribute IDs of the label spec corresponding to label_id.

        * The above constraints also apply to each sub-shape (element of a shape),
          except that the label_id of a sub-shape must equal one of the sublabel IDs
          of the label of its parent shape.

        It's recommended to use the helper factory functions
        (tag, shape, rectangle, skeleton, keypoint, etc.)
        to create the annotation objects, as they are more concise than the model
        constructors and help to follow some of the constraints.

        The function must not retain any references to the returned objects,
        so that the caller may freely modify them.
        """
        ...


@attrs.frozen(kw_only=True)
class TrackingFunctionSpec:
    """
    Static information about an auto-annotation tracking function.

    Objects of this class should be treated as immutable;
    do not modify them or any nested objects after they are created.
    """

    supported_shape_types: Set[str] = attrs.field(converter=frozenset[str])
    """
    A set of shape types that the function is able to track.

    Each value of the set must be one of the strings allowed as the `type` attribute
    in the `LabeledShape` model.
    """

    @supported_shape_types.validator
    def _validate_supported_shape_types(self, attribute, value: Set[str]) -> None:
        for st in value:
            models.ShapeType(st)


class TrackingFunctionContext(metaclass=abc.ABCMeta):
    """
    Information that is supplied to all methods of an auto-annotation tracking function.

    Currently, this class is empty, but in the future some properties may be added.
    """


class TrackingFunctionShapeContext(TrackingFunctionContext):
    """
    Information that is supplied to shape-specific methods of an auto-annotation tracking function.
    """

    @property
    @abc.abstractmethod
    def original_shape_type(self) -> str:
        """
        The type of the shape that is being tracked.
        """
        ...


@attrs.frozen(kw_only=True)
class TrackableShape:
    """
    A shape that can be tracked by an auto-annotation tracking function.

    All attributes have the same meaning as attributes of the same name in the `LabeledShape` model.
    """

    type: str
    points: list[float] = attrs.field(converter=list)


_PreprocessedImage = TypeVar("_PreprocessedImage")
_TrackingState = TypeVar("_TrackingState")


class TrackingFunction(AutoAnnotationFunction, Protocol[_PreprocessedImage, _TrackingState]):
    """
    The interface that an auto-annotation tracking function must implement.

    On a high level, a tracking function analyzes an image with one or more shapes on it,
    and then predicts the positions of those shapes on subsequent images.

    To enable interactive use, the "analysis" and "prediction" steps are performed
    by two separate methods: `init_tracking_state` and `track`.

    * `init_tracking_state` is expected to accept an image and a shape,
      and create and return a "tracking state" object that contains any data the function needs
      to track the shape on subsequent images.

    * `track` is expected to accept a new image and a tracking state, and return a new shape,
      whose position is the predicted position of the original shape on the new image.
      It may also update the tracking state as needed in order to improve tracking quality
      on subsequent images.

    In addition, a tracking function may implement a `preprocess_image` method
    that performs any processing that is independent of the specific shapes being tracked.
    Any image used with the function will first be passed to `preprocess_image`.
    When `init_tracking_state` and `track` are called, they will receive this method's output value.

    If a function does not implement `preprocess_image`, then `init_tracking_state` and `track`
    will receive the original image as a `PIL.Image.Image` object.
    """

    @property
    def spec(self) -> TrackingFunctionSpec:
        """Returns the function's spec."""
        ...

    def preprocess_image(
        self, context: TrackingFunctionContext, image: PIL.Image.Image
    ) -> _PreprocessedImage:
        """
        Performs any processing that may be done on the given image independently of the shapes
        that will be tracked on it.

        Returns a new object that represents the processing results.

        Note that the resulting object may be reused in multiple calls to
        `init_tracking_state` and `track`.

        This method is optional to implement.
        """
        ...

    def init_tracking_state(
        self,
        context: TrackingFunctionShapeContext,
        pp_image: _PreprocessedImage,
        shape: TrackableShape,
    ) -> _TrackingState:
        """
        Analyzes the given image and shape, and returns a new object containing any data needed
        to predict this shape's position on subsequent images.

        `shape.type` will be one of the types listed in the `supported_shape_types` field
        of the function's spec.

        `pp_image` will be the result of calling `preprocess_image` on the image the shape is on,
        or, if `preprocess_image` is not implemented, that image itself as a `PIL.Image.Image`.
        The method must not modify this object.
        """
        ...

    def track(
        self,
        context: TrackingFunctionShapeContext,
        pp_image: _PreprocessedImage,
        state: _TrackingState,
    ) -> TrackableShape | None:
        """
        Predicts the position of a previously-analyzed shape on a new image.

        `pp_image` will be the result of calling `preprocess_image` on the image
        on which the shape must be located,
        or, if `preprocess_image` is not implemented, that image itself as a `PIL.Image.Image`.
        The method must not modify this object.

        `state` will be the result of calling `init_tracking_state`.
        The method may modify this object as necessary to improve tracking quality
        on subsequent images.

        The dimensions of the image used to create `pp_image` will be the same as those
        of the image used to create `state`.

        If the function is able to find this shape on the new image,
        it returns a new shape with the predicted position.
        Otherwise, it returns None.

        If the function returns a shape, that shape must have the same type
        as that of the shape used to create `state`.
        """
        ...


# spec factories


# pylint: disable-next=redefined-builtin
def label_spec(name: str, id: int, **kwargs) -> models.PatchedLabelRequest:
    """Helper factory function for PatchedLabelRequest."""
    return models.PatchedLabelRequest(name=name, id=id, **kwargs)


def skeleton_label_spec(
    name: str,
    # pylint: disable-next=redefined-builtin
    id: int,
    sublabels: Sequence[models.SublabelRequest],
    **kwargs,
) -> models.PatchedLabelRequest:
    """Helper factory function for PatchedLabelRequest with type="skeleton"."""
    return label_spec(name, id, type="skeleton", sublabels=sublabels, **kwargs)


# pylint: disable-next=redefined-builtin
def keypoint_spec(name: str, id: int, **kwargs) -> models.SublabelRequest:
    """Helper factory function for SublabelRequest with type="points"."""
    return models.SublabelRequest(name=name, id=id, type="points", **kwargs)


def attribute_spec(
    name: str,
    # pylint: disable-next=redefined-builtin
    id: int,
    input_type: str,
    values: list[str],
    **kwargs,
) -> models.AttributeRequest:
    """Helper factory function for AttributeRequest with mutable=False."""
    return models.AttributeRequest(
        name=name, id=id, input_type=input_type, values=values, mutable=False, **kwargs
    )


def number_attribute_spec(
    name: str,
    # pylint: disable-next=redefined-builtin
    id: int,
    values: list[str],
    **kwargs,
) -> models.AttributeRequest:
    """
    Helper factory function for AttributeRequest with input_type="number".

    It's recommended to use the `cvat_sdk.attributes.number_attribute_values` function
    to create the `values` argument.
    """
    return attribute_spec(name, id, "number", values, **kwargs)


# pylint: disable-next=redefined-builtin
def checkbox_attribute_spec(name: str, id: int, **kwargs) -> models.AttributeRequest:
    """Helper factory function for AttributeRequest with input_type="checkbox"."""
    return attribute_spec(name, id, "checkbox", [], **kwargs)


def radio_attribute_spec(
    name: str,
    # pylint: disable-next=redefined-builtin
    id: int,
    values: list[str],
    **kwargs,
) -> models.AttributeRequest:
    """Helper factory function for AttributeRequest with input_type="radio"."""
    return attribute_spec(name, id, "radio", values, **kwargs)


def select_attribute_spec(
    name: str,
    # pylint: disable-next=redefined-builtin
    id: int,
    values: list[str],
    **kwargs,
) -> models.AttributeRequest:
    """Helper factory function for AttributeRequest with input_type="select"."""
    return attribute_spec(name, id, "select", values, **kwargs)


# pylint: disable-next=redefined-builtin
def text_attribute_spec(name: str, id: int, **kwargs) -> models.AttributeRequest:
    """Helper factory function for AttributeRequest with input_type="text"."""
    return attribute_spec(name, id, "text", [], **kwargs)


# annotation factories


def tag(label_id: int, **kwargs) -> models.LabeledImageRequest:
    """Helper factory function for LabeledImageRequest with frame=0."""
    return models.LabeledImageRequest(label_id=label_id, frame=0, **kwargs)


def shape(label_id: int, **kwargs) -> models.LabeledShapeRequest:
    """Helper factory function for LabeledShapeRequest with frame=0."""
    return models.LabeledShapeRequest(label_id=label_id, frame=0, **kwargs)


def rectangle(label_id: int, points: Sequence[float], **kwargs) -> models.LabeledShapeRequest:
    """Helper factory function for LabeledShapeRequest with frame=0 and type="rectangle"."""
    return shape(label_id, type="rectangle", points=points, **kwargs)


def polygon(label_id: int, points: Sequence[float], **kwargs) -> models.LabeledShapeRequest:
    """Helper factory function for LabeledShapeRequest with frame=0 and type="polygon"."""
    return shape(label_id, type="polygon", points=points, **kwargs)


def mask(label_id: int, points: Sequence[float], **kwargs) -> models.LabeledShapeRequest:
    """
    Helper factory function for LabeledShapeRequest with frame=0 and type="mask".

    It's recommended to use the cvat_sdk.masks.encode_mask function to build the
    points argument.
    """
    return shape(label_id, type="mask", points=points, **kwargs)


def skeleton(
    label_id: int, elements: Sequence[models.SubLabeledShapeRequest], **kwargs
) -> models.LabeledShapeRequest:
    """Helper factory function for LabeledShapeRequest with frame=0 and type="skeleton"."""
    return shape(label_id, type="skeleton", elements=elements, **kwargs)


def keypoint(label_id: int, points: Sequence[float], **kwargs) -> models.SubLabeledShapeRequest:
    """Helper factory function for SubLabeledShapeRequest with frame=0 and type="points"."""
    return models.SubLabeledShapeRequest(
        label_id=label_id, frame=0, type="points", points=points, **kwargs
    )

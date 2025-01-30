# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from collections.abc import Iterator
from functools import wraps
from itertools import islice
from typing import Any, Callable, TypeVar, overload

import attrs
from attr import field

T = TypeVar("T", bound=int | float | str)


def _parse_self_and_other_before_accessing(list_method: Callable[..., Any]) -> Callable[..., Any]:
    @wraps(list_method)
    def wrapper(self: "LazyList", other: Any) -> "LazyList":
        self._parse_up_to(-1)
        if isinstance(other, LazyList):
            other._parse_up_to(-1)
        if not isinstance(other, list):
            # explicitly calling list.__add__ with
            # np.ndarray raises TypeError instead of it returning NotImplemented
            # this prevents python from executing np.ndarray.__radd__
            return NotImplemented

        return list_method(self, other)

    return wrapper


def _parse_self_before_accessing(list_method: Callable[..., Any]) -> Callable[..., Any]:
    """Wrapper for original list methods. Forces LazyList to parse itself before accessing them."""

    @wraps(list_method)
    def wrapper(self: "LazyList", *args, **kwargs) -> "LazyList":
        self._parse_up_to(-1)

        return list_method(self, *args, **kwargs)

    return wrapper


class LazyListMeta(type):
    def __new__(
        mcs,
        name: str,
        bases: tuple[type, ...],
        namespace: dict[str, Any],
    ):
        # add pre-parse for list methods
        for method_name in [
            "append",
            "copy",
            "insert",
            "pop",
            "remove",
            "reverse",
            "sort",
            "clear",
            "index",
            "count",
            "__setitem__",
            "__delitem__",
            "__contains__",
            "__len__",
            "__reversed__",
            "__mul__",
            "__rmul__",
            "__imul__",
        ]:
            namespace[method_name] = _parse_self_before_accessing(getattr(list, method_name))

        for method_name in [
            "extend",
            "__add__",
            "__iadd__",
            "__eq__",
            "__gt__",
            "__ge__",
            "__lt__",
            "__le__",
        ]:
            namespace[method_name] = _parse_self_and_other_before_accessing(
                getattr(list, method_name)
            )

        return super().__new__(mcs, name, bases, namespace)


@attrs.define(slots=True, repr=False)
class LazyList(list[T], metaclass=LazyListMeta):
    """
    Evaluates elements from the string representation as needed.
    Lazy evaluation is supported for __getitem__ and __iter__ methods.
    Using any other method will result in parsing the whole string.
    Once instance of LazyList is fully parsed (either by accessing list methods
    or by iterating over all elements), it will behave just as a regular python list.
    """

    _string: str = ""
    _separator: str = ","
    _converter: Callable[[str], T] = lambda s: s
    _probable_length: int | None = field(init=False, default=None)
    _parsed: bool = field(init=False, default=False)

    def __repr__(self) -> str:
        if self._parsed:
            return f"LazyList({list.__repr__(self)})"
        current_index = list.__len__(self)
        current_position = 1 if self._string.startswith("[") else 0
        separator_offset = len(self._separator)

        for _ in range(current_index):
            current_position = (
                self._string.find(self._separator, current_position) + separator_offset
            )

        parsed_elements = list.__repr__(self).removesuffix("]")
        unparsed_elements = self._string[current_position:]
        return (
            f"LazyList({parsed_elements}... + {unparsed_elements}', "
            f"({list.__len__(self) / self._compute_max_length(self._string) * 100:.02f}% parsed))"
        )

    def __deepcopy__(self, memodict: Any = None) -> list[T]:
        """
        Since our elements are scalar, this should be sufficient
        Without this, deepcopy would copy the state of the object,
        then would try to append its elements.

        However, since copy will contain initial string,
        it will compute its elements on the first on the first append,
        resulting in value duplication.
        """
        return list(self)

    @overload
    def __getitem__(self, index: int) -> T: ...

    @overload
    def __getitem__(self, index: slice) -> list[T]: ...

    def __getitem__(self, index: int | slice) -> T | list[T]:
        if self._parsed:
            return list.__getitem__(self, index)

        if isinstance(index, slice):
            if (
                index.start is not None
                and index.start < 0
                or index.stop is not None
                and index.stop < 0
                or index.step is not None
                and index.step < 0
            ):
                # to compute negative indices we must know the exact length in advance
                # which is impossible if we take into account missing elements,
                # so we have to parse the full list
                self._parse_up_to(-1)
            else:
                self._parse_up_to(index.indices(self._compute_max_length(self._string))[1] - 1)

            return list.__getitem__(self, index)

        self._parse_up_to(index)
        return list.__getitem__(self, index)

    def __iter__(self) -> Iterator[T]:
        yield from list.__iter__(self)
        yield from self._iter_unparsed()

    def __str__(self) -> str:
        if not self._parsed:
            return self._string.strip("[]")
        return self._separator.join(map(str, self))

    def _parse_up_to(self, index: int) -> None:
        if self._parsed:
            return

        if index < 0:
            index += self._compute_max_length(self._string)

        start = list.__len__(self)
        if start > index:
            return
        end = index - start + 1
        for _ in islice(self._iter_unparsed(), end + 1):
            pass

        if index == self._compute_max_length(self._string) - 1:
            self._mark_parsed()

    def _mark_parsed(self):
        self._parsed = True
        self._string = ""  # freeing the memory

    def _iter_unparsed(self):
        if self._parsed:
            return
        string = self._string
        current_index = list.__len__(self)
        current_position = 1 if string.startswith("[") else 0
        string_length = len(string) - 1 if string.endswith("]") else len(string)
        separator_offset = len(self._separator)

        for _ in range(current_index):
            current_position = string.find(self._separator, current_position) + separator_offset

        probable_length = self._compute_max_length(string)
        while current_index < probable_length:
            end = string.find(self._separator, current_position, string_length)
            if end == -1:
                end = string_length
                self._mark_parsed()

            element_str = string[current_position:end]
            current_position = end + separator_offset
            if not element_str:
                probable_length -= 1
                continue
            element = self._converter(element_str)
            if list.__len__(self) <= current_index:
                # We need to handle special case when instance of lazy list becomes parsed after
                # this function is called:
                # ll = LazyList("1,2,3", _converter=int)
                # iterator = iter(ll)
                # next(iterator)  # > 1 (will generate next element and append to self)
                # list(ll)  # > [1, 2, 3]
                # next(iterator)  # > 2 (will generate next element, however will not append it)
                # assert list(ll) == [1, 2, 3]
                list.append(self, element)
            yield element
            current_index += 1

    def _compute_max_length(self, string) -> int:
        if self._probable_length is None:
            if not self._string:
                return 0
            self._probable_length = string.count(self._separator) + 1
        return self._probable_length

    # support pickling

    def __reduce__(self):
        return self.__class__, (self._string, self._separator, self._converter), self.__getstate__()

    def __reduce_ex__(self, protocol: int):
        return self.__reduce__()

    def __getstate__(self):
        return {
            "string": self._string,
            "_separator": self._separator,
            "_converter": self._converter,
            "_probable_length": self._probable_length,
            "parsed": self._parsed,
            "parsed_elements": list(self) if self._parsed else None,
        }

    def __setstate__(self, state):
        self._string = state["string"]
        self._separator = state["_separator"]
        self._converter = state["_converter"]
        self._probable_length = state["_probable_length"]
        self._parsed = state["parsed"]
        if self._parsed:
            self.extend(state["parsed_elements"])

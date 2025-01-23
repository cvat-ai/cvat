import copy
import pickle
import unittest
from typing import TypeVar

from cvat.apps.engine.lazy_list import LazyList

T = TypeVar('T')


class SliceGetter:
    def __class_getitem__(cls, slice_: slice) -> slice:
        if not isinstance(slice_, slice):
            raise TypeError("Use slice_getter only for slices")
        return slice_


class TestLazyList(unittest.TestCase):

    def setUp(self):
        self.lazy_list = LazyList(string="1,2,,3,4,5,6,7,8,9,10,11,12,,13,14,15", converter=int)
        self.empty_lazy_list = LazyList(string="")

    def test_len(self):
        self.assertEqual(len(self.lazy_list), 15)
        list(self.lazy_list)
        self.assertEqual(len(self.lazy_list), 15)

    def test_repr(self):
        self.assertEqual(repr(self.lazy_list), "LazyList([... + 1,2,,3,4,5,6,7,8,9,10,11,12,,13,14,15', (0.00% parsed))")
        next(iter(self.lazy_list))  # Trigger parsing of the first element
        self.assertIn("1... + 2,,3,4", repr(self.lazy_list))
        list(self.lazy_list)
        self.assertEqual(repr(self.lazy_list), "LazyList([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])")

    def test_deepcopy(self):
        copied_list = copy.deepcopy(self.lazy_list)
        self.assertEqual(copied_list, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
        self.assertNotEqual(id(copied_list), id(self.lazy_list))
        self.assertEqual(len(copied_list), 15)

    def test_getitem(self):
        self.assertEqual(self.lazy_list[1], 2)
        self.assertEqual(self.lazy_list[:3], [1, 2, 3])

    def test_iter(self):
        iterator = iter(self.lazy_list)
        self.assertEqual(next(iterator), 1)
        self.assertEqual(next(iterator), 2)
        self.assertEqual(list(self.lazy_list), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
        self.assertEqual(next(iterator), 3)
        self.assertEqual(list(self.lazy_list), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])

    def test_append(self):
        self.lazy_list.append(16)
        self.assertEqual(self.lazy_list, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])

    def test_copy(self):
        copied_list = self.lazy_list.copy()
        self.assertEqual(copied_list, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])

    def test_insert(self):
        self.lazy_list.insert(0, 0)
        self.assertEqual(self.lazy_list, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])

    def test_pop(self):
        value = self.lazy_list.pop()
        self.assertEqual(value, 15)
        self.assertEqual(self.lazy_list, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14])

    def test_remove(self):
        self.lazy_list.remove(2)
        self.assertEqual(self.lazy_list, [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])

    def test_reverse(self):
        self.lazy_list.reverse()
        self.assertEqual(self.lazy_list, [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1])

    def test_sort(self):
        unsorted_list = LazyList(string="3,1,2", converter=int)
        unsorted_list.sort()
        self.assertEqual(unsorted_list, [1, 2, 3])

    def test_clear(self):
        self.lazy_list.clear()
        self.assertEqual(len(self.lazy_list), 0)

    def test_index(self):
        self.assertEqual(self.lazy_list.index(3), 2)

    def test_count(self):
        self.assertEqual(self.lazy_list.count(2), 1)

    def test_setitem(self):
        self.lazy_list[0] = 99
        self.assertEqual(self.lazy_list[0], 99)

    def test_delitem(self):
        del self.lazy_list[0]
        self.assertEqual(self.lazy_list, [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])

    def test_contains(self):
        self.assertIn(2, self.lazy_list)

    def test_reversed(self):
        self.assertEqual(list(reversed(self.lazy_list)), [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1])

    def test_mul(self):
        self.assertEqual(self.lazy_list * 2, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])

    def test_rmul(self):
        self.assertEqual(2 * self.lazy_list, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])

    def test_imul(self):
        self.lazy_list *= 2
        self.assertEqual(self.lazy_list, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])

    def test_extend(self):
        self.lazy_list.extend([16, 17])
        self.assertEqual(self.lazy_list, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17])

    def test_add(self):
        new_list = self.lazy_list + [16, 17]
        self.assertEqual(new_list, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17])

    def test_eq(self):
        self.assertTrue(self.lazy_list == [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])

    def test_iadd(self):
        self.lazy_list += [16, 17]
        self.assertEqual(self.lazy_list, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17])

    def test_gt(self):
        self.assertTrue(self.lazy_list > [1, 2, 3])

    def test_ge(self):
        self.assertTrue(self.lazy_list >= [1, 2, 3, 4, 5])

    def test_lt(self):
        self.assertTrue(self.lazy_list < [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])

    def test_le(self):
        self.assertTrue(self.lazy_list <= [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])

    def test_lazy_list_with_lazy_list(self):
        other_lazy_list = LazyList(string="16,17", converter=int)
        combined_list = self.lazy_list + other_lazy_list
        self.assertEqual(combined_list, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17])

    def test_pickle_support(self):
        pickled = pickle.dumps(self.lazy_list)
        unpickled = pickle.loads(pickled)
        self.assertEqual(unpickled, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
        self.assertEqual(unpickled._string, "")
        self.assertTrue(unpickled._parsed)

    def test_parse_before_accessing_decorator(self):
        lazy_list_copy = LazyList(string="1,2,,3,4,5,6,7,8,9,10,11,12,,13,14,15", converter=int)
        lazy_list_copy.append(16)
        self.assertEqual(lazy_list_copy, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])

    def test_parse_both_before_accessing_decorator(self):
        other_list = LazyList(string="16,17", converter=int)
        result = self.lazy_list + other_list
        self.assertEqual(result, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17])

    def test_length_on_iteration(self):
        elements = []
        for element in self.lazy_list:
            self.assertEqual(len(self.lazy_list), 15)
            elements.append(element)

        self.assertEqual(elements, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])

    def test_str(self):
        self.assertEqual(str(self.lazy_list), "1,2,,3,4,5,6,7,8,9,10,11,12,,13,14,15")
        self.assertEqual(self.lazy_list, LazyList(str(self.lazy_list), converter=int))

    def test_str_parsed(self):
        list(self.lazy_list)
        self.assertEqual(str(self.lazy_list), "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15")
        self.assertEqual(self.lazy_list, LazyList(str(self.lazy_list), converter=int))

    def test_slice(self):
        for slice_, expected in (
            (SliceGetter[1:], [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]),
            (SliceGetter[:3], [1, 2, 3]),
            (SliceGetter[::2], [1, 3, 5, 7, 9, 11, 13, 15]),
            (SliceGetter[1::2], [2, 4, 6, 8, 10, 12, 14]),
            (SliceGetter[::-1], [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]),
            (SliceGetter[-2:], [14, 15]),
            (SliceGetter[:-2], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]),
            (SliceGetter[:-1], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]),
            (SliceGetter[-2::-1], [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]),
            (SliceGetter[::2], [1, 3, 5, 7, 9, 11, 13, 15]),
            (SliceGetter[::-2], [15, 13, 11, 9, 7, 5, 3, 1]),
            (SliceGetter[1::-1], [2, 1]),
            (SliceGetter[1:3:2], [2]),
        ):
            with self.subTest(f"self.lazy_list[{slice_}]. Expected: {expected}"):
                self.assertEqual(self.lazy_list[slice_], expected)
            with self.subTest(f"self.empty_lazy_list[{slice_}]. Expected: []"):
                self.assertEqual(self.empty_lazy_list[slice_], [])


if __name__ == "__main__":
    unittest.main()

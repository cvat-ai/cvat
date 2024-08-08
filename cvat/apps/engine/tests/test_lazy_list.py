import unittest
import copy
import pickle
from typing import TypeVar
from cvat.apps.engine.lazy_list import LazyList


T = TypeVar('T')


class TestLazyList(unittest.TestCase):

    def setUp(self):
        self.lazy_list = LazyList(string="1,2,3", converter=int)

    def test_skipped_values(self):
        ll = LazyList("1,2,,4", converter=int)
        self.assertEqual(len(ll), 3)
        self.assertEqual(ll, [1, 2, 4])

    def test_len(self):
        self.assertEqual(len(self.lazy_list), 3)
        list(self.lazy_list)
        self.assertEqual(len(self.lazy_list), 3)

    def test_repr(self):
        self.assertEqual(repr(self.lazy_list), "LazyList([... + 1,2,3', (0.00% parsed))")
        next(iter(self.lazy_list))  # Trigger parsing of the first element
        self.assertIn("1... + 2,3", repr(self.lazy_list))
        list(self.lazy_list)
        self.assertEqual(repr(self.lazy_list), "LazyList([1, 2, 3])")

    def test_deepcopy(self):
        copied_list = copy.deepcopy(self.lazy_list)
        self.assertEqual(copied_list, [1, 2, 3])
        self.assertNotEqual(id(copied_list), id(self.lazy_list))
        self.assertEqual(len(copied_list), 3)

    def test_getitem(self):
        self.assertEqual(self.lazy_list[1], 2)
        self.assertEqual(self.lazy_list[:2], [1, 2])

    def test_iter(self):
        iterator = iter(self.lazy_list)
        self.assertEqual(next(iterator), 1)
        self.assertEqual(next(iterator), 2)
        self.assertEqual(list(self.lazy_list), [1, 2, 3])
        self.assertEqual(next(iterator), 3)
        self.assertEqual(list(self.lazy_list), [1, 2, 3])

    def test_append(self):
        self.lazy_list.append(4)
        self.assertEqual(self.lazy_list, [1, 2, 3, 4])

    def test_copy(self):
        copied_list = self.lazy_list.copy()
        self.assertEqual(copied_list, [1, 2, 3])

    def test_insert(self):
        self.lazy_list.insert(0, 0)
        self.assertEqual(self.lazy_list, [0, 1, 2, 3])

    def test_pop(self):
        value = self.lazy_list.pop()
        self.assertEqual(value, 3)
        self.assertEqual(self.lazy_list, [1, 2])

    def test_remove(self):
        self.lazy_list.remove(2)
        self.assertEqual(self.lazy_list, [1, 3])

    def test_reverse(self):
        self.lazy_list.reverse()
        self.assertEqual(self.lazy_list, [3, 2, 1])

    def test_sort(self):
        unsorted_list = LazyList(string="3,1,2", converter=int)
        unsorted_list.sort()
        self.assertEqual(unsorted_list, [1, 2, 3])

    def test_clear(self):
        self.lazy_list.clear()
        self.assertEqual(len(self.lazy_list), 0)

    def test_index(self):
        self.assertEqual(self.lazy_list.index(2), 1)

    def test_count(self):
        self.assertEqual(self.lazy_list.count(2), 1)

    def test_setitem(self):
        self.lazy_list[0] = 4
        self.assertEqual(self.lazy_list[0], 4)

    def test_delitem(self):
        del self.lazy_list[0]
        self.assertEqual(self.lazy_list, [2, 3])

    def test_contains(self):
        self.assertIn(2, self.lazy_list)

    def test_reversed(self):
        self.assertEqual(list(reversed(self.lazy_list)), [3, 2, 1])

    def test_mul(self):
        self.assertEqual(self.lazy_list * 2, [1, 2, 3, 1, 2, 3])

    def test_rmul(self):
        self.assertEqual(2 * self.lazy_list, [1, 2, 3, 1, 2, 3])

    def test_imul(self):
        self.lazy_list *= 2
        self.assertEqual(self.lazy_list, [1, 2, 3, 1, 2, 3])

    def test_extend(self):
        self.lazy_list.extend([4, 5])
        self.assertEqual(self.lazy_list, [1, 2, 3, 4, 5])

    def test_add(self):
        new_list = self.lazy_list + [4, 5]
        self.assertEqual(new_list, [1, 2, 3, 4, 5])

    def test_eq(self):
        self.assertTrue(self.lazy_list == [1, 2, 3])

    def test_iadd(self):
        self.lazy_list += [4, 5]
        self.assertEqual(self.lazy_list, [1, 2, 3, 4, 5])

    def test_gt(self):
        self.assertTrue(self.lazy_list > [1, 2])

    def test_ge(self):
        self.assertTrue(self.lazy_list >= [1, 2, 3])

    def test_lt(self):
        self.assertTrue(self.lazy_list < [1, 2, 3, 4])

    def test_le(self):
        self.assertTrue(self.lazy_list <= [1, 2, 3])

    def test_lazy_list_with_lazy_list(self):
        other_lazy_list = LazyList(string="4,5,6", converter=int)
        combined_list = self.lazy_list + other_lazy_list
        self.assertEqual(combined_list, [1, 2, 3, 4, 5, 6])

    def test_pickle_support(self):
        pickled = pickle.dumps(self.lazy_list)
        unpickled = pickle.loads(pickled)
        self.assertEqual(unpickled, [1, 2, 3])
        self.assertEqual(unpickled._string, "")
        self.assertTrue(unpickled._parsed)

    def test_parse_before_accessing_decorator(self):
        lazy_list_copy = LazyList(string="1,2,3", converter=int)
        lazy_list_copy.append(4)
        self.assertEqual(lazy_list_copy, [1, 2, 3, 4])

    def test_parse_both_before_accessing_decorator(self):
        other_list = LazyList(string="4,5", converter=int)
        result = self.lazy_list + other_list
        self.assertEqual(result, [1, 2, 3, 4, 5])

    def test_length_on_iteration(self):
        elements = []
        for element in self.lazy_list:
            self.assertEqual(len(self.lazy_list), 3)
            elements.append(element)

        self.assertEqual(elements, [1, 2, 3])

    def test_str(self):
        self.assertEqual(str(self.lazy_list), "1,2,3")
        self.assertEqual(self.lazy_list, LazyList(str(self.lazy_list), converter=int))

    def test_str_parsed(self):
        list(self.lazy_list)
        self.assertEqual(str(self.lazy_list), "1,2,3")
        self.assertEqual(self.lazy_list, LazyList(str(self.lazy_list), converter=int))


if __name__ == "__main__":
    unittest.main()


# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

import inspect
import os
import os.path as osp
import shutil
import tempfile

from datumaro.components.extractor import AnnotationType
from datumaro.util import find


def current_function_name(depth=1):
    return inspect.getouterframes(inspect.currentframe())[depth].function

class FileRemover:
    def __init__(self, path, is_dir=False, ignore_errors=False):
        self.path = path
        self.is_dir = is_dir
        self.ignore_errors = ignore_errors

    def __enter__(self):
        return self.path

    # pylint: disable=redefined-builtin
    def __exit__(self, type=None, value=None, traceback=None):
        if self.is_dir:
            shutil.rmtree(self.path, ignore_errors=self.ignore_errors)
        else:
            os.remove(self.path)
    # pylint: enable=redefined-builtin

class TestDir(FileRemover):
    def __init__(self, path=None, ignore_errors=False):
        if path is None:
            path = osp.abspath('temp_%s-' % current_function_name(2))
            path = tempfile.mkdtemp(dir=os.getcwd(), prefix=path)
        else:
            os.makedirs(path, exist_ok=ignore_errors)

        super().__init__(path, is_dir=True, ignore_errors=ignore_errors)

def ann_to_str(ann):
    return vars(ann)

def item_to_str(item):
    return '\n'.join(
        [
            '%s' % vars(item)
        ] + [
            'ann[%s]: %s' % (i, ann_to_str(a))
            for i, a in enumerate(item.annotations)
        ]
    )

def compare_categories(test, expected, actual):
    test.assertEqual(
        sorted(expected, key=lambda t: t.value),
        sorted(actual, key=lambda t: t.value)
    )

    if AnnotationType.label in expected:
        test.assertEqual(
            expected[AnnotationType.label].items,
            actual[AnnotationType.label].items,
        )
    if AnnotationType.mask in expected:
        test.assertEqual(
            expected[AnnotationType.mask].colormap,
            actual[AnnotationType.mask].colormap,
        )
    if AnnotationType.points in expected:
        test.assertEqual(
            expected[AnnotationType.points].items,
            actual[AnnotationType.points].items,
        )

def compare_datasets(test, expected, actual):
    compare_categories(test, expected.categories(), actual.categories())

    test.assertEqual(sorted(expected.subsets()), sorted(actual.subsets()))
    test.assertEqual(len(expected), len(actual))
    for item_a in expected:
        item_b = find(actual, lambda x: x.id == item_a.id and \
            x.subset == item_a.subset)
        test.assertFalse(item_b is None, item_a.id)
        test.assertEqual(item_a.attributes, item_b.attributes)
        test.assertEqual(len(item_a.annotations), len(item_b.annotations))
        for ann_a in item_a.annotations:
            # We might find few corresponding items, so check them all
            ann_b_matches = [x for x in item_b.annotations
                if x.id == ann_a.id and \
                    x.type == ann_a.type and x.group == ann_a.group]
            test.assertFalse(len(ann_b_matches) == 0, 'ann id: %s' % ann_a.id)

            ann_b = find(ann_b_matches, lambda x: x == ann_a)
            test.assertEqual(ann_a, ann_b, 'ann: %s' % ann_to_str(ann_a))
            item_b.annotations.remove(ann_b) # avoid repeats

def compare_datasets_strict(test, expected, actual):
    # Compares datasets for strong equality

    test.assertEqual(expected.categories(), actual.categories())

    test.assertListEqual(sorted(expected.subsets()), sorted(actual.subsets()))
    test.assertEqual(len(expected), len(actual))

    for subset_name in expected.subsets():
        e_subset = expected.get_subset(subset_name)
        a_subset = actual.get_subset(subset_name)
        test.assertEqual(len(e_subset), len(a_subset))
        for idx, (item_a, item_b) in enumerate(zip(e_subset, a_subset)):
            test.assertEqual(item_a, item_b,
                '%s:\n%s\nvs.\n%s\n' % \
                (idx, item_to_str(item_a), item_to_str(item_b)))
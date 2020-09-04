# Copyright (C) 2019-2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

from collections import OrderedDict


_instance = None

DEFAULT_CAPACITY = 2

class ImageCache:
    @staticmethod
    def get_instance():
        global _instance
        if _instance is None:
            _instance = ImageCache()
        return _instance

    def __init__(self, capacity=DEFAULT_CAPACITY):
        self.capacity = int(capacity)
        self.items = OrderedDict()

    def push(self, item_id, image):
        if self.capacity <= len(self.items):
            self.items.popitem(last=True)
        self.items[item_id] = image

    def get(self, item_id):
        default = object()
        item = self.items.get(item_id, default)
        if item is default:
            return None

        self.items.move_to_end(item_id, last=False) # naive splay tree
        return item

    def size(self):
        return len(self.items)

    def clear(self):
        self.items.clear()
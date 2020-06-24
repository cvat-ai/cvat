
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

import yaml


class Schema:
    class Item:
        def __init__(self, ctor, internal=False):
            self.ctor = ctor
            self.internal = internal

        def __call__(self, *args, **kwargs):
            return self.ctor(*args, **kwargs)

    def __init__(self, items=None, fallback=None):
        self._items = {}
        if items is not None:
            self._items.update(items)
        self._fallback = fallback

    def _get_items(self, allow_fallback=True):
        all_items = {}

        if allow_fallback and self._fallback is not None:
            all_items.update(self._fallback)
        all_items.update(self._items)

        return all_items

    def items(self, allow_fallback=True):
        return self._get_items(allow_fallback=allow_fallback).items()

    def keys(self, allow_fallback=True):
        return self._get_items(allow_fallback=allow_fallback).keys()

    def values(self, allow_fallback=True):
        return self._get_items(allow_fallback=allow_fallback).values()

    def __contains__(self, key):
        return key in self.keys()

    def __len__(self):
        return len(self._get_items())

    def __iter__(self):
        return iter(self._get_items())

    def __getitem__(self, key):
        default = object()
        value = self.get(key, default=default)
        if value is default:
            raise KeyError('Key "%s" does not exist' % (key))
        return value

    def get(self, key, default=None):
        found = self._items.get(key, default)
        if found is not default:
            return found

        if self._fallback is not None:
            return self._fallback.get(key, default)

class SchemaBuilder:
    def __init__(self):
        self._items = {}

    def add(self, name, ctor=str, internal=False):
        if name in self._items:
            raise KeyError('Key "%s" already exists' % (name))

        self._items[name] = Schema.Item(ctor, internal=internal)
        return self

    def build(self):
        return Schema(self._items)

class Config:
    def __init__(self, config=None, fallback=None, schema=None, mutable=True):
        # schema should be established first
        self.__dict__['_schema'] = schema
        self.__dict__['_mutable'] = True

        self.__dict__['_config'] = {}
        if fallback is not None:
            for k, v in fallback.items(allow_fallback=False):
                self.set(k, v)
        if config is not None:
            self.update(config)

        self.__dict__['_mutable'] = mutable

    def _items(self, allow_fallback=True, allow_internal=True):
        all_config = {}
        if allow_fallback and self._schema is not None:
            for key, item in self._schema.items():
                all_config[key] = item()
        all_config.update(self._config)

        if not allow_internal and self._schema is not None:
            for key, item in self._schema.items():
                if item.internal:
                    all_config.pop(key)
        return all_config

    def items(self, allow_fallback=True, allow_internal=True):
        return self._items(
                allow_fallback=allow_fallback,
                allow_internal=allow_internal
            ).items()

    def keys(self, allow_fallback=True, allow_internal=True):
        return self._items(
                allow_fallback=allow_fallback,
                allow_internal=allow_internal
            ).keys()

    def values(self, allow_fallback=True, allow_internal=True):
        return self._items(
                allow_fallback=allow_fallback,
                allow_internal=allow_internal
            ).values()

    def __contains__(self, key):
        return key in self.keys()

    def __len__(self):
        return len(self.items())

    def __iter__(self):
        return iter(self.keys())

    def __getitem__(self, key):
        default = object()
        value = self.get(key, default=default)
        if value is default:
            raise KeyError('Key "%s" does not exist' % (key))
        return value

    def __setitem__(self, key, value):
        return self.set(key, value)

    def __getattr__(self, key):
        return self.get(key)

    def __setattr__(self, key, value):
        return self.set(key, value)

    def __eq__(self, other):
        try:
            for k, my_v in self.items(allow_internal=False):
                other_v = other[k]
                if my_v != other_v:
                    return False
            return True
        except Exception:
            return False

    def update(self, other):
        for k, v in other.items():
            self.set(k, v)

    def remove(self, key):
        if not self._mutable:
            raise Exception("Cannot set value of immutable object")

        self._config.pop(key, None)

    def get(self, key, default=None):
        found = self._config.get(key, default)
        if found is not default:
            return found

        if self._schema is not None:
            found = self._schema.get(key, default)
            if found is not default:
                # ignore mutability
                found = found()
                self._config[key] = found
                return found

        return found

    def set(self, key, value):
        if not self._mutable:
            raise Exception("Cannot set value of immutable object")

        if self._schema is not None:
            if key not in self._schema:
                raise Exception("Can not set key '%s' - schema mismatch" % (key))

            schema_entry = self._schema[key]
            schema_entry_instance = schema_entry()
            if not isinstance(value, type(schema_entry_instance)):
                if isinstance(value, dict) and \
                        isinstance(schema_entry_instance, Config):
                    schema_entry_instance.update(value)
                    value = schema_entry_instance
                else:
                    raise Exception("Can not set key '%s' - schema mismatch" % (key))

        self._config[key] = value
        return value

    @staticmethod
    def parse(path):
        with open(path, 'r') as f:
            return Config(yaml.safe_load(f))

    @staticmethod
    def yaml_representer(dumper, value):
        return dumper.represent_data(
            value._items(allow_internal=False, allow_fallback=False))

    def dump(self, path):
        with open(path, 'w+') as f:
            yaml.dump(self, f)

yaml.add_multi_representer(Config, Config.yaml_representer)


class DefaultConfig(Config):
    def __init__(self, default=None):
        super().__init__()
        self.__dict__['_default'] = default

    def set(self, key, value):
        if key not in self.keys(allow_fallback=False):
            value = self._default(value)
            return super().set(key, value)
        else:
            return super().set(key, value)


DEFAULT_FORMAT = 'datumaro'
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

__plugins = {}

def add_plugin(name, function, order):
    if order not in ["before", "after"]:
        raise Exception("Order may be 'before' or 'after' only. Got {}.".format(order))

    if not callable(function):
        raise Exception("'function' argument should be a callable element")

    if not isinstance(name, str):
        raise Exception("'name' argument should be a string. Got {}.".format(type(name)))

    if name not in __plugins:
        __plugins[name] = {
            "before": [],
            "after": []
        }

    if function in __plugins[name][order]:
        raise Exception("plugin already was attached")

    __plugins[name][order].append(function)


def remove_plugin(name, function):
    if name in __plugins:
        if function in __plugins[name]["before"]:
            __plugins[name]["before"].remove(function)
        if function in __plugins[name]["after"]:
            __plugins[name]["after"].remove(function)


def plugin_decorator(function_to_decorate):
    name = function_to_decorate.__name__
    def function_wrapper(*args, **kwargs):
        if name in __plugins:
            for wrapper in __plugins[name]["before"]:
                wrapper(*args, **kwargs)

        result = function_to_decorate(*args, **kwargs)

        if name in __plugins:
            for wrapper in __plugins[name]["after"]:
                wrapper(*args, **kwargs)

        return result

    return function_wrapper
# Copyright (C) 2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import decimal

import orjson
from rest_framework.compat import INDENT_SEPARATORS, LONG_SEPARATORS, SHORT_SEPARATORS
from rest_framework.renderers import JSONRenderer


def dump_json(
    data,
    *,
    sort_keys: bool = False,
    allow_numpy: bool = True,
    indent: bool = False,
    append_newline: bool = False,
) -> bytes:
    flags = 0
    if sort_keys:
        flags |= orjson.OPT_SORT_KEYS
    if allow_numpy:
        flags |= orjson.OPT_SERIALIZE_NUMPY
    if indent:
        flags |= orjson.OPT_INDENT_2
    if append_newline:
        flags |= orjson.OPT_APPEND_NEWLINE

    def custom_type_dumper(v):
        if isinstance(v, decimal.Decimal):
            return str(v)
        raise TypeError(type(v))

    return orjson.dumps(data, default=custom_type_dumper, option=flags)


class OrjsonJSONRenderer(JSONRenderer):
    def render(self, data, accepted_media_type=None, renderer_context=None):
        """
        Render `data` into JSON, returning a bytestring.
        """
        if data is None:
            return b""

        renderer_context = renderer_context or {}
        indent = self.get_indent(accepted_media_type, renderer_context)

        if indent is None:
            separators = SHORT_SEPARATORS if self.compact else LONG_SEPARATORS
        else:
            separators = INDENT_SEPARATORS

        ret = dump_json(data, indent=not self.compact)
        return ret

        # ret = json.dumps(
        #     data, cls=self.encoder_class,
        #     indent=indent, ensure_ascii=self.ensure_ascii,
        #     allow_nan=not self.strict, separators=separators
        # )

        # We always fully escape \u2028 and \u2029 to ensure we output JSON
        # that is a strict javascript subset.
        # See: https://gist.github.com/damncabbage/623b879af56f850a6ddc
        # ret = ret.replace('\u2028', '\\u2028').replace('\u2029', '\\u2029')
        # return ret.encode()


class CVATAPIRenderer(OrjsonJSONRenderer):
    media_type = "application/vnd.cvat+json"

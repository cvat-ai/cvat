# Copyright (C) 2019-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from cvat.apps.engine.label_colors import hex2rgb


def make_colormap(instance_data):
    labels = [label for _, label in instance_data.meta[instance_data.META_FIELD]["labels"]]
    label_names = [label["name"] for label in labels]

    if "background" not in label_names:
        labels.insert(0, {"name": "background", "color": "#000000"})

    return {label["name"]: [hex2rgb(label["color"]), [], []] for label in labels}

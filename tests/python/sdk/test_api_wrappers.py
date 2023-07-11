# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from copy import deepcopy

from cvat_sdk import models
from deepdiff import DeepDiff


def test_models_do_not_change_input_values():
    # Nested containers may be modified during the model input data parsing.
    # This can lead to subtle memory errors, which are very hard to find.
    original_input_data = {
        "name": "test",
        "labels": [
            {
                "name": "cat",
                "attributes": [
                    {
                        "default_value": "yy",
                        "id": 13,
                        "input_type": "text",
                        "mutable": False,
                        "name": "x",
                        "values": ["yy"],
                    },
                    {
                        "default_value": "1",
                        "id": 14,
                        "input_type": "radio",
                        "mutable": False,
                        "name": "y",
                        "values": ["1", "2"],
                    },
                ],
            }
        ],
    }

    input_data = deepcopy(original_input_data)

    models.TaskWriteRequest(**input_data)

    assert DeepDiff(original_input_data, input_data) == {}

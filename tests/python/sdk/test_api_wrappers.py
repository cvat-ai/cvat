# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import pickle
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
                        "input_type": "text",
                        "mutable": False,
                        "name": "x",
                        "values": ["yy"],
                    },
                    {
                        "default_value": "1",
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


def test_models_do_not_store_input_collections():
    # Avoid depending on input data for collection fields after the model is initialized.
    # This can lead to subtle memory errors and unexpected behavior
    # if the original input data is modified.
    input_data = {
        "name": "test",
        "labels": [
            {
                "name": "cat1",
                "attributes": [
                    {
                        "default_value": "yy",
                        "input_type": "text",
                        "mutable": False,
                        "name": "x",
                        "values": ["yy"],
                    },
                    {
                        "default_value": "1",
                        "input_type": "radio",
                        "mutable": False,
                        "name": "y",
                        "values": ["1", "2"],
                    },
                ],
            },
            {"name": "cat2", "attributes": []},
        ],
    }

    model = models.TaskWriteRequest(**input_data)
    model_data1 = model.to_dict()

    # Modify input value containers
    input_data["labels"][0]["attributes"].clear()
    input_data["labels"][1]["attributes"].append(
        {
            "default_value": "",
            "input_type": "text",
            "mutable": True,
            "name": "z",
        }
    )
    input_data["labels"].append({"name": "dog"})

    model_data2 = model.to_dict()

    assert DeepDiff(model_data1, model_data2) == {}


def test_models_do_not_return_internal_collections():
    # Avoid returning internal data for mutable collection fields.
    # This can lead to subtle memory errors and unexpected behavior
    # if the returned data is modified.
    input_data = {
        "name": "test",
        "labels": [],
    }

    model = models.TaskWriteRequest(**input_data)
    model_data1 = model.to_dict()
    model_data1_original = deepcopy(model_data1)

    # Modify an output value container
    model_data1["labels"].append({"name": "dog"})

    model_data2 = model.to_dict()

    assert DeepDiff(model_data1_original, model_data2) == {}


def test_models_are_pickleable():
    model = models.PatchedLabelRequest(id=5, name="person")
    pickled_model = pickle.dumps(model)
    unpickled_model = pickle.loads(pickled_model)

    assert unpickled_model.id == model.id
    assert unpickled_model.name == model.name

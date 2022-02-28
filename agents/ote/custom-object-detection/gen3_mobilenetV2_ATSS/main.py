# Copyright 2022 nmanovic
# 
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
# 
#     http://www.apache.org/licenses/LICENSE-2.0
# 
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import importlib
import os
from uuid import uuid4
from ote_sdk.configuration.helper import create
from ote_sdk.entities.inference_parameters import InferenceParameters
from ote_sdk.entities.model import ModelEntity
from ote_sdk.entities.resultset import ResultSetEntity
from ote_sdk.entities.subset import Subset
from ote_sdk.entities.task_environment import TaskEnvironment
from ote_sdk.entities.train_parameters import TrainParameters
from ote_sdk.usecases.adapters.model_adapter import ModelAdapter
from ote_sdk.entities.model_template import parse_model_template
from mmdet.apis.ote.extension.datasets.data_utils import load_dataset_items_coco_format
from ote_sdk.entities.datasets import DatasetEntity
from ote_sdk.entities.label_schema import LabelSchemaEntity

TASK_ALGO_DIR = os.environ.get('TASK_ALGO_DIR')


def get_impl_class(impl_path):
    """Returns a class by its path in package."""

    task_impl_module_name, task_impl_class_name = impl_path.rsplit(".", 1)
    task_impl_module = importlib.import_module(task_impl_module_name)
    task_impl_class = getattr(task_impl_module, task_impl_class_name)

    return task_impl_class


class ObjectDetectionDataset(DatasetEntity):
    """Class for working with file-system based Object Detection dataset."""

    def __init__(
        self,
        train_subset=None,
        val_subset=None,
        test_subset=None,
    ):

        labels_list = []
        items = []

        if train_subset is not None:
            items.extend(
                load_dataset_items_coco_format(
                    ann_file_path=train_subset["ann_file"],
                    data_root_dir=train_subset["data_root"],
                    subset=Subset.TRAINING,
                    labels_list=labels_list,
                )
            )

        if val_subset is not None:
            items.extend(
                load_dataset_items_coco_format(
                    ann_file_path=val_subset["ann_file"],
                    data_root_dir=val_subset["data_root"],
                    subset=Subset.VALIDATION,
                    labels_list=labels_list,
                )
            )

        if test_subset is not None:
            items.extend(
                load_dataset_items_coco_format(
                    ann_file_path=test_subset["ann_file"],
                    data_root_dir=test_subset["data_root"],
                    subset=Subset.TESTING,
                    labels_list=labels_list,
                )
            )

        super().__init__(items=items)


def main(dataset, experiment_dir, start_from=None):
    if TASK_ALGO_DIR is None:
        raise EnvironmentError('TASK_ALGO_DIR is not available, please read OTE manual')
    if not os.path.isdir(TASK_ALGO_DIR):
        raise FileNotFoundError('TASK_ALGO_DIR is not a directory')

    template = parse_model_template(os.path.join(TASK_ALGO_DIR,
        "configs/ote/custom-object-detection/gen3_mobilenetV2_ATSS/template.yaml"))
    hyper_parameters = create(template.hyper_parameters.data)
    task_class = get_impl_class(template.entrypoints.base)

    environment = TaskEnvironment(
        model=None,
        hyper_parameters=hyper_parameters,
        label_schema=LabelSchemaEntity.from_labels(dataset.get_labels()),
        model_template=template,
    )

    snapshot_dir = start_from_revision
    if snapshot_dir and os.path.exists(snapshot_dir):
        weights = open(os.path.join(snapshot_dir, 'weights.pth'), 'rb')
        environment.model = ModelEntity(
            train_dataset=dataset,
            configuration=environment.get_model_configuration(),
            model_adapters={
                "weights.pth": ModelAdapter(weights)
            },
        )

    task = task_class(task_environment=environment)
    output_model = ModelEntity(dataset, environment.get_model_configuration())
    task.train(dataset, output_model, train_parameters=TrainParameters())

    experiment_dir = revision
    os.makedirs(experiment_dir, exist_ok=True)
    for filename, model_adapter in output_model.model_adapters.items():
        with open(os.path.join(experiment_dir, filename), "wb") as write_file:
            write_file.write(model_adapter.data)

    validation_dataset = dataset.get_subset(Subset.VALIDATION)
    predicted_validation_dataset = task.infer(
        validation_dataset.with_empty_annotations(),
        InferenceParameters(is_evaluation=True),
    )

    resultset = ResultSetEntity(
        model=output_model,
        ground_truth_dataset=validation_dataset,
        prediction_dataset=predicted_validation_dataset,
    )
    task.evaluate(resultset)
    assert resultset.performance is not None
    print(resultset.performance)


if __name__ == "__main__":
    dataset = ObjectDetectionDataset(
        train_subset={
            "ann_file": train_file,
            "data_root": data_root,
        },
        val_subset={
            "ann_file": val_file,
            "data_root": data_root,
        }
    )

    main()

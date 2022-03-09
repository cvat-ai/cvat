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
import shutil
import json
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
from ote_sdk.entities.datasets import DatasetEntity, DatasetItemEntity
from ote_sdk.entities.label_schema import LabelSchemaEntity
from ote_sdk.serialization.label_mapper import LabelSchemaMapper
from ote_sdk.entities.image import Image
from ote_sdk.entities.annotation import AnnotationSceneEntity, AnnotationSceneKind
import cvat_sdk


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

class ObjectDetectionService(cvat_sdk.service.ObjectDetectionService):
    def __init__(self):
        super().__init__()
        if TASK_ALGO_DIR is None:
            raise EnvironmentError('TASK_ALGO_DIR environment variable is not available, '
                'please read OTE manual')
        if not os.path.isdir(TASK_ALGO_DIR):
            raise FileNotFoundError(f'TASK_ALGO_DIR={TASK_ALGO_DIR} is not a directory')
        self.template = parse_model_template(os.path.join(TASK_ALGO_DIR,
            'configs/ote/custom-object-detection/gen3_mobilenetV2_ATSS/template.yaml'))
        self.cvat_api = cvat_sdk.api.create('http://localhost:8080', auth={
            'username': 'admin', 'pass': 'nimda760'})

    @property
    def name(self):
        return self.template.model_template_id

    @property
    def description(self):
        return {
            'summary': self.template.summary,
            'task_type': self.template.task_type.value,
            'task_family': self.template.task_family.value,
            'framework': self.template.framework,
            'gigaflops': self.template.gigaflops,
            'size': self.template.size
        }

    def predict(self, experiment, frame):
        image_path = self.cvat_api.get_image_path(frame)

        hyper_parameters = create(self.template.hyper_parameters.data)
        task_class = get_impl_class(self.template.entrypoints.base)
        serialized_label_schema = json.load(os.path.join(experiment, 'label_schema.json'))
        environment = TaskEnvironment(
            model=None,
            hyper_parameters=hyper_parameters,
            label_schema=LabelSchemaMapper().backward(serialized_label_schema),
            model_template=self.template,
        )

        weights = open(os.path.join(experiment, 'weights.pth'), 'rb')
        environment.model = ModelEntity(
            train_dataset=None,
            configuration=environment.get_model_configuration(),
            model_adapters={
                "weights.pth": ModelAdapter(weights)
            })
        task = task_class(task_environment=environment)

        empty_annotation = AnnotationSceneEntity(
            annotations=[], kind=AnnotationSceneKind.PREDICTION
        )

        item = DatasetItemEntity(
            media=Image(image_path),
            annotation_scene=empty_annotation,
        )

        dataset = DatasetEntity(items=[item])

        predicted_validation_dataset = task.infer(
            dataset,
            InferenceParameters(is_evaluation=True),
        )

        item = predicted_validation_dataset[0]
        annotations = item.get_annotations()


    def clean(self, experiment):
        shutil.rmtree(experiment, ignore_errors=True)

    def cancel(self, experiment):
        self.task.cancel_training()

    def status(self, experiment):
        pass

    def train(self, experiment, project, snapshot=None):
        dataset_dir = self.cvat_api.get_path(project)
        if not os.path.isdir(dataset_dir):
            raise FileNotFoundError(f'dataset_dir={dataset_dir} is not a directory')

        hyper_parameters = create(self.template.hyper_parameters.data)
        task_class = get_impl_class(self.template.entrypoints.base)

        train_anno_file = os.path.join(dataset_dir, 'annotations/instances_train.json')
        val_anno_file = os.path.join(dataset_dir, 'annotations/instances_val.json')
        data_root = os.path.join(dataset_dir, 'images')

        dataset = ObjectDetectionDataset(
            train_subset={
                "ann_file": train_anno_file,
                "data_root": data_root,
            },
            val_subset={
                "ann_file": val_anno_file,
                "data_root": data_root,
            }
        )

        environment = TaskEnvironment(
            model=None,
            hyper_parameters=hyper_parameters,
            label_schema=LabelSchemaEntity.from_labels(dataset.get_labels()),
            model_template=self.template,
        )

        if snapshot and os.path.exists(snapshot):
            weights = open(os.path.join(snapshot, 'weights.pth'), 'rb')
            environment.model = ModelEntity(
                train_dataset=dataset,
                configuration=environment.get_model_configuration(),
                model_adapters={
                    "weights.pth": ModelAdapter(weights)
                },
            )

        self.task = task_class(task_environment=environment)
        output_model = ModelEntity(dataset, environment.get_model_configuration())
        self.task.train(dataset, output_model, train_parameters=TrainParameters())

        os.makedirs(experiment, exist_ok=True)
        for filename, model_adapter in output_model.model_adapters.items():
            with open(os.path.join(experiment, filename), "wb") as write_file:
                write_file.write(model_adapter.data)

        validation_dataset = dataset.get_subset(Subset.VALIDATION)
        predicted_validation_dataset = self.task.infer(
            validation_dataset.with_empty_annotations(),
            InferenceParameters(is_evaluation=True),
        )

        resultset = ResultSetEntity(
            model=output_model,
            ground_truth_dataset=validation_dataset,
            prediction_dataset=predicted_validation_dataset,
        )
        self.task.evaluate(resultset)
        assert resultset.performance is not None

cvat_sdk.service.run(ObjectDetectionService)
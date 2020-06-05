
# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

from datumaro.util.tf_util import import_tf
import_tf() # prevent TF loading and potential interpeter crash

from accuracy_checker.adapters import create_adapter
from accuracy_checker.data_reader import DataRepresentation
from accuracy_checker.launcher import InputFeeder, create_launcher
from accuracy_checker.postprocessor import PostprocessingExecutor
from accuracy_checker.preprocessor import PreprocessingExecutor
from accuracy_checker.utils import extract_image_representations

from datumaro.components.extractor import AnnotationType, LabelCategories

from .representation import import_predictions


class GenericAcLauncher:
    @staticmethod
    def from_config(config):
        launcher = create_launcher(config['launcher'])

        dataset = object()
        dataset.metadata = {}

        adapter_config = config.get('adapter')
        label_config = adapter_config.get('labels')
        if label_config:
            assert isinstance(label_config, (list, dict))
            if isinstance(label_config, list):
                label_config = dict(enumerate(label_config))

            dataset.metadata = {'label_map': {
                int(key): label for key, label in label_config.items()
            }}
        adapter = create_adapter(adapter_config, launcher, dataset)

        preproc_config = config.get('preprocessing')
        preproc = None
        if preproc_config:
            preproc = PreprocessingExecutor(preproc_config,
                dataset_meta=dataset.metadata,
                input_shapes=launcher.inputs_info_for_meta()
            )

        postproc_config = config.get('postprocessing')
        postproc = None
        if postproc_config:
            postproc = PostprocessingExecutor(postproc_config,
                dataset_meta=dataset.metadata,
            )

        return __class__(launcher,
            adapter=adapter, preproc=preproc, postproc=postproc)

    def __init__(self, launcher, adapter=None,
            preproc=None, postproc=None, input_feeder=None):
        self._launcher = launcher
        self._input_feeder = input_feeder or InputFeeder(
            launcher.config.get('inputs', []), launcher.inputs,
            launcher.fit_to_input, launcher.default_layout
        )
        self._adapter = adapter
        self._preproc = preproc
        self._postproc = postproc

        self._input_shape = self._init_input_shape()
        self._categories = self._init_categories()

    def launch(self, inputs):
        batch = [DataRepresentation(inp) for inp in inputs]
        inputs = self._input_feeder.fill_inputs(batch)
        _, batch_meta = extract_image_representations(inputs)

        if self._preproc:
            inputs = self._preproc.process(inputs)

        outputs = self._launcher.predict(inputs, batch_meta)

        if self._adapter:
            outputs = self._adapter.process(outputs,
                [''] * len(batch), # can be None, but it's not expected anywhere
                batch_meta)

        if self._postproc:
            outputs = self._postproc.process(outputs)

        return import_predictions(outputs)

    def categories(self):
        return self._categories

    def preferred_input_size(self):
        if self._input_shape is None:
            return None

        _, _, h, w = self.input_shape
        return (h, w)

    def _init_categories(self):
        if self._adapter is None:
            return None

        label_map = sorted(self._adapter.label_map.items(), key=lambda e: e[0])

        label_cat = LabelCategories()
        for _, label in label_map:
            label_cat.add(label)

        return { AnnotationType.label: label_cat }

    def _init_input_shape(self):
        # An heuristic to determine input shape - use the max input shape
        return max(self._launcher.inputs.values(),
            defult=None, key=lambda s: abs(np.prod(s)))


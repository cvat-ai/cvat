
# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

from datumaro.util.tf_util import import_tf
import_tf() # prevent TF loading and potential interpeter crash

from itertools import groupby

from accuracy_checker.adapters import create_adapter
from accuracy_checker.data_readers import DataRepresentation
from accuracy_checker.launcher import InputFeeder, create_launcher
from accuracy_checker.postprocessor import PostprocessingExecutor
from accuracy_checker.preprocessor import PreprocessingExecutor
from accuracy_checker.utils import extract_image_representations

from datumaro.components.extractor import AnnotationType, LabelCategories

from .representation import import_predictions


class _FakeDataset:
    def __init__(self, metadata=None):
        self.metadata = metadata or {}

class GenericAcLauncher:
    @staticmethod
    def from_config(config):
        launcher_config = config['launcher']
        launcher = create_launcher(launcher_config)

        dataset = _FakeDataset()
        adapter_config = config.get('adapter') or launcher_config.get('adapter')
        label_config = adapter_config.get('labels') \
            if isinstance(adapter_config, dict) else None
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

        self._categories = self._init_categories()

    def launch_raw(self, inputs):
        ids = range(len(inputs))
        inputs = [DataRepresentation(inp, identifier=id)
            for id, inp in zip(ids, inputs)]
        _, batch_meta = extract_image_representations(inputs)

        if self._preproc:
            inputs = self._preproc.process(inputs)

        inputs = self._input_feeder.fill_inputs(inputs)
        outputs = self._launcher.predict(inputs, batch_meta)

        if self._adapter:
            outputs = self._adapter.process(outputs, ids, batch_meta)

        if self._postproc:
            outputs = self._postproc.process(outputs)

        return outputs

    def launch(self, inputs):
        outputs = self.launch_raw(inputs)
        return [import_predictions(g) for _, g in
            groupby(outputs, key=lambda o: o.identifier)]

    def categories(self):
        return self._categories

    def _init_categories(self):
        if self._adapter is None or self._adapter.label_map is None:
            return None

        label_map = sorted(self._adapter.label_map.items(), key=lambda e: e[0])

        label_cat = LabelCategories()
        for _, label in label_map:
            label_cat.add(label)

        return { AnnotationType.label: label_cat }

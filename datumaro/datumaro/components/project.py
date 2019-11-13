
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

from collections import OrderedDict, defaultdict
import git
import importlib
from functools import reduce
import logging as log
import os
import os.path as osp
import sys

from datumaro.components.config import Config, DEFAULT_FORMAT
from datumaro.components.config_model import *
from datumaro.components.extractor import *
from datumaro.components.launcher import *
from datumaro.components.dataset_filter import XPathDatasetFilter


def import_foreign_module(name, path):
    module = None
    default_path = sys.path.copy()
    try:
        sys.path = [ osp.abspath(path), ] + default_path
        sys.modules.pop(name, None) # remove from cache
        module = importlib.import_module(name)
        sys.modules.pop(name) # remove from cache
    except ImportError as e:
        log.warn("Failed to import module '%s': %s" % (name, e))
    finally:
        sys.path = default_path
    return module


class Registry:
    def __init__(self, config=None, item_type=None):
        self.item_type = item_type

        self.items = {}

        if config is not None:
            self.load(config)

    def load(self, config):
        pass

    def register(self, name, value):
        if self.item_type:
            value = self.item_type(value)
        self.items[name] = value
        return value

    def unregister(self, name):
        return self.items.pop(name, None)

    def get(self, key):
        return self.items[key] # returns a class / ctor


class ModelRegistry(Registry):
    def __init__(self, config=None):
        super().__init__(config, item_type=Model)

    def load(self, config):
        # TODO: list default dir, insert values
        if 'models' in config:
            for name, model in config.models.items():
                self.register(name, model)


class SourceRegistry(Registry):
    def __init__(self, config=None):
        super().__init__(config, item_type=Source)

    def load(self, config):
        # TODO: list default dir, insert values
        if 'sources' in config:
            for name, source in config.sources.items():
                self.register(name, source)


class ModuleRegistry(Registry):
    def __init__(self, config=None, builtin=None, local=None):
        super().__init__(config)

        if builtin is not None:
            for k, v in builtin:
                self.register(k, v)
        if local is not None:
            for k, v in local:
                self.register(k, v)


class GitWrapper:
    def __init__(self, config=None):
        self.repo = None

        if config is not None:
            self.init(config.project_dir)

    @staticmethod
    def _git_dir(base_path):
        return osp.join(base_path, '.git')

    def init(self, path):
        spawn = not osp.isdir(GitWrapper._git_dir(path))
        self.repo = git.Repo.init(path=path)
        if spawn:
            author = git.Actor("Nobody", "nobody@example.com")
            self.repo.index.commit('Initial commit', author=author)
        return self.repo

    def get_repo(self):
        return self.repo

    def is_initialized(self):
        return self.repo is not None

    def create_submodule(self, name, dst_dir, **kwargs):
        self.repo.create_submodule(name, dst_dir, **kwargs)

    def has_submodule(self, name):
        return name in [submodule.name for submodule in self.repo.submodules]

    def remove_submodule(self, name, **kwargs):
        return self.repo.submodule(name).remove(**kwargs)

def load_project_as_dataset(url):
    # symbol forward declaration
    raise NotImplementedError()

class Environment:
    PROJECT_EXTRACTOR_NAME = 'project'

    def __init__(self, config=None):
        config = Config(config,
            fallback=PROJECT_DEFAULT_CONFIG, schema=PROJECT_SCHEMA)

        env_dir = osp.join(config.project_dir, config.env_dir)
        env_config_path = osp.join(env_dir, config.env_filename)
        env_config = Config(fallback=ENV_DEFAULT_CONFIG, schema=ENV_SCHEMA)
        if osp.isfile(env_config_path):
            env_config.update(Config.parse(env_config_path))

        self.config = env_config

        self.models = ModelRegistry(env_config)
        self.sources = SourceRegistry(config)

        import datumaro.components.importers as builtin_importers
        builtin_importers = builtin_importers.items
        custom_importers = self._get_custom_module_items(
            env_dir, env_config.importers_dir)
        self.importers = ModuleRegistry(config,
            builtin=builtin_importers, local=custom_importers)

        import datumaro.components.extractors as builtin_extractors
        builtin_extractors = builtin_extractors.items
        custom_extractors = self._get_custom_module_items(
            env_dir, env_config.extractors_dir)
        self.extractors = ModuleRegistry(config,
            builtin=builtin_extractors, local=custom_extractors)
        self.extractors.register(self.PROJECT_EXTRACTOR_NAME,
            load_project_as_dataset)

        import datumaro.components.launchers as builtin_launchers
        builtin_launchers = builtin_launchers.items
        custom_launchers = self._get_custom_module_items(
            env_dir, env_config.launchers_dir)
        self.launchers = ModuleRegistry(config,
            builtin=builtin_launchers, local=custom_launchers)

        import datumaro.components.converters as builtin_converters
        builtin_converters = builtin_converters.items
        custom_converters = self._get_custom_module_items(
            env_dir, env_config.converters_dir)
        if custom_converters is not None:
            custom_converters = custom_converters.items
        self.converters = ModuleRegistry(config,
            builtin=builtin_converters, local=custom_converters)

        self.statistics = ModuleRegistry(config)
        self.visualizers = ModuleRegistry(config)
        self.git = GitWrapper(config)

    def _get_custom_module_items(self, module_dir, module_name):
        items = None

        module = None
        if osp.exists(osp.join(module_dir, module_name)):
            module = import_foreign_module(module_name, module_dir)
        if module is not None:
            if hasattr(module, 'items'):
                items = module.items
            else:
                items = self._find_custom_module_items(
                    osp.join(module_dir, module_name))

        return items

    @staticmethod
    def _find_custom_module_items(module_dir):
        files = [p for p in os.listdir(module_dir)
            if p.endswith('.py') and p != '__init__.py']

        all_items = []
        for f in files:
            name = osp.splitext(f)[0]
            module = import_foreign_module(name, module_dir)

            items = []
            if hasattr(module, 'items'):
                items = module.items
            else:
                if hasattr(module, name):
                    items = [ (name, getattr(module, name)) ]
                else:
                    log.warn("Failed to import custom module '%s'."
                        " Custom module is expected to provide 'items' "
                        "list or have an item matching its file name."
                        " Skipping this module." % \
                        (module_dir + '.' + name))

            all_items.extend(items)

        return all_items

    def save(self, path):
        self.config.dump(path)

    def make_extractor(self, name, *args, **kwargs):
        return self.extractors.get(name)(*args, **kwargs)

    def make_importer(self, name, *args, **kwargs):
        return self.importers.get(name)(*args, **kwargs)

    def make_launcher(self, name, *args, **kwargs):
        return self.launchers.get(name)(*args, **kwargs)

    def make_converter(self, name, *args, **kwargs):
        return self.converters.get(name)(*args, **kwargs)

    def register_model(self, name, model):
        self.config.models[name] = model
        self.models.register(name, model)

    def unregister_model(self, name):
        self.config.models.remove(name)
        self.models.unregister(name)


class Subset(Extractor):
    def __init__(self, parent):
        self._parent = parent
        self.items = OrderedDict()

    def __iter__(self):
        for item in self.items.values():
            yield item

    def __len__(self):
        return len(self.items)

    def categories(self):
        return self._parent.categories()

class DatasetItemWrapper(DatasetItem):
    def __init__(self, item, path, annotations, image=None):
        self._item = item
        self._path = path
        self._annotations = annotations
        self._image = image

    @DatasetItem.id.getter
    def id(self):
        return self._item.id

    @DatasetItem.subset.getter
    def subset(self):
        return self._item.subset

    @DatasetItem.path.getter
    def path(self):
        return self._path

    @DatasetItem.annotations.getter
    def annotations(self):
        return self._annotations

    @DatasetItem.has_image.getter
    def has_image(self):
        if self._image is not None:
            return True
        return self._item.has_image

    @DatasetItem.image.getter
    def image(self):
        if self._image is not None:
            if callable(self._image):
                return self._image()
            return self._image
        return self._item.image

class ProjectDataset(Extractor):
    def __init__(self, project):
        super().__init__()

        self._project = project
        config = self.config
        env = self.env

        dataset_filter = None
        if config.filter:
            dataset_filter = XPathDatasetFilter(config.filter)
        self._filter = dataset_filter

        sources = {}
        for s_name, source in config.sources.items():
            s_format = source.format
            if not s_format:
                s_format = env.PROJECT_EXTRACTOR_NAME
            options = {}
            options.update(source.options)

            url = source.url
            if not source.url:
                url = osp.join(config.project_dir, config.sources_dir, s_name)
            sources[s_name] = env.make_extractor(s_format,
                url, **options)
        self._sources = sources

        own_source = None
        own_source_dir = osp.join(config.project_dir, config.dataset_dir)
        if osp.isdir(own_source_dir):
            own_source = env.make_extractor(DEFAULT_FORMAT, own_source_dir)

        # merge categories
        # TODO: implement properly with merging and annotations remapping
        categories = {}
        for source in self._sources.values():
            categories.update(source.categories())
        for source in self._sources.values():
            for cat_type, source_cat in source.categories().items():
                assert categories[cat_type] == source_cat
        if own_source is not None and len(own_source) != 0:
            categories.update(own_source.categories())
        self._categories = categories

        # merge items
        subsets = defaultdict(lambda: Subset(self))
        for source_name, source in self._sources.items():
            for item in source:
                if dataset_filter and not dataset_filter(item):
                    continue

                existing_item = subsets[item.subset].items.get(item.id)
                if existing_item is not None:
                    image = None
                    if existing_item.has_image:
                        # TODO: think of image comparison
                        image = lambda: existing_item.image

                    path = existing_item.path
                    if item.path != path:
                        path = None
                    item = DatasetItemWrapper(item=item, path=path,
                        image=image, annotations=self._merge_anno(
                            existing_item.annotations, item.annotations))
                else:
                    s_config = config.sources[source_name]
                    if s_config and \
                            s_config.format != self.env.PROJECT_EXTRACTOR_NAME:
                        # NOTE: consider imported sources as our own dataset
                        path = None
                    else:
                        path = item.path
                        if path is None:
                            path = []
                        path = [source_name] + path
                    item = DatasetItemWrapper(item=item, path=path,
                        annotations=item.annotations)

                subsets[item.subset].items[item.id] = item

        # override with our items, fallback to existing images
        if own_source is not None:
            for item in own_source:
                if dataset_filter and not dataset_filter(item):
                    continue

                if not item.has_image:
                    existing_item = subsets[item.subset].items.get(item.id)
                    if existing_item is not None:
                        image = None
                        if existing_item.has_image:
                            # TODO: think of image comparison
                            image = lambda: existing_item.image
                        item = DatasetItemWrapper(item=item, path=None,
                            annotations=item.annotations, image=image)

                subsets[item.subset].items[item.id] = item

        # TODO: implement subset remapping when needed
        subsets_filter = config.subsets
        if len(subsets_filter) != 0:
            subsets = { k: v for k, v in subsets.items() if k in subsets_filter}
        self._subsets = dict(subsets)

        self._length = None

    @staticmethod
    def _merge_anno(a, b):
        from itertools import chain
        merged = []
        for item in chain(a, b):
            found = False
            for elem in merged:
                if elem == item:
                    found = True
                    break
            if not found:
                merged.append(item)

        return merged

    def iterate_own(self):
        return self.select(lambda item: not item.path)

    def __iter__(self):
        for subset in self._subsets.values():
            for item in subset:
                if self._filter and not self._filter(item):
                    continue
                yield item

    def __len__(self):
        if self._length is None:
            self._length = reduce(lambda s, x: s + len(x),
                self._subsets.values(), 0)
        return self._length

    def get_subset(self, name):
        return self._subsets[name]

    def subsets(self):
        return list(self._subsets)

    def categories(self):
        return self._categories

    def define_categories(self, categories):
        assert not self._categories
        self._categories = categories

    def get(self, item_id, subset=None, path=None):
        if path:
            source = path[0]
            rest_path = path[1:]
            return self._sources[source].get(
                item_id=item_id, subset=subset, path=rest_path)
        return self._subsets[subset].items[item_id]

    def put(self, item, item_id=None, subset=None, path=None):
        if path is None:
            path = item.path
        if path:
            source = path[0]
            rest_path = path[1:]
            # TODO: reverse remapping
            self._sources[source].put(item,
                item_id=item_id, subset=subset, path=rest_path)

        if item_id is None:
            item_id = item.id
        if subset is None:
            subset = item.subset

        item = DatasetItemWrapper(item=item, path=path,
            annotations=item.annotations)
        if item.subset not in self._subsets:
            self._subsets[item.subset] = Subset(self)
        self._subsets[subset].items[item_id] = item
        self._length = None

        return item

    def build(self, tasks=None):
        pass

    def docs(self):
        pass

    def transform(self, model_name, save_dir=None):
        project = Project(self.config)
        project.config.remove('sources')

        if save_dir is None:
            save_dir = self.config.project_dir
        project.config.project_dir = save_dir

        dataset = project.make_dataset()
        launcher = self._project.make_executable_model(model_name)
        inference = InferenceWrapper(self, launcher)
        dataset.update(inference)

        dataset.save(merge=True)

    def export(self, save_dir, output_format,
            filter_expr=None, **converter_kwargs):
        save_dir = osp.abspath(save_dir)
        os.makedirs(save_dir, exist_ok=True)

        dataset = self
        if filter_expr:
            dataset_filter = XPathDatasetFilter(filter_expr)
            dataset = dataset.select(dataset_filter)

        converter = self.env.make_converter(output_format, **converter_kwargs)
        converter(dataset, save_dir)

    def extract(self, save_dir, filter_expr=None):
        project = Project(self.config)
        if filter_expr:
            XPathDatasetFilter(filter_expr)
            project.set_filter(filter_expr)
        project.save(save_dir)

    def update(self, items):
        for item in items:
            if self._filter and not self._filter(item):
                continue
            self.put(item)
        return self

    def save(self, save_dir=None, merge=False, recursive=True,
            save_images=False, apply_colormap=True):
        if save_dir is None:
            assert self.config.project_dir
            save_dir = self.config.project_dir
            project = self._project
        else:
            merge = True

        if merge:
            project = Project(Config(self.config))
            project.config.remove('sources')

        save_dir = osp.abspath(save_dir)
        os.makedirs(save_dir, exist_ok=True)

        dataset_save_dir = osp.join(save_dir, project.config.dataset_dir)
        os.makedirs(dataset_save_dir, exist_ok=True)

        converter_kwargs = {
            'save_images': save_images,
            'apply_colormap': apply_colormap,
        }

        if merge:
            # merge and save the resulting dataset
            converter = self.env.make_converter(
                DEFAULT_FORMAT, **converter_kwargs)
            converter(self, dataset_save_dir)
        else:
            if recursive:
                # children items should already be updated
                # so we just save them recursively
                for source in self._sources.values():
                    if isinstance(source, ProjectDataset):
                        source.save(**converter_kwargs)

            converter = self.env.make_converter(
                DEFAULT_FORMAT, **converter_kwargs)
            converter(self.iterate_own(), dataset_save_dir)

        project.save(save_dir)

    @property
    def env(self):
        return self._project.env

    @property
    def config(self):
        return self._project.config

    @property
    def sources(self):
        return self._sources

class Project:
    @staticmethod
    def load(path):
        path = osp.abspath(path)
        if osp.isdir(path):
            path = osp.join(path, PROJECT_DEFAULT_CONFIG.project_filename)
        config = Config.parse(path)
        config.project_dir = osp.dirname(path)
        config.project_filename = osp.basename(path)
        return Project(config)

    def save(self, save_dir=None):
        config = self.config
        if save_dir is None:
            assert config.project_dir
            save_dir = osp.abspath(config.project_dir)
        config_path = osp.join(save_dir, config.project_filename)

        env_dir = osp.join(save_dir, config.env_dir)
        os.makedirs(env_dir, exist_ok=True)
        self.env.save(osp.join(env_dir, config.env_filename))

        config.dump(config_path)

    @staticmethod
    def generate(save_dir, config=None):
        project = Project(config)
        project.save(save_dir)
        project.config.project_dir = save_dir
        return project

    @staticmethod
    def import_from(path, dataset_format, env=None, **kwargs):
        if env is None:
            env = Environment()
        importer = env.make_importer(dataset_format)
        return importer(path, **kwargs)

    def __init__(self, config=None):
        self.config = Config(config,
            fallback=PROJECT_DEFAULT_CONFIG, schema=PROJECT_SCHEMA)
        self.env = Environment(self.config)

    def make_dataset(self):
        return ProjectDataset(self)

    def add_source(self, name, value=Source()):
        if isinstance(value, (dict, Config)):
            value = Source(value)
        self.config.sources[name] = value
        self.env.sources.register(name, value)

    def remove_source(self, name):
        self.config.sources.remove(name)
        self.env.sources.unregister(name)

    def get_source(self, name):
        return self.config.sources[name]

    def get_subsets(self):
        return self.config.subsets

    def set_subsets(self, value):
        if not value:
            self.config.remove('subsets')
        else:
            self.config.subsets = value

    def add_model(self, name, value=Model()):
        if isinstance(value, (dict, Config)):
            value = Model(value)
        self.env.register_model(name, value)

    def get_model(self, name):
        return self.env.models.get(name)

    def remove_model(self, name):
        self.env.unregister_model(name)

    def make_executable_model(self, name):
        model = self.get_model(name)
        model.model_dir = self.local_model_dir(name)
        return self.env.make_launcher(model.launcher,
            **model.options, model_dir=model.model_dir)

    def make_source_project(self, name):
        source = self.get_source(name)

        config = Config(self.config)
        config.remove('sources')
        config.remove('subsets')
        config.remove('filter')
        project = Project(config)
        project.add_source(name, source)
        return project

    def get_filter(self):
        if 'filter' in self.config:
            return self.config.filter
        return ''

    def set_filter(self, value=None):
        if not value:
            self.config.remove('filter')
        else:
            # check filter
            XPathDatasetFilter(value)
            self.config.filter = value

    def local_model_dir(self, model_name):
        return osp.join(
            self.config.env_dir, self.env.config.models_dir, model_name)

    def local_source_dir(self, source_name):
        return osp.join(self.config.sources_dir, source_name)

def load_project_as_dataset(url):
    # implement the function declared above
    return Project.load(url).make_dataset()
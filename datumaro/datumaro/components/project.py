
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

from collections import OrderedDict, defaultdict
from functools import reduce
import git
from glob import glob
import importlib
import inspect
import logging as log
import os
import os.path as osp
import sys

from datumaro.components.config import Config, DEFAULT_FORMAT
from datumaro.components.config_model import *
from datumaro.components.extractor import DatasetItem, Extractor
from datumaro.components.launcher import InferenceWrapper
from datumaro.components.dataset_filter import \
    XPathDatasetFilter, XPathAnnotationsFilter


def import_foreign_module(name, path, package=None):
    module = None
    default_path = sys.path.copy()
    try:
        sys.path = [ osp.abspath(path), ] + default_path
        sys.modules.pop(name, None) # remove from cache
        module = importlib.import_module(name, package=package)
        sys.modules.pop(name) # remove from cache
    except Exception:
        raise
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

class PluginRegistry(Registry):
    def __init__(self, config=None, builtin=None, local=None):
        super().__init__(config)

        from datumaro.components.cli_plugin import CliPlugin

        if builtin is not None:
            for v in builtin:
                k = CliPlugin._get_name(v)
                self.register(k, v)
        if local is not None:
            for v in local:
                k = CliPlugin._get_name(v)
                self.register(k, v)

class GitWrapper:
    def __init__(self, config=None):
        self.repo = None

        if config is not None and osp.isdir(config.project_dir):
            self.init(config.project_dir)

    @staticmethod
    def _git_dir(base_path):
        return osp.join(base_path, '.git')

    @classmethod
    def spawn(cls, path):
        spawn = not osp.isdir(cls._git_dir(path))
        repo = git.Repo.init(path=path)
        if spawn:
            author = git.Actor("Nobody", "nobody@example.com")
            repo.index.commit('Initial commit', author=author)
        return repo

    def init(self, path):
        self.repo = self.spawn(path)
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
    _builtin_plugins = None
    PROJECT_EXTRACTOR_NAME = 'project'

    def __init__(self, config=None):
        config = Config(config,
            fallback=PROJECT_DEFAULT_CONFIG, schema=PROJECT_SCHEMA)

        self.models = ModelRegistry(config)
        self.sources = SourceRegistry(config)

        self.git = GitWrapper(config)

        env_dir = osp.join(config.project_dir, config.env_dir)
        builtin = self._load_builtin_plugins()
        custom = self._load_plugins2(osp.join(env_dir, config.plugins_dir))
        select = lambda seq, t: [e for e in seq if issubclass(e, t)]
        from datumaro.components.extractor import Transform
        from datumaro.components.extractor import SourceExtractor
        from datumaro.components.extractor import Importer
        from datumaro.components.converter import Converter
        from datumaro.components.launcher import Launcher
        self.extractors = PluginRegistry(
            builtin=select(builtin, SourceExtractor),
            local=select(custom, SourceExtractor)
        )
        self.extractors.register(self.PROJECT_EXTRACTOR_NAME,
            load_project_as_dataset)

        self.importers = PluginRegistry(
            builtin=select(builtin, Importer),
            local=select(custom, Importer)
        )
        self.launchers = PluginRegistry(
            builtin=select(builtin, Launcher),
            local=select(custom, Launcher)
        )
        self.converters = PluginRegistry(
            builtin=select(builtin, Converter),
            local=select(custom, Converter)
        )
        self.transforms = PluginRegistry(
            builtin=select(builtin, Transform),
            local=select(custom, Transform)
        )

    @staticmethod
    def _find_plugins(plugins_dir):
        plugins = []
        if not osp.exists(plugins_dir):
            return plugins

        for plugin_name in os.listdir(plugins_dir):
            p = osp.join(plugins_dir, plugin_name)
            if osp.isfile(p) and p.endswith('.py'):
                plugins.append((plugins_dir, plugin_name, None))
            elif osp.isdir(p):
                plugins += [(plugins_dir,
                        osp.splitext(plugin_name)[0] + '.' + osp.basename(p),
                        osp.splitext(plugin_name)[0]
                    )
                    for p in glob(osp.join(p, '*.py'))]
        return plugins

    @classmethod
    def _import_module(cls, module_dir, module_name, types, package=None):
        module = import_foreign_module(osp.splitext(module_name)[0], module_dir,
            package=package)

        exports = []
        if hasattr(module, 'exports'):
            exports = module.exports
        else:
            for symbol in dir(module):
                if symbol.startswith('_'):
                    continue
                exports.append(getattr(module, symbol))

        exports = [s for s in exports
            if inspect.isclass(s) and issubclass(s, types) and not s in types]

        return exports

    @classmethod
    def _load_plugins(cls, plugins_dir, types):
        types = tuple(types)

        plugins = cls._find_plugins(plugins_dir)

        all_exports = []
        for module_dir, module_name, package in plugins:
            try:
                exports = cls._import_module(module_dir, module_name, types,
                    package)
            except ImportError as e:
                log.debug("Failed to import module '%s': %s" % (module_name, e))
                continue

            log.debug("Imported the following symbols from %s: %s" % \
                (
                    module_name,
                    ', '.join(s.__name__ for s in exports)
                )
            )
            all_exports.extend(exports)

        return all_exports

    @classmethod
    def _load_builtin_plugins(cls):
        if not cls._builtin_plugins:
            plugins_dir = osp.join(
                __file__[: __file__.rfind(osp.join('datumaro', 'components'))],
                osp.join('datumaro', 'plugins')
            )
            assert osp.isdir(plugins_dir), plugins_dir
            cls._builtin_plugins = cls._load_plugins2(plugins_dir)
        return cls._builtin_plugins

    @classmethod
    def _load_plugins2(cls, plugins_dir):
        from datumaro.components.extractor import Transform
        from datumaro.components.extractor import SourceExtractor
        from datumaro.components.extractor import Importer
        from datumaro.components.converter import Converter
        from datumaro.components.launcher import Launcher
        types = [SourceExtractor, Converter, Importer, Launcher, Transform]

        return cls._load_plugins(plugins_dir, types)

    def make_extractor(self, name, *args, **kwargs):
        return self.extractors.get(name)(*args, **kwargs)

    def make_importer(self, name, *args, **kwargs):
        return self.importers.get(name)(*args, **kwargs)

    def make_launcher(self, name, *args, **kwargs):
        return self.launchers.get(name)(*args, **kwargs)

    def make_converter(self, name, *args, **kwargs):
        return self.converters.get(name)(*args, **kwargs)

    def register_model(self, name, model):
        self.models.register(name, model)

    def unregister_model(self, name):
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
        if path is None:
            path = []
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

class Dataset(Extractor):
    @classmethod
    def from_extractors(cls, *sources):
        # merge categories
        # TODO: implement properly with merging and annotations remapping
        categories = {}
        for source in sources:
            categories.update(source.categories())
        for source in sources:
            for cat_type, source_cat in source.categories().items():
                if not categories[cat_type] == source_cat:
                    raise NotImplementedError(
                        "Merging different categories is not implemented yet")
        dataset = Dataset(categories=categories)

        # merge items
        subsets = defaultdict(lambda: Subset(dataset))
        for source in sources:
            for item in source:
                path = None # NOTE: merge everything into our own dataset

                existing_item = subsets[item.subset].items.get(item.id)
                if existing_item is not None:
                    image = None
                    if existing_item.has_image:
                        # TODO: think of image comparison
                        image = cls._lazy_image(existing_item)

                    item = DatasetItemWrapper(item=item, path=path,
                        image=image, annotations=self._merge_anno(
                            existing_item.annotations, item.annotations))
                else:
                    item = DatasetItemWrapper(item=item, path=path,
                        annotations=item.annotations)

                subsets[item.subset].items[item.id] = item

        self._subsets = dict(subsets)

    def __init__(self, categories=None):
        super().__init__()

        self._subsets = {}

        if not categories:
            categories = {}
        self._categories = categories

    def __iter__(self):
        for subset in self._subsets.values():
            for item in subset:
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

    def get(self, item_id, subset=None, path=None):
        if path:
            raise KeyError("Requested dataset item path is not found")
        return self._subsets[subset].items[item_id]

    def put(self, item, item_id=None, subset=None, path=None):
        if path:
            raise KeyError("Requested dataset item path is not found")

        if item_id is None:
            item_id = item.id
        if subset is None:
            subset = item.subset

        item = DatasetItemWrapper(item=item, path=None,
            annotations=item.annotations)
        if item.subset not in self._subsets:
            self._subsets[item.subset] = Subset(self)
        self._subsets[subset].items[item_id] = item
        self._length = None

        return item

    def extract(self, filter_expr, filter_annotations=False, remove_empty=False):
        if filter_annotations:
            return self.transform(XPathAnnotationsFilter, filter_expr,
                remove_empty)
        else:
            return self.transform(XPathDatasetFilter, filter_expr)

    def update(self, items):
        for item in items:
            self.put(item)
        return self

    def define_categories(self, categories):
        assert not self._categories
        self._categories = categories

    @staticmethod
    def _lazy_image(item):
        # NOTE: avoid https://docs.python.org/3/faq/programming.html#why-do-lambdas-defined-in-a-loop-with-different-values-all-return-the-same-result
        return lambda: item.image

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

class ProjectDataset(Dataset):
    def __init__(self, project):
        super().__init__()

        self._project = project
        config = self.config
        env = self.env

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
        if config.project_dir and osp.isdir(own_source_dir):
            log.disable(log.INFO)
            own_source = env.make_importer(DEFAULT_FORMAT)(own_source_dir) \
                .make_dataset()
            log.disable(log.NOTSET)

        # merge categories
        # TODO: implement properly with merging and annotations remapping
        categories = {}
        for source in self._sources.values():
            categories.update(source.categories())
        for source in self._sources.values():
            for cat_type, source_cat in source.categories().items():
                if not categories[cat_type] == source_cat:
                    raise NotImplementedError(
                        "Merging different categories is not implemented yet")
        if own_source is not None and len(own_source) != 0:
            categories.update(own_source.categories())
        self._categories = categories

        # merge items
        subsets = defaultdict(lambda: Subset(self))
        for source_name, source in self._sources.items():
            log.debug("Loading '%s' source contents..." % source_name)
            for item in source:
                existing_item = subsets[item.subset].items.get(item.id)
                if existing_item is not None:
                    image = None
                    if existing_item.has_image:
                        # TODO: think of image comparison
                        image = self._lazy_image(existing_item)

                    path = existing_item.path
                    if item.path != path:
                        path = None # NOTE: move to our own dataset
                    item = DatasetItemWrapper(item=item, path=path,
                        image=image, annotations=self._merge_anno(
                            existing_item.annotations, item.annotations))
                else:
                    s_config = config.sources[source_name]
                    if s_config and \
                            s_config.format != env.PROJECT_EXTRACTOR_NAME:
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
            log.debug("Loading own dataset...")
            for item in own_source:
                if not item.has_image:
                    existing_item = subsets[item.subset].items.get(item.id)
                    if existing_item is not None:
                        image = None
                        if existing_item.has_image:
                            # TODO: think of image comparison
                            image = self._lazy_image(existing_item)
                        item = DatasetItemWrapper(item=item, path=None,
                            annotations=item.annotations, image=image)

                subsets[item.subset].items[item.id] = item

        # TODO: implement subset remapping when needed
        subsets_filter = config.subsets
        if len(subsets_filter) != 0:
            subsets = { k: v for k, v in subsets.items() if k in subsets_filter}
        self._subsets = dict(subsets)

        self._length = None

    def iterate_own(self):
        return self.select(lambda item: not item.path)

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

    def save(self, save_dir=None, merge=False, recursive=True,
            save_images=False):
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

    def _save_branch_project(self, extractor, save_dir=None):
        # NOTE: probably this function should be in the ViewModel layer
        save_dir = osp.abspath(save_dir)
        if save_dir:
            dst_project = Project()
        else:
            if not self.config.project_dir:
                raise Exception("Either a save directory or a project "
                    "directory should be specified")
            save_dir = self.config.project_dir

            dst_project = Project(Config(self.config))
            dst_project.config.remove('project_dir')
            dst_project.config.remove('sources')
        dst_project.config.project_name = osp.basename(save_dir)

        dst_dataset = dst_project.make_dataset()
        dst_dataset.define_categories(extractor.categories())
        dst_dataset.update(extractor)

        dst_dataset.save(save_dir=save_dir, merge=True)

    def transform_project(self, method, save_dir=None, **method_kwargs):
        # NOTE: probably this function should be in the ViewModel layer
        if isinstance(method, str):
            method = self.env.make_transform(method)

        transformed = self.transform(method, **method_kwargs)
        self._save_branch_project(transformed, save_dir=save_dir)

    def apply_model(self, model, save_dir=None, batch_size=1):
        # NOTE: probably this function should be in the ViewModel layer
        if isinstance(model, str):
            launcher = self._project.make_executable_model(model)

        self.transform_project(InferenceWrapper, launcher=launcher,
            save_dir=save_dir, batch_size=batch_size)

    def export_project(self, save_dir, converter,
            filter_expr=None, filter_annotations=False, remove_empty=False):
        # NOTE: probably this function should be in the ViewModel layer
        save_dir = osp.abspath(save_dir)
        os.makedirs(save_dir, exist_ok=True)

        dataset = self
        if filter_expr:
            dataset = dataset.extract(filter_expr,
                filter_annotations=filter_annotations,
                remove_empty=remove_empty)

        converter(dataset, save_dir)

    def extract_project(self, filter_expr, filter_annotations=False,
            save_dir=None, remove_empty=False):
        # NOTE: probably this function should be in the ViewModel layer
        filtered = self
        if filter_expr:
            filtered = self.extract(filter_expr,
                filter_annotations=filter_annotations,
                remove_empty=remove_empty)
        self._save_branch_project(filtered, save_dir=save_dir)

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
        os.makedirs(save_dir, exist_ok=True)
        config_path = osp.join(save_dir, config.project_filename)
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
        try:
            return self.config.sources[name]
        except KeyError:
            raise KeyError("Source '%s' is not found" % name)

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
        self.config.models[name] = value

    def get_model(self, name):
        try:
            return self.env.models.get(name)
        except KeyError:
            raise KeyError("Model '%s' is not found" % name)

    def remove_model(self, name):
        self.config.models.remove(name)
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
        project = Project(config)
        project.add_source(name, source)
        return project

    def local_model_dir(self, model_name):
        return osp.join(
            self.config.env_dir, self.config.models_dir, model_name)

    def local_source_dir(self, source_name):
        return osp.join(self.config.sources_dir, source_name)

# pylint: disable=function-redefined
def load_project_as_dataset(url):
    # implement the function declared above
    return Project.load(url).make_dataset()
# pylint: enable=function-redefined

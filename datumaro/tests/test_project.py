import numpy as np
import os
import os.path as osp

from unittest import TestCase

from datumaro.components.project import Project, Environment, Dataset
from datumaro.components.config_model import Source, Model
from datumaro.components.launcher import Launcher, ModelTransform
from datumaro.components.converter import Converter
from datumaro.components.extractor import (Extractor, DatasetItem,
    Label, Mask, Points, Polygon, PolyLine, Bbox, Caption,
)
from datumaro.util.image import Image
from datumaro.components.config import Config, DefaultConfig, SchemaBuilder
from datumaro.components.dataset_filter import \
    XPathDatasetFilter, XPathAnnotationsFilter, DatasetItemEncoder
from datumaro.util.test_utils import TestDir, compare_datasets


class ProjectTest(TestCase):
    def test_project_generate(self):
        src_config = Config({
            'project_name': 'test_project',
            'format_version': 1,
        })

        with TestDir() as test_dir:
            project_path = test_dir
            Project.generate(project_path, src_config)

            self.assertTrue(osp.isdir(project_path))

            result_config = Project.load(project_path).config
            self.assertEqual(
                src_config.project_name, result_config.project_name)
            self.assertEqual(
                src_config.format_version, result_config.format_version)

    @staticmethod
    def test_default_ctor_is_ok():
        Project()

    @staticmethod
    def test_empty_config_is_ok():
        Project(Config())

    def test_add_source(self):
        source_name = 'source'
        origin = Source({
            'url': 'path',
            'format': 'ext'
        })
        project = Project()

        project.add_source(source_name, origin)

        added = project.get_source(source_name)
        self.assertIsNotNone(added)
        self.assertEqual(added, origin)

    def test_added_source_can_be_saved(self):
        source_name = 'source'
        origin = Source({
            'url': 'path',
        })
        project = Project()
        project.add_source(source_name, origin)

        saved = project.config

        self.assertEqual(origin, saved.sources[source_name])

    def test_added_source_can_be_dumped(self):
        source_name = 'source'
        origin = Source({
            'url': 'path',
        })
        project = Project()
        project.add_source(source_name, origin)

        with TestDir() as test_dir:
            project.save(test_dir)

            loaded = Project.load(test_dir)
            loaded = loaded.get_source(source_name)
            self.assertEqual(origin, loaded)

    def test_can_import_with_custom_importer(self):
        class TestImporter:
            def __call__(self, path, subset=None):
                return Project({
                    'project_filename': path,
                    'subsets': [ subset ]
                })

        path = 'path'
        importer_name = 'test_importer'

        env = Environment()
        env.importers.register(importer_name, TestImporter)

        project = Project.import_from(path, importer_name, env,
            subset='train')

        self.assertEqual(path, project.config.project_filename)
        self.assertListEqual(['train'], project.config.subsets)

    def test_can_dump_added_model(self):
        model_name = 'model'

        project = Project()
        saved = Model({ 'launcher': 'name' })
        project.add_model(model_name, saved)

        with TestDir() as test_dir:
            project.save(test_dir)

            loaded = Project.load(test_dir)
            loaded = loaded.get_model(model_name)
            self.assertEqual(saved, loaded)

    def test_can_have_project_source(self):
        with TestDir() as test_dir:
            Project.generate(test_dir)

            project2 = Project()
            project2.add_source('project1', {
                'url': test_dir,
            })
            dataset = project2.make_dataset()

            self.assertTrue('project1' in dataset.sources)

    def test_can_batch_launch_custom_model(self):
        class TestExtractor(Extractor):
            def __iter__(self):
                for i in range(5):
                    yield DatasetItem(id=i, subset='train', image=np.array([i]))

        class TestLauncher(Launcher):
            def launch(self, inputs):
                for i, inp in enumerate(inputs):
                    yield [ Label(attributes={'idx': i, 'data': inp.item()}) ]

        model_name = 'model'
        launcher_name = 'custom_launcher'

        project = Project()
        project.env.launchers.register(launcher_name, TestLauncher)
        project.add_model(model_name, { 'launcher': launcher_name })
        model = project.make_executable_model(model_name)
        extractor = TestExtractor()

        batch_size = 3
        executor = ModelTransform(extractor, model, batch_size=batch_size)

        for item in executor:
            self.assertEqual(1, len(item.annotations))
            self.assertEqual(int(item.id) % batch_size,
                item.annotations[0].attributes['idx'])
            self.assertEqual(int(item.id),
                item.annotations[0].attributes['data'])

    def test_can_do_transform_with_custom_model(self):
        class TestExtractorSrc(Extractor):
            def __iter__(self):
                for i in range(2):
                    yield DatasetItem(id=i, image=np.ones([2, 2, 3]) * i,
                        annotations=[Label(i)])

        class TestLauncher(Launcher):
            def launch(self, inputs):
                for inp in inputs:
                    yield [ Label(inp[0, 0, 0]) ]

        class TestConverter(Converter):
            def __call__(self, extractor, save_dir):
                for item in extractor:
                    with open(osp.join(save_dir, '%s.txt' % item.id), 'w') as f:
                        f.write(str(item.annotations[0].label) + '\n')

        class TestExtractorDst(Extractor):
            def __init__(self, url):
                super().__init__()
                self.items = [osp.join(url, p) for p in sorted(os.listdir(url))]

            def __iter__(self):
                for path in self.items:
                    with open(path, 'r') as f:
                        index = osp.splitext(osp.basename(path))[0]
                        label = int(f.readline().strip())
                        yield DatasetItem(id=index, annotations=[Label(label)])

        model_name = 'model'
        launcher_name = 'custom_launcher'
        extractor_name = 'custom_extractor'

        project = Project()
        project.env.launchers.register(launcher_name, TestLauncher)
        project.env.extractors.register(extractor_name, TestExtractorSrc)
        project.env.converters.register(extractor_name, TestConverter)
        project.add_model(model_name, { 'launcher': launcher_name })
        project.add_source('source', { 'format': extractor_name })

        with TestDir() as test_dir:
            project.make_dataset().apply_model(model=model_name,
                save_dir=test_dir)

            result = Project.load(test_dir)
            result.env.extractors.register(extractor_name, TestExtractorDst)
            it = iter(result.make_dataset())
            item1 = next(it)
            item2 = next(it)
            self.assertEqual(0, item1.annotations[0].label)
            self.assertEqual(1, item2.annotations[0].label)

    def test_source_datasets_can_be_merged(self):
        class TestExtractor(Extractor):
            def __init__(self, url, n=0, s=0):
                super().__init__(length=n)
                self.n = n
                self.s = s

            def __iter__(self):
                for i in range(self.n):
                    yield DatasetItem(id=self.s + i, subset='train')

        e_name1 = 'e1'
        e_name2 = 'e2'
        n1 = 2
        n2 = 4

        project = Project()
        project.env.extractors.register(e_name1, lambda p: TestExtractor(p, n=n1))
        project.env.extractors.register(e_name2, lambda p: TestExtractor(p, n=n2, s=n1))
        project.add_source('source1', { 'format': e_name1 })
        project.add_source('source2', { 'format': e_name2 })

        dataset = project.make_dataset()

        self.assertEqual(n1 + n2, len(dataset))

    def test_project_filter_can_be_applied(self):
        class TestExtractor(Extractor):
            def __iter__(self):
                for i in range(10):
                    yield DatasetItem(id=i, subset='train')

        e_type = 'type'
        project = Project()
        project.env.extractors.register(e_type, TestExtractor)
        project.add_source('source', { 'format': e_type })

        dataset = project.make_dataset().extract('/item[id < 5]')

        self.assertEqual(5, len(dataset))

    def test_can_save_and_load_own_dataset(self):
        with TestDir() as test_dir:
            src_project = Project()
            src_dataset = src_project.make_dataset()
            item = DatasetItem(id=1)
            src_dataset.put(item)
            src_dataset.save(test_dir)

            loaded_project = Project.load(test_dir)
            loaded_dataset = loaded_project.make_dataset()

            self.assertEqual(list(src_dataset), list(loaded_dataset))

    def test_project_own_dataset_can_be_modified(self):
        project = Project()
        dataset = project.make_dataset()

        item = DatasetItem(id=1)
        dataset.put(item)

        self.assertEqual(item, next(iter(dataset)))

    def test_project_compound_child_can_be_modified_recursively(self):
        with TestDir() as test_dir:
            child1 = Project({
                'project_dir': osp.join(test_dir, 'child1'),
            })
            child1.save()

            child2 = Project({
                'project_dir': osp.join(test_dir, 'child2'),
            })
            child2.save()

            parent = Project()
            parent.add_source('child1', {
                'url': child1.config.project_dir
            })
            parent.add_source('child2', {
                'url': child2.config.project_dir
            })
            dataset = parent.make_dataset()

            item1 = DatasetItem(id='ch1', path=['child1'])
            item2 = DatasetItem(id='ch2', path=['child2'])
            dataset.put(item1)
            dataset.put(item2)

            self.assertEqual(2, len(dataset))
            self.assertEqual(1, len(dataset.sources['child1']))
            self.assertEqual(1, len(dataset.sources['child2']))

    def test_project_can_merge_item_annotations(self):
        class TestExtractor1(Extractor):
            def __iter__(self):
                yield DatasetItem(id=1, subset='train', annotations=[
                    Label(2, id=3),
                    Label(3, attributes={ 'x': 1 }),
                ])

        class TestExtractor2(Extractor):
            def __iter__(self):
                yield DatasetItem(id=1, subset='train', annotations=[
                    Label(3, attributes={ 'x': 1 }),
                    Label(4, id=4),
                ])

        project = Project()
        project.env.extractors.register('t1', TestExtractor1)
        project.env.extractors.register('t2', TestExtractor2)
        project.add_source('source1', { 'format': 't1' })
        project.add_source('source2', { 'format': 't2' })

        merged = project.make_dataset()

        self.assertEqual(1, len(merged))

        item = next(iter(merged))
        self.assertEqual(3, len(item.annotations))

class DatasetFilterTest(TestCase):
    @staticmethod
    def test_item_representations():
        item = DatasetItem(id=1, subset='subset', path=['a', 'b'],
            image=np.ones((5, 4, 3)),
            annotations=[
                Label(0, attributes={'a1': 1, 'a2': '2'}, id=1, group=2),
                Caption('hello', id=1),
                Caption('world', group=5),
                Label(2, id=3, attributes={ 'x': 1, 'y': '2' }),
                Bbox(1, 2, 3, 4, label=4, id=4, attributes={ 'a': 1.0 }),
                Bbox(5, 6, 7, 8, id=5, group=5),
                Points([1, 2, 2, 0, 1, 1], label=0, id=5),
                Mask(id=5, image=np.ones((3, 2))),
                Mask(label=3, id=5, image=np.ones((2, 3))),
                PolyLine([1, 2, 3, 4, 5, 6, 7, 8], id=11),
                Polygon([1, 2, 3, 4, 5, 6, 7, 8]),
            ]
        )

        encoded = DatasetItemEncoder.encode(item)
        DatasetItemEncoder.to_string(encoded)

    def test_item_filter_can_be_applied(self):
        class TestExtractor(Extractor):
            def __iter__(self):
                for i in range(4):
                    yield DatasetItem(id=i, subset='train')

        extractor = TestExtractor()

        filtered = XPathDatasetFilter(extractor, '/item[id > 1]')

        self.assertEqual(2, len(filtered))

    def test_annotations_filter_can_be_applied(self):
        class SrcExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=0),
                    DatasetItem(id=1, annotations=[
                        Label(0),
                        Label(1),
                    ]),
                    DatasetItem(id=2, annotations=[
                        Label(0),
                        Label(2),
                    ]),
                ])

        class DstExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=0),
                    DatasetItem(id=1, annotations=[
                        Label(0),
                    ]),
                    DatasetItem(id=2, annotations=[
                        Label(0),
                    ]),
                ])

        extractor = SrcExtractor()

        filtered = XPathAnnotationsFilter(extractor,
            '/item/annotation[label_id = 0]')

        self.assertListEqual(list(filtered), list(DstExtractor()))

    def test_annotations_filter_can_remove_empty_items(self):
        class SrcExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=0),
                    DatasetItem(id=1, annotations=[
                        Label(0),
                        Label(1),
                    ]),
                    DatasetItem(id=2, annotations=[
                        Label(0),
                        Label(2),
                    ]),
                ])

        class DstExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=2, annotations=[
                        Label(2),
                    ]),
                ])

        extractor = SrcExtractor()

        filtered = XPathAnnotationsFilter(extractor,
            '/item/annotation[label_id = 2]', remove_empty=True)

        self.assertListEqual(list(filtered), list(DstExtractor()))

class ConfigTest(TestCase):
    def test_can_produce_multilayer_config_from_dict(self):
        schema_low = SchemaBuilder() \
            .add('options', dict) \
            .build()
        schema_mid = SchemaBuilder() \
            .add('desc', lambda: Config(schema=schema_low)) \
            .build()
        schema_top = SchemaBuilder() \
            .add('container', lambda: DefaultConfig(
                lambda v: Config(v, schema=schema_mid))) \
            .build()

        value = 1
        source = Config({
            'container': {
                'elem': {
                    'desc': {
                        'options': {
                            'k': value
                        }
                    }
                }
            }
        }, schema=schema_top)

        self.assertEqual(value, source.container['elem'].desc.options['k'])

class ExtractorTest(TestCase):
    def test_custom_extractor_can_be_created(self):
        class CustomExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=0, subset='train'),
                    DatasetItem(id=1, subset='train'),
                    DatasetItem(id=2, subset='train'),

                    DatasetItem(id=3, subset='test'),
                    DatasetItem(id=4, subset='test'),

                    DatasetItem(id=1),
                    DatasetItem(id=2),
                    DatasetItem(id=3),
                ])

        extractor_name = 'ext1'
        project = Project()
        project.env.extractors.register(extractor_name, CustomExtractor)
        project.add_source('src1', {
            'url': 'path',
            'format': extractor_name,
        })

        dataset = project.make_dataset()

        compare_datasets(self, CustomExtractor(), dataset)

class DatasetTest(TestCase):
    def test_create_from_extractors(self):
        class SrcExtractor1(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, subset='train', annotations=[
                        Bbox(1, 2, 3, 4),
                        Label(4),
                    ]),
                    DatasetItem(id=1, subset='val', annotations=[
                        Label(4),
                    ]),
                ])

        class SrcExtractor2(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, subset='val', annotations=[
                        Label(5),
                    ]),
                ])

        class DstExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, subset='train', annotations=[
                        Bbox(1, 2, 3, 4),
                        Label(4),
                    ]),
                    DatasetItem(id=1, subset='val', annotations=[
                        Label(4),
                        Label(5),
                    ]),
                ])

        dataset = Dataset.from_extractors(SrcExtractor1(), SrcExtractor2())

        compare_datasets(self, DstExtractor(), dataset)


class DatasetItemTest(TestCase):
    def test_ctor_requires_id(self):
        with self.assertRaises(Exception):
            # pylint: disable=no-value-for-parameter
            DatasetItem()
            # pylint: enable=no-value-for-parameter

    @staticmethod
    def test_ctors_with_image():
        for args in [
            { 'id': 0, 'image': None },
            { 'id': 0, 'image': 'path.jpg' },
            { 'id': 0, 'image': np.array([1, 2, 3]) },
            { 'id': 0, 'image': lambda f: np.array([1, 2, 3]) },
            { 'id': 0, 'image': Image(data=np.array([1, 2, 3])) },
        ]:
            DatasetItem(**args)
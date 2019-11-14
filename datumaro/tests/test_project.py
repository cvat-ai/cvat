import os
import os.path as osp

from unittest import TestCase

from datumaro.components.project import Project, Environment
from datumaro.components.project import Source, Model
from datumaro.components.launcher import Launcher, InferenceWrapper
from datumaro.components.converter import Converter
from datumaro.components.extractor import Extractor, DatasetItem, LabelObject
from datumaro.components.config import Config, DefaultConfig, SchemaBuilder
from datumaro.components.dataset_filter import XPathDatasetFilter
from datumaro.util.test_utils import TestDir


class ProjectTest(TestCase):
    def test_project_generate(self):
        src_config = Config({
            'project_name': 'test_project',
            'format_version': 1,
        })

        with TestDir() as test_dir:
            project_path = test_dir.path
            Project.generate(project_path, src_config)

            self.assertTrue(osp.isdir(project_path))

            result_config = Project.load(project_path).config
            self.assertEqual(
                src_config.project_name, result_config.project_name)
            self.assertEqual(
                src_config.format_version, result_config.format_version)

    def test_default_ctor_is_ok(self):
        Project()

    def test_empty_config_is_ok(self):
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
            project.save(test_dir.path)

            loaded = Project.load(test_dir.path)
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
            project.save(test_dir.path)

            loaded = Project.load(test_dir.path)
            loaded = loaded.get_model(model_name)
            self.assertEqual(saved, loaded)

    def test_can_have_project_source(self):
        with TestDir() as test_dir:
            Project.generate(test_dir.path)

            project2 = Project()
            project2.add_source('project1', {
                'url': test_dir.path,
            })
            dataset = project2.make_dataset()

            self.assertTrue('project1' in dataset.sources)

    def test_can_batch_launch_custom_model(self):
        class TestExtractor(Extractor):
            def __init__(self, url, n=0):
                super().__init__(length=n)
                self.n = n

            def __iter__(self):
                for i in range(self.n):
                    yield DatasetItem(id_=i, subset='train', image=i)

            def subsets(self):
                return ['train']

        class TestLauncher(Launcher):
            def __init__(self, **kwargs):
                pass

            def launch(self, inputs):
                for i, inp in enumerate(inputs):
                    yield [ LabelObject(attributes={'idx': i, 'data': inp}) ]

        model_name = 'model'
        launcher_name = 'custom_launcher'

        project = Project()
        project.env.launchers.register(launcher_name, TestLauncher)
        project.add_model(model_name, { 'launcher': launcher_name })
        model = project.make_executable_model(model_name)
        extractor = TestExtractor('', n=5)

        batch_size = 3
        executor = InferenceWrapper(extractor, model, batch_size=batch_size)

        for item in executor:
            self.assertEqual(1, len(item.annotations))
            self.assertEqual(int(item.id) % batch_size,
                item.annotations[0].attributes['idx'])
            self.assertEqual(int(item.id),
                item.annotations[0].attributes['data'])

    def test_can_do_transform_with_custom_model(self):
        class TestExtractorSrc(Extractor):
            def __init__(self, url, n=2):
                super().__init__(length=n)
                self.n = n

            def __iter__(self):
                for i in range(self.n):
                    yield DatasetItem(id_=i, subset='train', image=i,
                        annotations=[ LabelObject(i) ])

            def subsets(self):
                return ['train']

        class TestLauncher(Launcher):
            def __init__(self, **kwargs):
                pass

            def launch(self, inputs):
                for input in inputs:
                    yield [ LabelObject(input) ]

        class TestConverter(Converter):
            def __call__(self, extractor, save_dir):
                for item in extractor:
                    with open(osp.join(save_dir, '%s.txt' % item.id), 'w+') as f:
                        f.write(str(item.subset) + '\n')
                        f.write(str(item.annotations[0].label) + '\n')

        class TestExtractorDst(Extractor):
            def __init__(self, url):
                super().__init__()
                self.items = [osp.join(url, p) for p in sorted(os.listdir(url))]

            def __iter__(self):
                for path in self.items:
                    with open(path, 'r') as f:
                        index = osp.splitext(osp.basename(path))[0]
                        subset = f.readline()[:-1]
                        label = int(f.readline()[:-1])
                        assert(subset == 'train')
                        yield DatasetItem(id_=index, subset=subset,
                            annotations=[ LabelObject(label) ])

            def __len__(self):
                return len(self.items)

            def subsets(self):
                return ['train']


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
            project.make_dataset().transform(model_name, test_dir.path)

            result = Project.load(test_dir.path)
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
                    yield DatasetItem(id_=self.s + i, subset='train')

            def subsets(self):
                return ['train']

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
            def __init__(self, url, n=10):
                super().__init__(length=n)
                self.n = n

            def __iter__(self):
                for i in range(self.n):
                    yield DatasetItem(id_=i, subset='train')

            def subsets(self):
                return ['train']

        e_type = 'type'
        project = Project()
        project.env.extractors.register(e_type, TestExtractor)
        project.add_source('source', { 'format': e_type })
        project.set_filter('/item[id < 5]')

        dataset = project.make_dataset()

        self.assertEqual(5, len(dataset))

    def test_project_own_dataset_can_be_modified(self):
        project = Project()
        dataset = project.make_dataset()

        item = DatasetItem(id_=1)
        dataset.put(item)

        self.assertEqual(item, next(iter(dataset)))

    def test_project_compound_child_can_be_modified_recursively(self):
        with TestDir() as test_dir:
            child1 = Project({
                'project_dir': osp.join(test_dir.path, 'child1'),
            })
            child1.save()

            child2 = Project({
                'project_dir': osp.join(test_dir.path, 'child2'),
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

            item1 = DatasetItem(id_='ch1', path=['child1'])
            item2 = DatasetItem(id_='ch2', path=['child2'])
            dataset.put(item1)
            dataset.put(item2)

            self.assertEqual(2, len(dataset))
            self.assertEqual(1, len(dataset.sources['child1']))
            self.assertEqual(1, len(dataset.sources['child2']))

    def test_project_can_merge_item_annotations(self):
        class TestExtractor(Extractor):
            def __init__(self, url, v=None):
                super().__init__()
                self.v = v

            def __iter__(self):
                v1_item = DatasetItem(id_=1, subset='train', annotations=[
                    LabelObject(2, id_=3),
                    LabelObject(3, attributes={ 'x': 1 }),
                ])

                v2_item = DatasetItem(id_=1, subset='train', annotations=[
                    LabelObject(3, attributes={ 'x': 1 }),
                    LabelObject(4, id_=4),
                ])

                if self.v == 1:
                    yield v1_item
                else:
                    yield v2_item

            def subsets(self):
                return ['train']

        project = Project()
        project.env.extractors.register('t1', lambda p: TestExtractor(p, v=1))
        project.env.extractors.register('t2', lambda p: TestExtractor(p, v=2))
        project.add_source('source1', { 'format': 't1' })
        project.add_source('source2', { 'format': 't2' })

        merged = project.make_dataset()

        self.assertEqual(1, len(merged))

        item = next(iter(merged))
        self.assertEqual(3, len(item.annotations))

class DatasetFilterTest(TestCase):
    class TestExtractor(Extractor):
        def __init__(self, url, n=0):
            super().__init__(length=n)
            self.n = n

        def __iter__(self):
            for i in range(self.n):
                yield DatasetItem(id_=i, subset='train')

        def subsets(self):
            return ['train']

    def test_xpathfilter_can_be_applied(self):
        extractor = self.TestExtractor('', n=4)
        dataset_filter = XPathDatasetFilter('/item[id > 1]')

        filtered = extractor.select(dataset_filter)

        self.assertEqual(2, len(filtered))

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
            def __init__(self, url):
                super().__init__()

            def __iter__(self):
                return iter([
                    DatasetItem(id_=0, subset='train'),
                    DatasetItem(id_=1, subset='train'),
                    DatasetItem(id_=2, subset='train'),

                    DatasetItem(id_=3, subset='test'),
                ])

            def subsets(self):
                return ['train', 'test']

        extractor_name = 'ext1'
        project = Project()
        project.env.extractors.register(extractor_name, CustomExtractor)
        project.add_source('src1', {
            'url': 'path',
            'format': extractor_name,
        })
        project.set_subsets(['train'])

        dataset = project.make_dataset()

        self.assertEqual(3, len(dataset))

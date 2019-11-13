import cv2
import numpy as np
import os
import os.path as osp

from unittest import TestCase

from datumaro.components.project import Project
from datumaro.util.command_targets import *
from datumaro.util.test_utils import current_function_name, TestDir


class CommandTargetsTest(TestCase):
    def test_image_false_when_no_file(self):
        path = '%s.jpg' % current_function_name()
        target = ImageTarget()

        status = target.test(path)

        self.assertFalse(status)

    def test_image_false_when_false(self):
        with TestDir() as test_dir:
            path = osp.join(test_dir.path, 'test.jpg')
            with open(path, 'w+') as f:
                f.write('qwerty123')

            target = ImageTarget()

            status = target.test(path)

            self.assertFalse(status)

    def test_image_true_when_true(self):
        with TestDir() as test_dir:
            path = osp.join(test_dir.path, 'test.jpg')
            image = np.random.random_sample([10, 10, 3])
            cv2.imwrite(path, image)

            target = ImageTarget()

            status = target.test(path)

            self.assertTrue(status)

    def test_project_false_when_no_file(self):
        path = '%s.jpg' % current_function_name()
        target = ProjectTarget()

        status = target.test(path)

        self.assertFalse(status)

    def test_project_false_when_no_name(self):
        target = ProjectTarget(project=Project())

        status = target.test('')

        self.assertFalse(status)

    def test_project_true_when_project_file(self):
        with TestDir() as test_dir:
            path = osp.join(test_dir.path, 'test.jpg')
            Project().save(path)

            target = ProjectTarget()

            status = target.test(path)

            self.assertTrue(status)

    def test_project_true_when_project_name(self):
        project_name = 'qwerty'
        project = Project({
            'project_name': project_name
        })
        target = ProjectTarget(project=project)

        status = target.test(project_name)

        self.assertTrue(status)

    def test_project_false_when_not_project_name(self):
        project_name = 'qwerty'
        project = Project({
            'project_name': project_name
        })
        target = ProjectTarget(project=project)

        status = target.test(project_name + '123')

        self.assertFalse(status)

    def test_project_true_when_not_project_file(self):
        with TestDir() as test_dir:
            path = osp.join(test_dir.path, 'test.jpg')
            with open(path, 'w+') as f:
                f.write('wqererw')

            target = ProjectTarget()

            status = target.test(path)

            self.assertFalse(status)

    def test_source_false_when_no_project(self):
        target = SourceTarget()

        status = target.test('qwerty123')

        self.assertFalse(status)

    def test_source_true_when_source_exists(self):
        source_name = 'qwerty'
        project = Project()
        project.add_source(source_name)
        target = SourceTarget(project=project)

        status = target.test(source_name)

        self.assertTrue(status)

    def test_source_false_when_source_doesnt_exist(self):
        source_name = 'qwerty'
        project = Project()
        project.add_source(source_name)
        target = SourceTarget(project=project)

        status = target.test(source_name + '123')

        self.assertFalse(status)
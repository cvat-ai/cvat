
# Copyright (C) 2019-2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os.path as osp
import re
import setuptools


def find_version(file_path=None):
    if not file_path:
        file_path = osp.join(osp.dirname(osp.abspath(__file__)),
            'datumaro', 'version.py')

    with open(file_path, 'r') as version_file:
        version_text = version_file.read()

    # PEP440:
    # https://www.python.org/dev/peps/pep-0440/#appendix-b-parsing-version-strings-with-regular-expressions
    pep_regex = r'([1-9]\d*!)?(0|[1-9]\d*)(\.(0|[1-9]\d*))*((a|b|rc)(0|[1-9]\d*))?(\.post(0|[1-9]\d*))?(\.dev(0|[1-9]\d*))?'
    version_regex = r'VERSION\s*=\s*.(' + pep_regex + ').'
    match = re.match(version_regex, version_text)
    if not match:
        raise RuntimeError("Failed to find version string in '%s'" % file_path)

    version = version_text[match.start(1) : match.end(1)]
    return version


with open('README.md', 'r') as fh:
    long_description = fh.read()

setuptools.setup(
    name="datumaro",
    version=find_version(),
    author="Intel",
    author_email="maxim.zhiltsov@intel.com",
    description="Dataset Management Framework (Datumaro)",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/opencv/cvat/datumaro",
    packages=setuptools.find_packages(exclude=['tests*']),
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires='>=3.5',
    install_requires=[
        'attrs',
        'defusedxml',
        'GitPython',
        'lxml',
        'matplotlib',
        'numpy',
        'opencv-python',
        'Pillow',
        'pycocotools',
        'PyYAML',
        'scikit-image',
        'tensorboardX',
    ],
    extras_require={
        'tf': ['tensorflow'],
        'tf-gpu': ['tensorflow-gpu'],
    },
    entry_points={
        'console_scripts': [
            'datum=datumaro.cli.__main__:main',
        ],
    },
)

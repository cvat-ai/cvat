from setuptools import setup, find_packages
from pathlib import Path

def load_requirements(path: str) -> list[str]:
    with open(path) as f:
        return [
            line.strip()
            for line in f
            if line.strip() and not line.startswith("#")
        ]

setup(
    name="perfkit",
    version="0.1.0",
    description="CLI tool for managing and comparing K6 performance baselines",
    author="Ruslan Orazvaliev",
    author_email="ruslan.orazvaliev@cvat.ai",
    packages=find_packages(),
    include_package_data=True,
    install_requires=load_requirements("./requirements.txt"),
    entry_points={
        "console_scripts": [
            "perfkit=perfkit.perfkit:app",
        ],
    },
    classifiers=[
        "Programming Language :: Python :: 3.10",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires=">=3.10",
)

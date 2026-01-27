# Copyright (C) 2025 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""
Model Metadata Parser

Parses and validates model_metadata.yaml files that describe inference models.
"""

import yaml
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from rest_framework.exceptions import ValidationError


@dataclass
class ModelMetadata:
    """Structured representation of model metadata."""
    # Model info
    name: str
    version: str
    framework: str
    kind: str

    # Requirements
    python_version: str
    dependencies: List[str]

    # Files
    model_file: str
    config_file: Optional[str]

    # Inference config
    input_shape: List[int]
    classes: List[str]
    confidence_threshold: float

    # Resources
    cpu: str
    memory: str
    gpu: bool


class MetadataParser:
    """
    Parses and validates model_metadata.yaml files.

    Expected format:
    ```yaml
    model:
      name: "model-name"
      version: "1.0.0"
      framework: "pytorch"  # pytorch, tensorflow, onnx
      kind: "detector"      # detector, interactor, reid, tracker

    requirements:
      python: "3.9"
      dependencies:
        - torch==2.0.0
        - torchvision==0.15.0

    files:
      model: "model.pt"
      config: "config.yaml"  # optional

    inference:
      input_shape: [640, 640, 3]
      classes: ["person", "car", "dog"]
      confidence_threshold: 0.5

    resources:
      cpu: "1000m"
      memory: "2Gi"
      gpu: false
    ```
    """

    SUPPORTED_FRAMEWORKS = ['pytorch', 'tensorflow', 'onnx']
    SUPPORTED_KINDS = ['detector', 'interactor', 'reid', 'tracker']

    @staticmethod
    def parse(metadata_content: str) -> ModelMetadata:
        """
        Parse YAML metadata content into ModelMetadata object.

        Args:
            metadata_content: YAML string content

        Returns:
            ModelMetadata object

        Raises:
            ValidationError: If metadata is invalid
        """
        try:
            data = yaml.safe_load(metadata_content)
        except yaml.YAMLError as e:
            raise ValidationError(f"Invalid YAML format: {str(e)}")

        # Validate required sections
        required_sections = ['model', 'requirements', 'files', 'inference', 'resources']
        for section in required_sections:
            if section not in data:
                raise ValidationError(f"Missing required section: {section}")

        # Parse model section
        model = data['model']
        framework = model.get('framework', '').lower()
        if framework not in MetadataParser.SUPPORTED_FRAMEWORKS:
            raise ValidationError(
                f"Unsupported framework '{framework}'. "
                f"Supported: {', '.join(MetadataParser.SUPPORTED_FRAMEWORKS)}"
            )

        kind = model.get('kind', '').lower()
        if kind not in MetadataParser.SUPPORTED_KINDS:
            raise ValidationError(
                f"Unsupported kind '{kind}'. "
                f"Supported: {', '.join(MetadataParser.SUPPORTED_KINDS)}"
            )

        # Parse requirements
        requirements = data['requirements']
        if not requirements.get('python'):
            raise ValidationError("Missing python version in requirements")
        if not requirements.get('dependencies'):
            raise ValidationError("Missing dependencies in requirements")

        # Parse files
        files = data['files']
        if not files.get('model'):
            raise ValidationError("Missing model file path")

        # Parse inference config
        inference = data['inference']
        if not inference.get('input_shape'):
            raise ValidationError("Missing input_shape in inference config")
        if not inference.get('classes'):
            raise ValidationError("Missing classes in inference config")

        # Parse resources
        resources = data['resources']
        if not resources.get('cpu'):
            resources['cpu'] = '1000m'
        if not resources.get('memory'):
            resources['memory'] = '2Gi'
        if 'gpu' not in resources:
            resources['gpu'] = False

        # Create ModelMetadata object
        return ModelMetadata(
            name=model.get('name', 'unnamed-model'),
            version=model.get('version', '1.0.0'),
            framework=framework,
            kind=kind,
            python_version=requirements['python'],
            dependencies=requirements['dependencies'],
            model_file=files['model'],
            config_file=files.get('config'),
            input_shape=inference['input_shape'],
            classes=inference['classes'],
            confidence_threshold=inference.get('confidence_threshold', 0.5),
            cpu=resources['cpu'],
            memory=resources['memory'],
            gpu=resources['gpu']
        )

    @staticmethod
    def validate_dependencies(dependencies: List[str]) -> None:
        """
        Validate that dependencies are in correct format.

        Args:
            dependencies: List of pip package specifiers

        Raises:
            ValidationError: If any dependency is invalid
        """
        for dep in dependencies:
            # Basic validation: should contain package name
            if not dep or not dep.strip():
                raise ValidationError(f"Empty dependency found")
            # Check for common issues
            if ' ' in dep and '==' not in dep:
                raise ValidationError(
                    f"Invalid dependency format: '{dep}'. "
                    f"Use format: 'package==version' or 'package>=version'"
                )

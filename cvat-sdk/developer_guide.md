# Developer guide

## General info

Most of the files in this package are generated. The `gen/` directory
contains generator config and templates.

## How to generate API

1. Obtain the REST API schema:
```bash
python manage.py spectacular --file schema.yml && mkdir -p cvat-sdk/schema/ && mv schema.yml cvat-sdk/schema/
```

2. Generate package code (call from the package root directory):
```bash
# pip install -r requirements/development.txt

./gen/generate.sh
```

## How to edit templates

If you want to edit templates, obtain them from the generator first:

```bash
docker run --rm -v $PWD:/local \
    openapitools/openapi-generator-cli author template \
        -o /local/generator_templates -g python
```

Then, you can copy the modified version of the template you need into
the `gen/templates/openapi-generator/` directory.

Relevant links:
- [Generator implementation, available variables in templates](https://github.com/OpenAPITools/openapi-generator/tree/master/modules/openapi-generator/src/main/java/org/openapitools/codegen)
- [Mustache syntax in the generator](https://github.com/OpenAPITools/openapi-generator/wiki/Mustache-Template-Variables)

## How to test

API client tests are integrated into REST API tests (`/tests/rest_api/`).
To allow editing of the package, install it with `pip install -e cvat-sdk/`.

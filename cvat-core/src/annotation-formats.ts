// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { DimensionType } from './enums';
import {
    SerializedAnnotationExporter,
    SerializedAnnotationFormats,
    SerializedAnnotationImporter,
} from './server-response-types';

export class Loader {
    public name: string;
    public format: string;
    public version: string;
    public enabled: boolean;
    public dimension: DimensionType;

    constructor(initialData: SerializedAnnotationImporter) {
        const data = {
            name: initialData.name,
            format: initialData.ext,
            version: initialData.version,
            enabled: initialData.enabled,
            dimension: initialData.dimension,
        };

        Object.defineProperties(this, {
            name: {
                get: () => data.name,
            },
            format: {
                get: () => data.format,
            },
            version: {
                get: () => data.version,
            },
            enabled: {
                get: () => data.enabled,
            },
            dimension: {
                get: () => data.dimension,
            },
        });
    }
}

export class Dumper {
    public name: string;
    public format: string;
    public version: string;
    public enabled: boolean;
    public dimension: DimensionType;

    constructor(initialData: SerializedAnnotationExporter) {
        const data = {
            name: initialData.name,
            format: initialData.ext,
            version: initialData.version,
            enabled: initialData.enabled,
            dimension: initialData.dimension,
        };

        Object.defineProperties(this, {
            name: {
                get: () => data.name,
            },
            format: {
                get: () => data.format,
            },
            version: {
                get: () => data.version,
            },
            enabled: {
                get: () => data.enabled,
            },
            dimension: {
                get: () => data.dimension,
            },
        });
    }
}

export class AnnotationFormats {
    public loaders: Loader[];
    public dumpers: Dumper[];

    constructor(initialData: SerializedAnnotationFormats) {
        const data = {
            exporters: initialData.exporters.map((el) => new Dumper(el)),
            importers: initialData.importers.map((el) => new Loader(el)),
        };

        Object.defineProperties(this, {
            loaders: {
                get: () => [...data.importers],
            },
            dumpers: {
                get: () => [...data.exporters],
            },
        });
    }
}

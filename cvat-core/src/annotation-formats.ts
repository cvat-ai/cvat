// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

interface RawLoaderData {
    name: string;
    ext: string;
    version: string;
    enabled: boolean;
    dimension: '2d' | '3d';
}

export class Loader {
    public name: string;
    public format: string;
    public version: string;
    public enabled: boolean;
    public dimension: '2d' | '3d';

    constructor(initialData: RawLoaderData) {
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

type RawDumperData = RawLoaderData;

export class Dumper {
    public name: string;
    public format: string;
    public version: string;
    public enabled: boolean;
    public dimension: '2d' | '3d';

    constructor(initialData: RawDumperData) {
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

interface AnnotationFormatRawData {
    importers: RawLoaderData[];
    exporters: RawDumperData[];
}

export class AnnotationFormats {
    public loaders: Loader[];
    public dumpers: Dumper[];

    constructor(initialData: AnnotationFormatRawData) {
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

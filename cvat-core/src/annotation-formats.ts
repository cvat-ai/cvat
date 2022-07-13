// Copyright (C) 2019-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

interface RawLoaderData {
    name: string;
    ext: string;
    version: string;
    enabled: boolean;
    dimension: '2d' | '3d';
}

/**
 * Class representing an annotation loader
 * @memberof module:API.cvat.classes
 * @hideconstructor
*/
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
                /**
                 * @name name
                 * @type {string}
                 * @memberof module:API.cvat.classes.Loader
                 * @readonly
                 * @instance
                 */
                get: () => data.name,
            },
            format: {
                /**
                 * @name format
                 * @type {string}
                 * @memberof module:API.cvat.classes.Loader
                 * @readonly
                 * @instance
                 */
                get: () => data.format,
            },
            version: {
                /**
                 * @name version
                 * @type {string}
                 * @memberof module:API.cvat.classes.Loader
                 * @readonly
                 * @instance
                 */
                get: () => data.version,
            },
            enabled: {
                /**
                 * @name enabled
                 * @type {boolean}
                 * @memberof module:API.cvat.classes.Loader
                 * @readonly
                 * @instance
                 */
                get: () => data.enabled,
            },
            dimension: {
                /**
                 * @name dimension
                 * @type {module:API.cvat.enums.DimensionType}
                 * @memberof module:API.cvat.classes.Loader
                 * @readonly
                 * @instance
                 */
                get: () => data.dimension,
            },
        });
    }
}

type RawDumperData = RawLoaderData;

/**
 * Class representing an annotation dumper
 * @memberof module:API.cvat.classes
 * @hideconstructor
 */
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
                /**
                 * @name name
                 * @type {string}
                 * @memberof module:API.cvat.classes.Dumper
                 * @readonly
                 * @instance
                 */
                get: () => data.name,
            },
            format: {
                /**
                 * @name format
                 * @type {string}
                 * @memberof module:API.cvat.classes.Dumper
                 * @readonly
                 * @instance
                 */
                get: () => data.format,
            },
            version: {
                /**
                 * @name version
                 * @type {string}
                 * @memberof module:API.cvat.classes.Dumper
                 * @readonly
                 * @instance
                 */
                get: () => data.version,
            },
            enabled: {
                /**
                 * @name enabled
                 * @type {boolean}
                 * @memberof module:API.cvat.classes.Dumper
                 * @readonly
                 * @instance
                 */
                get: () => data.enabled,
            },
            dimension: {
                /**
                 * @name dimension
                 * @type {module:API.cvat.enums.DimensionType}
                 * @memberof module:API.cvat.classes.Dumper
                 * @readonly
                 * @instance
                 */
                get: () => data.dimension,
            },
        });
    }
}

interface AnnotationFormatRawData {
    importers: RawLoaderData[];
    exporters: RawDumperData[];
}

/**
 * Class representing an annotation format
 * @memberof module:API.cvat.classes
 * @hideconstructor
 */
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
                /**
                 * @name loaders
                 * @type {module:API.cvat.classes.Loader[]}
                 * @memberof module:API.cvat.classes.AnnotationFormats
                 * @readonly
                 * @instance
                 */
                get: () => [...data.importers],
            },
            dumpers: {
                /**
                 * @name dumpers
                 * @type {module:API.cvat.classes.Dumper[]}
                 * @memberof module:API.cvat.classes.AnnotationFormats
                 * @readonly
                 * @instance
                 */
                get: () => [...data.exporters],
            },
        });
    }
}

// Copyright (C) 2019-2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

(() => {
    /**
     * Class representing an annotation loader
     * @memberof module:API.cvat.classes
     * @hideconstructor
     */
    class Loader {
        constructor(initialData) {
            const data = {
                name: initialData.name,
                format: initialData.ext,
                version: initialData.version,
                enabled: initialData.enabled,
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
                     * @type {string}
                     * @memberof module:API.cvat.classes.Loader
                     * @readonly
                     * @instance
                     */
                    get: () => data.enabled,
                },
            });
        }
    }

    /**
     * Class representing an annotation dumper
     * @memberof module:API.cvat.classes
     * @hideconstructor
     */
    class Dumper {
        constructor(initialData) {
            const data = {
                name: initialData.name,
                format: initialData.ext,
                version: initialData.version,
                enabled: initialData.enabled,
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
                     * @type {string}
                     * @memberof module:API.cvat.classes.Loader
                     * @readonly
                     * @instance
                     */
                    get: () => data.enabled,
                },
            });
        }
    }

    /**
     * Class representing an annotation format
     * @memberof module:API.cvat.classes
     * @hideconstructor
     */
    class AnnotationFormats {
        constructor(initialData) {
            const data = {
                exporters: initialData.exporters.map((el) => new Dumper(el)),
                importers: initialData.importers.map((el) => new Loader(el)),
            };

            // Now all fields are readonly
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

    module.exports = {
        AnnotationFormats,
        Loader,
        Dumper,
    };
})();

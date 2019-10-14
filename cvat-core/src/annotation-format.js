/*
* Copyright (C) 2019 Intel Corporation
* SPDX-License-Identifier: MIT
*/

(() => {
    /**
        * Class representing an annotation loader
        * @memberof module:API.cvat.classes
        * @hideconstructor
    */
    class Loader {
        constructor(initialData) {
            const data = {
                display_name: initialData.display_name,
                format: initialData.format,
                handler: initialData.handler,
                version: initialData.version,
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
                    get: () => data.display_name,
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
                handler: {
                    /**
                        * @name handler
                        * @type {string}
                        * @memberof module:API.cvat.classes.Loader
                        * @readonly
                        * @instance
                    */
                    get: () => data.handler,
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
                display_name: initialData.display_name,
                format: initialData.format,
                handler: initialData.handler,
                version: initialData.version,
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
                    get: () => data.display_name,
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
                handler: {
                    /**
                        * @name handler
                        * @type {string}
                        * @memberof module:API.cvat.classes.Dumper
                        * @readonly
                        * @instance
                    */
                    get: () => data.handler,
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
            });
        }
    }

    /**
        * Class representing an annotation format
        * @memberof module:API.cvat.classes
        * @hideconstructor
    */
    class AnnotationFormat {
        constructor(initialData) {
            const data = {
                created_date: initialData.created_date,
                updated_date: initialData.updated_date,
                id: initialData.id,
                owner: initialData.owner,
                name: initialData.name,
                handler_file: initialData.handler_file,
            };

            data.dumpers = initialData.dumpers.map((el) => new Dumper(el));
            data.loaders = initialData.loaders.map((el) => new Loader(el));

            // Now all fields are readonly
            Object.defineProperties(this, {
                id: {
                    /**
                        * @name id
                        * @type {integer}
                        * @memberof module:API.cvat.classes.AnnotationFormat
                        * @readonly
                        * @instance
                    */
                    get: () => data.id,
                },
                owner: {
                    /**
                        * @name owner
                        * @type {integer}
                        * @memberof module:API.cvat.classes.AnnotationFormat
                        * @readonly
                        * @instance
                    */
                    get: () => data.owner,
                },
                name: {
                    /**
                        * @name name
                        * @type {string}
                        * @memberof module:API.cvat.classes.AnnotationFormat
                        * @readonly
                        * @instance
                    */
                    get: () => data.name,
                },
                createdDate: {
                    /**
                        * @name createdDate
                        * @type {string}
                        * @memberof module:API.cvat.classes.AnnotationFormat
                        * @readonly
                        * @instance
                    */
                    get: () => data.created_date,
                },
                updatedDate: {
                    /**
                        * @name updatedDate
                        * @type {string}
                        * @memberof module:API.cvat.classes.AnnotationFormat
                        * @readonly
                        * @instance
                    */
                    get: () => data.updated_date,
                },
                handlerFile: {
                    /**
                        * @name handlerFile
                        * @type {string}
                        * @memberof module:API.cvat.classes.AnnotationFormat
                        * @readonly
                        * @instance
                    */
                    get: () => data.handler_file,
                },
                loaders: {
                    /**
                        * @name loaders
                        * @type {module:API.cvat.classes.Loader[]}
                        * @memberof module:API.cvat.classes.AnnotationFormat
                        * @readonly
                        * @instance
                    */
                    get: () => [...data.loaders],
                },
                dumpers: {
                    /**
                        * @name dumpers
                        * @type {module:API.cvat.classes.Dumper[]}
                        * @memberof module:API.cvat.classes.AnnotationFormat
                        * @readonly
                        * @instance
                    */
                    get: () => [...data.dumpers],
                },
            });
        }
    }

    module.exports = {
        AnnotationFormat,
        Loader,
        Dumper,
    };
})();

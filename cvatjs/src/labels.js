/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/

(() => {
    /**
        * Class representing an attribute
        * @memberof module:API.cvat.classes
        * @hideconstructor
    */
    class Attribute {
        constructor(initialData) {
            const data = {
                id: undefined,
                default_value: undefined,
                input_type: undefined,
                mutable: undefined,
                name: undefined,
                values: undefined,
            };

            for (const key in data) {
                if (Object.prototype.hasOwnProperty.call(data, key)) {
                    if (Object.prototype.hasOwnProperty.call(initialData, key)) {
                        if (Array.isArray(initialData[key])) {
                            data[key] = [...initialData[key]];
                        } else {
                            data[key] = initialData[key];
                        }
                    }
                }
            }

            let valid = false;
            for (const key in window.cvat.enums.AttributeType) {
                if (Object.prototype.hasOwnProperty.call(
                    window.cvat.enums.AttributeType,
                    key,
                )) {
                    if (key === data.input_type) {
                        valid = true;
                    }
                }
            }

            if (!valid) {
                throw window.cvat.exceptions.ArgumentError(
                    `Got invalid attribute type ${data.input_type}`,
                );
            }

            Object.defineProperties(this, {
                /**
                    * @name id
                    * @type {integer}
                    * @memberof module:API.cvat.classes.Attribute
                    * @readonly
                    * @instance
                */
                id: {
                    get: () => data.id,
                    writable: false,
                },
                /**
                    * @name defaultValue
                    * @type {(string|integer|boolean)}
                    * @memberof module:API.cvat.classes.Attribute
                    * @readonly
                    * @instance
                */
                defaultValue: {
                    get: () => data.default_value,
                    writable: false,
                },
                /**
                    * @name inputType
                    * @type {string}
                    * @memberof module:API.cvat.classes.Attribute
                    * @readonly
                    * @instance
                */
                inputType: {
                    get: () => data.input_type,
                    writable: false,
                },
                /**
                    * @name mutable
                    * @type {module:API.cvat.enums.AttributeType}
                    * @memberof module:API.cvat.classes.Attribute
                    * @readonly
                    * @instance
                */
                mutable: {
                    get: () => data.mutable,
                    writable: false,
                },
                /**
                    * @name name
                    * @type {string}
                    * @memberof module:API.cvat.classes.Attribute
                    * @readonly
                    * @instance
                */
                name: {
                    get: () => data.name,
                    writable: false,
                },
                /**
                    * @name values
                    * @type {(string[]|integer[]|boolean[])}
                    * @memberof module:API.cvat.classes.Attribute
                    * @readonly
                    * @instance
                */
                values: {
                    get: () => [...data.values],
                    writable: false,
                },
            });
        }
    }

    /**
        * Class representing a label
        * @memberof module:API.cvat.classes
        * @hideconstructor
    */
    class Label {
        constructor(initialData) {
            const data = {
                id: undefined,
                name: undefined,
            };

            for (const key in data) {
                if (Object.prototype.hasOwnProperty.call(data, key)) {
                    if (Object.prototype.hasOwnProperty.call(initialData, key)) {
                        data[key] = initialData[key];
                    }
                }
            }

            data.attributes = [];

            if (Object.prototype.hasOwnProperty.call(initialData, 'attributes')
                && Array.isArray(initialData.attributes)) {
                for (const attrData of initialData.attributes) {
                    data.attributes.push(new window.cvat.classes.Attribute(attrData));
                }
            }

            Object.defineProperties(this, {
                /**
                    * @name id
                    * @type {integer}
                    * @memberof module:API.cvat.classes.Label
                    * @readonly
                    * @instance
                */
                id: {
                    get: () => data.id,
                },
                /**
                    * @name name
                    * @type {string}
                    * @memberof module:API.cvat.classes.Label
                    * @readonly
                    * @instance
                */
                name: {
                    get: () => data.name,
                },
                /**
                    * @name attributes
                    * @type {module:API.cvat.classes.Attribute[]}
                    * @memberof module:API.cvat.classes.Label
                    * @readonly
                    * @instance
                */
                attributes: {
                    get: () => [...data.attributes],
                },
            });
        }
    }

    module.exports = {
        Attribute,
        Label,
    };
})();

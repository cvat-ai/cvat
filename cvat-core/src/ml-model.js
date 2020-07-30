/*
* Copyright (C) 2019-2020 Intel Corporation
* SPDX-License-Identifier: MIT
*/

/**
    * Class representing a machine learning model
    * @memberof module:API.cvat.classes
*/
class MLModel {
    constructor(data) {
        this._id = data.id;
        this._name = data.name;
        this._labels = data.labels;
        this._framework = data.framework;
        this._description = data.description;
        this._type = data.type;
    }

    /**
     * @returns {string}
     * @readonly
    */
    get id() {
        return this._id;
    }

    /**
     * @returns {string}
     * @readonly
    */
    get name() {
        return this._name;
    }

    /**
     * @returns {string[]}
     * @readonly
    */
    get labels() {
        if (Array.isArray(this._labels)) {
            return [...this._labels];
        }

        return [];
    }

    /**
     * @returns {string}
     * @readonly
    */
    get framework() {
        return this._framework;
    }

    /**
     * @returns {string}
     * @readonly
    */
    get description() {
        return this._description;
    }

    /**
     * @returns {module:API.cvat.enums.ModelType}
     * @readonly
    */
    get type() {
        return this._type;
    }
}

module.exports = MLModel;

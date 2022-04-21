// Copyright (C) 2019-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

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
        this._tip = {
            message: data.help_message,
            gif: data.animated_gif,
        };
        this._params = {
            canvas: {
                minPosVertices: data.min_pos_points,
                minNegVertices: data.min_neg_points,
                startWithBox: data.startswith_box,
            },
        };
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

    /**
     * @returns {object}
     * @readonly
     */
    get params() {
        return {
            canvas: { ...this._params.canvas },
        };
    }

    /**
     * @typedef {Object} MlModelTip
     * @property {string} message A short message for a user about the model
     * @property {string} gif A gif URL to be shawn to a user as an example
     * @returns {MlModelTip}
     * @readonly
     */
    get tip() {
        return { ...this._tip };
    }

    /**
     * @callback onRequestStatusChange
     * @param {string} event
     * @global
     */
    /**
     * @param {onRequestStatusChange} onRequestStatusChange Set canvas onChangeToolsBlockerState callback
     * @returns {void}
     */
    set onChangeToolsBlockerState(onChangeToolsBlockerState) {
        this._params.canvas.onChangeToolsBlockerState = onChangeToolsBlockerState;
    }
}

module.exports = MLModel;

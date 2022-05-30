// Copyright (C) 2019-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/**
 * Class representing a serverless function
 * @memberof module:API.cvat.classes
 */
class MLModel {
    constructor(data) {
        this._id = data.id;
        this._name = data.name;
        this._labels = data.labels;
        this._attributes = data.attributes || [];
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
     * @type {string}
     * @readonly
     */
    get id() {
        return this._id;
    }

    /**
     * @type {string}
     * @readonly
     */
    get name() {
        return this._name;
    }

    /**
     * @description labels supported by the model
     * @type {string[]}
     * @readonly
     */
    get labels() {
        if (Array.isArray(this._labels)) {
            return [...this._labels];
        }

        return [];
    }

    /**
     * @typedef ModelAttribute
     * @property {string} name
     * @property {string[]} values
     * @property {'select'|'number'|'checkbox'|'radio'|'text'} input_type
     */
    /**
     * @type {Object<string, ModelAttribute>}
     * @readonly
     */
    get attributes() {
        return { ...this._attributes };
    }

    /**
     * @type {string}
     * @readonly
     */
    get framework() {
        return this._framework;
    }

    /**
     * @type {string}
     * @readonly
     */
    get description() {
        return this._description;
    }

    /**
     * @type {module:API.cvat.enums.ModelType}
     * @readonly
     */
    get type() {
        return this._type;
    }

    /**
     * @type {object}
     * @readonly
     */
    get params() {
        return {
            canvas: { ...this._params.canvas },
        };
    }

    /**
     * @type {MlModelTip}
     * @property {string} message A short message for a user about the model
     * @property {string} gif A gif URL to be shown to a user as an example
     * @readonly
     */
    get tip() {
        return { ...this._tip };
    }

    /**
     * @typedef onRequestStatusChange
     * @param {string} event
     * @global
    */
    /**
     * @param {onRequestStatusChange} onRequestStatusChange
     * @instance
     * @description Used to set a callback when the tool is blocked in UI
     * @returns {void}
    */
    set onChangeToolsBlockerState(onChangeToolsBlockerState) {
        this._params.canvas.onChangeToolsBlockerState = onChangeToolsBlockerState;
    }
}

module.exports = MLModel;

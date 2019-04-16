/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported FilterModel FilterController FilterView */
/* eslint no-unused-vars: ["error", { "caughtErrors": "none" }] */

/* global
    defiant:false
*/

class FilterModel {
    constructor(update) {
        this._filter = '';
        this._update = update;
        this._labels = window.cvat.labelsInfo.labels();
        this._attributes = window.cvat.labelsInfo.attributes();
    }

    _convertShape(shape) {
        const converted = {
            id: shape.model.id,
            serverid: shape.model.serverID,
            label: shape.model.label,
            type: shape.model.type.split('_')[1],
            mode: shape.model.type.split('_')[0],
            occluded: Boolean(shape.interpolation.position.occluded),
            attr: convertAttributes(shape.interpolation.attributes),
            lock: shape.model.lock,
        };

        if (shape.model.type.split('_')[1] === 'box') {
            converted.width = shape.interpolation.position.xbr - shape.interpolation.position.xtl;
            converted.height = shape.interpolation.position.ybr - shape.interpolation.position.ytl;
        } else {
            converted.width = shape.interpolation.position.width;
            converted.height = shape.interpolation.position.height;
        }

        return converted;

        // We replace all dashes due to defiant.js can't work with it
        function convertAttributes(attributes) {
            const convertedAttributes = {};
            for (const attrId in attributes) {
                if (Object.prototype.hasOwnProperty.call(attributes, attrId)) {
                    const key = attributes[attrId].name.toLowerCase().replace(/[-,\s]+/g, '_');
                    convertedAttributes[key] = String(attributes[attrId].value).toLowerCase();
                }
            }
            return convertedAttributes;
        }
    }

    _convertCollection(collection) {
        let converted = {};
        for (let labelId in this._labels) {
            converted[this._labels[labelId].replace(/[-,\s]+/g, '_')] = [];
        }

        for (const shape of collection) {
            converted[this._labels[shape.model.label].toLowerCase().replace(/[-,\s]+/g, '_')].push(this._convertShape(shape));
        }
        return converted;
    }

    filter(interpolation) {
        if (this._filter.length) {
            // Get shape indexes
            try {
                const idxs = defiant.search(this._convertCollection(interpolation), `(${this._filter})/id`);
                return interpolation.filter(x => idxs.indexOf(x.model.id) !== -1);
            } catch (ignore) {
                return [];
            }
        } else {
            return interpolation;
        }
    }

    updateFilter(value, silent) {
        this._filter = value;
        if (!silent) {
            this._update();
        }
    }
}

class FilterController {
    constructor(filterModel) {
        this._model = filterModel;
    }

    updateFilter(value, silent) {
        if (value.length) {
            value = value.split('|').map(x => `/d:data/${x}`).join('|').toLowerCase()
                .replace(/[-,\s]+/g, '_');
            try {
                document.evaluate(value, document, () => 'ns');
            } catch (ignore) {
                return false;
            }
            this._model.updateFilter(value, silent);
            return true;
        }

        this._model.updateFilter('', silent);
        return true;
    }

    deactivate() {
        this._model.active = false;
    }
}


class FilterView {
    constructor(filterController) {
        this._controller = filterController;
        this._filterString = $("#filterInputString");
        this._resetFilterButton = $("#resetFilterButton");
        this._filterString.on("keypress keydown keyup", (e) => e.stopPropagation());
        this._filterSubmitList = $("#filterSubmitList");

        let predefinedValues = null;
        try {
            predefinedValues = JSON.parse(localStorage.getItem("filterValues")) || [];
        }
        catch (ignore) {
            predefinedValues = [];
        }

        let initSubmitList = () => {
            this._filterSubmitList.empty();
            for (let value of predefinedValues) {
                value = value.replace(/'/g, '"');
                this._filterSubmitList.append(`<option value='${value}'> ${value} </option>`);
            }
        }
        initSubmitList();

        this._filterString.on("change", (e) => {
            let value = $.trim(e.target.value).replace(/'/g, '"');
            if (this._controller.updateFilter(value, false)) {
                this._filterString.css("color", "green");
                if (!predefinedValues.includes(value)) {
                    predefinedValues = (predefinedValues.concat([value])).slice(-10);
                    localStorage.setItem("filterValues", JSON.stringify(predefinedValues));
                    initSubmitList();
                }
            }
            else {
                this._filterString.css("color", "red");
                this._controller.updateFilter("", false);
            }
        });

        let shortkeys = window.cvat.config.shortkeys;
        this._filterString.attr("title", `
            ${shortkeys["prev_filter_frame"].view_value} - ${shortkeys["prev_filter_frame"].description}` + `\n` +
            `${shortkeys["next_filter_frame"].view_value} - ${shortkeys["next_filter_frame"].description}`);

        this._resetFilterButton.on("click", () => {
            this._filterString.prop("value", "");
            this._controller.updateFilter("", false);
        });

        let initialFilter = window.cvat.search.get("filter");
        if (initialFilter) {
            this._filterString.prop("value", initialFilter);
            if (this._controller.updateFilter(initialFilter, true)) {
                this._filterString.css("color", "green");
            }
            else {
                this._filterString.prop("value", "");
                this._filterString.css("color", "red");
            }
        }
    }
}

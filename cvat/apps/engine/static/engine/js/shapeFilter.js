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
        this._regex = /^[0-9]+|[-,?!()\s]+/g;
        this._filter = '';
        this._update = update;
        this._labels = window.cvat.labelsInfo.labels();
        this._attributes = window.cvat.labelsInfo.attributes();
    }

    _convertShape(shape) {
        // We replace all special characters due to defiant.js can't work with them
        function convertAttributes(attributes) {
            const convertedAttributes = {};
            for (const attrId in attributes) {
                if (Object.prototype.hasOwnProperty.call(attributes, attrId)) {
                    const key = attributes[attrId].name
                        .toLowerCase().replace(this._regex, '_');
                    convertedAttributes[key] = String(attributes[attrId].value)
                        .toLowerCase();
                }
            }
            return convertedAttributes;
        }

        const converted = {
            id: shape.model.id,
            serverid: shape.model.serverID,
            label: shape.model.label,
            type: shape.model.type.split('_')[1],
            mode: shape.model.type.split('_')[0],
            occluded: Boolean(shape.interpolation.position.occluded),
            attr: convertAttributes.call(this, shape.interpolation.attributes),
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
    }

    _convertCollection(collection) {
        const converted = {};
        for (const labelId in this._labels) {
            if (Object.prototype.hasOwnProperty.call(this._labels, labelId)) {
                converted[this._labels[labelId].toLowerCase().replace(this._regex, '_')] = [];
            }
        }

        for (const shape of collection) {
            converted[this._labels[shape.model.label]
                .toLowerCase().replace(this._regex, '_')]
                .push(this._convertShape.call(this, shape));
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

    get regex() {
        return this._regex;
    }
}

class FilterController {
    constructor(filterModel) {
        this._model = filterModel;
    }

    updateFilter(value, silent) {
        if (!value.length) {
            this._model.updateFilter('', silent);
            return true;
        }

        try {
            value = value.toLowerCase();

            const labels = String.customSplit(value, '[|]').map(el => el.trim());
            let result = '';
            for (const label of labels) {
                const labelName = label.match(/^[-,?!_0-9a-z()*\s"]+/)[0];
                const labelFilters = label.substr(labelName.length).trim();

                result += `${labelName.replace(this._model.regex, '_').replace(/"/g, '')}`;

                const orExpressions = String.customSplit(labelFilters, 'or').map(el => el.trim());
                const formattedOrExpressions = [];
                for (const orExpression of orExpressions) {
                    const andExpressions = String.customSplit(orExpression, 'and').map(el => el.trim());
                    const formattedAndExpressions = [];
                    for (const andExpression of andExpressions) {
                        if (andExpression.includes('attr/')) {
                            const attrMatch = andExpression.match(/[\\[(]*attr\//);
                            const attrPrefix = attrMatch[0];
                            const attrExpression = andExpression.substr(attrMatch.index
                                + attrPrefix.length);
                            const [attrName, attrValue] = String
                                .customSplit(attrExpression, '=|<=|>=|<|>|!=');
                            const condition = attrExpression
                                .slice(attrName.length, -attrValue.length).trim();

                            formattedAndExpressions
                                .push(`${attrPrefix}${attrName.trim().replace(this._model.regex, '_')
                                    .replace(/"/g, '')}${condition}${attrValue.trim()}`);
                        } else {
                            formattedAndExpressions.push(andExpression);
                        }
                    }

                    if (formattedAndExpressions.length > 1) {
                        formattedOrExpressions.push(formattedAndExpressions.join(' and '));
                    } else {
                        formattedOrExpressions.push(formattedAndExpressions[0]);
                    }
                }

                if (formattedOrExpressions.length > 1) {
                    result += `${formattedOrExpressions.join(' or ')}`;
                } else {
                    result += `${formattedOrExpressions[0]}`;
                }

                result += '|';
            }

            result = result.substr(0, result.length - 1);
            result = result.split('|').map(x => `/d:data/${x}`).join('|');

            document.evaluate(result, document, () => 'ns');

            this._model.updateFilter(result, silent);
        } catch (ignore) {
            return false;
        }

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

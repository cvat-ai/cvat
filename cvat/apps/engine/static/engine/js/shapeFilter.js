/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported FilterModel FilterController FilterView */
"use strict";

class FilterModel {
    constructor(update) {
        this._filter = '';
        this._update = update;
        this._labels = window.cvat.labelsInfo.labels();
        this._attributes = window.cvat.labelsInfo.attributes();
    }

    _convertShape(shape) {
        return {
            id: shape.model.id,
            label: shape.model.label,
            type: shape.model.type.split('_')[1],
            mode: shape.model.type.split('_')[0],
            occluded: shape.interpolation.position.occluded ? true : false,
            attr: convertAttributes(shape.interpolation.attributes),
            lock: shape.model.lock
        };

        // We replace all dashes due to defiant.js can't work with it
        function convertAttributes(attributes) {
            let converted = {};
            for (let attrId in attributes) {
                converted[attributes[attrId].name.toLowerCase().replace(/-/g, "_")] = ('' + attributes[attrId].value).toLowerCase();
            }
            return converted;
        }
    }

    _convertCollection(collection) {
        let converted = {};
        for (let labelId in this._labels) {
            converted[this._labels[labelId].replace(/-/g, "_")] = [];
        }

        for (let shape of collection) {
            converted[this._labels[shape.model.label].toLowerCase().replace(/-/g, "_")].push(this._convertShape(shape));
        }
        return converted;
    }

    filter(interpolation) {
        if (this._filter.length) {
            // Get shape indexes
            try {
                let idxs = JSON.search(this._convertCollection(interpolation), `(${this._filter})/id`);
                return interpolation.filter(x => idxs.indexOf(x.model.id) != -1);
            }
            catch(err) {
                return [];
            }
        }
        else {
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
            value = value.split('|').map(x => '/d:data/' + x).join('|').toLowerCase().replace(/-/g, "_");
            try {
                document.evaluate(value, document, () => 'ns');
            }
            catch (error) {
                return false;
            }
            this._model.updateFilter(value, silent);
            return true;
        }
        else {
            this._model.updateFilter('', silent);
            return true;
        }
    }

    deactivate() {
        this._model.active = false;
    }
}


class FilterView {
    constructor(filterController) {
        this._controller = filterController;
        this._filterString = $('#filterInputString');
        this._resetFilterButton = $('#resetFilterButton');

        this._filterString.attr('placeholder', 'car[attr/model="mazda"]');
        this._filterString.on('keypress keydown keyup', (e) => e.stopPropagation());
        this._filterString.on('change', (e) => {
            let value = $.trim(e.target.value);
            if (this._controller.updateFilter(value, false)) {
                this._filterString.css('color', 'green');
            }
            else {
                this._filterString.css('color', 'red');
                this._controller.updateFilter('', false);
            }
        });

        let shortkeys = window.cvat.config.shortkeys;
        this._filterString.attr('title', `
            ${shortkeys['prev_filter_frame'].view_value} - ${shortkeys['prev_filter_frame'].description}` + `\n` +
            `${shortkeys['next_filter_frame'].view_value} - ${shortkeys['next_filter_frame'].description}`);

        this._resetFilterButton.on('click', () => {
            this._filterString.prop('value', '');
            this._controller.updateFilter('', false);
        });

        let initialFilter = window.cvat.search.get('filter');
        if (initialFilter) {
            this._filterString.prop('value', initialFilter);
            if (this._controller.updateFilter(initialFilter, true)) {
                this._filterString.css('color', 'green');
            }
            else {
                this._filterString.prop('value', '');
                this._filterString.css('color', 'red');
            }
        }
    }
}

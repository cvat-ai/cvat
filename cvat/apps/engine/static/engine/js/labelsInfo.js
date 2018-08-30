/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported LabelsInfo */
"use strict";

class LabelsInfo {
    constructor(job) {
        this._labels = new Object;
        this._attributes = new Object;
        this._colorIdxs = new Object;

        for (let labelKey in job.labels) {
            let label = {
                name: job.labels[labelKey],
                attributes: {},
            };

            for (let attrKey in job.attributes[labelKey]) {
                label.attributes[attrKey] = parseAttributeRow.call(this, job.attributes[labelKey][attrKey]);
                this._attributes[attrKey] = label.attributes[attrKey];
            }

            this._labels[labelKey] = label;
            this._colorIdxs[labelKey] = +labelKey;
        }

        function parseAttributeRow(attrRow) {
            let match = attrRow.match(/([~@]{1})(.+)=(.+):(.*)/);
            if (match == null) {
                let message = 'Can not parse attribute string: ' + attrRow;
                showMessage(message);
                throw new Error(message);
            }

            return {
                mutable: match[1] === "~",
                type: match[2],
                name: match[3],
                values: this.strToValues(match[2], match[4]),
            };
        }
    }

    labelColorIdx(labelId) {
        return this._colorIdxs[labelId];
    }

    updateLabelColorIdx(labelId) {
        if (labelId in this._colorIdxs) {
            this._colorIdxs[labelId] += 1;
        }
    }

    normalize() {
        let labels = "";
        for (let labelId in this._labels) {
            labels += " " + this._labels[labelId].name;
            for (let attrId in this._labels[labelId].attributes) {
                let attr = this._labels[labelId].attributes[attrId];
                labels += ' ' + (attr.mutable? "~":"@");
                labels += attr.type + '=' + attr.name + ':';
                labels += attr.values.map(function(val) {
                    val = String(val);
                    return val.search(' ') != -1? "'" + val + "'": val;
                }).join(',');
            }
        }

        return labels.trim();
    }

    labels() {
        let tempLabels = new Object();
        for (let labelId in this._labels) {
            tempLabels[labelId] = this._labels[labelId].name;
        }
        return tempLabels;
    }


    labelAttributes(labelId) {
        let attributes = new Object();
        if (labelId in this._labels) {
            for (let attrId in this._labels[labelId].attributes) {
                attributes[attrId] = this._labels[labelId].attributes[attrId].name;
            }
        }
        return attributes;
    }


    attributes() {
        let attributes = new Object();
        for (let attrId in this._attributes) {
            attributes[attrId] = this._attributes[attrId].name;
        }
        return attributes;
    }


    attrInfo(attrId) {
        let info = new Object();
        if (attrId in this._attributes) {
            let object = this._attributes[attrId];
            info.name = object.name;
            info.type = object.type;
            info.mutable = object.mutable;
            info.values = object.values.slice();
        }
        return info;
    }


    labelIdOf(name) {
        for (let labelId in this._labels) {
            if (this._labels[labelId].name === name) {
                return +labelId;
            }
        }
        return null;
    }


    attrIdOf(labelId, name) {
        let attributes = this.labelAttributes(labelId);
        for (let attrId in attributes) {
            if (this._attributes[attrId].name === name) {
                return +attrId;
            }
        }
        return null;
    }

    strToValues(type, string) {
        switch (type) {
        case 'checkbox':
            return [string !== '0' && string !== 'false' && string !== false];
        case 'text':
            return [string];
        default:
            return string.toString().split(',');
        }
    }
}

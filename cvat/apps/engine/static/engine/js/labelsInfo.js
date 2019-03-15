/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported LabelsInfo */

/* global
    showMessage:false
*/

"use strict";

class LabelsInfo {
    constructor(labels) {
        this._labels = {};
        this._attributes = {};
        this._colorIdxs = {};

        for (let label of labels) {
            this._labels[label.id] = {
                name: label.name,
                attributes: {},
            }

            for (let attr of label.attributes) {
                this._attributes[attr.id] = convertAttribute(attr);
                this._labels[label.id].attributes[attr.id] = this._attributes[attr.id];

            }

            this._colorIdxs[label.id] = +label.id;
        }

        function convertAttribute(attribute) {
            return {
                mutable: attribute.mutable,
                type: attribute.input_type,
                name: attribute.name,
                values: attribute.input_type === 'checkbox' ?
                    [attribute.values[0].toLowerCase() !== 'false' && attribute.values[0] !== false] :
                    attribute.values,
            }
        }

        return this;
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
        if (type === 'checkbox') {
            const value =
                string !== '0' &&
                string !== false &&
                String(string).toLowerCase() !== 'false';
            return [value];
        } else if (type === 'text') {
            return [string];
        } else if (type === 'number') {
            return String(string).split(',');
        } else {
            return string.split(',');
        }
    }

    static serialize(deserialized) {
        let serialized = "";
        for (let label of deserialized) {
            serialized += " " + label.name;
            for (let attr of label.attributes) {
                serialized += ' ' + (attr.mutable? "~":"@");
                serialized += attr.input_type + '=' + attr.name + ':';
                serialized += attr.values.join(',');
            }
        }

        return serialized.trim();
    }

    static deserialize(serialized) {
        const normalized = serialized.replace(/'+/g, `'`).replace(/"+/g, `"`).replace(/\s+/g, ` `).trim();
        const fragments = String.customSplit(normalized, ' ');

        const deserialized = [];
        let latest = null;
        for (let fragment of fragments) {
            fragment = fragment.replace(/\+/g, ' ').trim();
            if ((fragment.startsWith('~')) || (fragment.startsWith('@'))) {
                const regex = /(@|~)(checkbox|select|number|text|radio)=([,?!-_0-9a-zA-Z()\s"]+):([,?!-_0-9a-zA-Z()"\s]+)/g;
                const result = regex.exec(fragment);
                if (result === null || latest === null) {
                    throw Error('Bad labels format');
                }

                const values = String.customSplit(result[4], ',');
                latest.attributes.push({
                    name: result[3],
                    mutable: result[1] === '~',
                    input_type: result[2],
                    default_value: values[0],
                    values: values,
                });
            } else {
                latest = {
                    name: fragment,
                    attributes: []
                };

                deserialized.push(latest);
            }
        }
        return deserialized;
    }
}

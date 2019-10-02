/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported LabelsInfo */

class LabelsInfo {
    constructor(labels) {
        function convertAttribute(attribute) {
            return {
                mutable: attribute.mutable,
                type: attribute.input_type,
                name: attribute.name,
                values: attribute.input_type === 'checkbox'
                    ? [attribute.values[0].toLowerCase() !== 'false'] : attribute.values,
            };
        }

        this._labels = {};
        this._attributes = {};
        this._colorIdxs = {};

        for (const label of labels) {
            this._labels[label.id] = {
                name: label.name,
                attributes: {},
            };

            for (const attr of label.attributes) {
                this._attributes[attr.id] = convertAttribute(attr);
                this._labels[label.id].attributes[attr.id] = this._attributes[attr.id];
            }

            this._colorIdxs[label.id] = +label.id;
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


    labels() {
        const labels = {};
        for (const labelId in this._labels) {
            if (Object.prototype.hasOwnProperty.call(this._labels, labelId)) {
                labels[labelId] = this._labels[labelId].name;
            }
        }
        return labels;
    }


    labelAttributes(labelId) {
        if (labelId in this._labels) {
            const attributes = {};
            const labelAttributes = this._labels[labelId].attributes;
            for (const attrId in labelAttributes) {
                if (Object.prototype.hasOwnProperty.call(labelAttributes, attrId)) {
                    attributes[attrId] = labelAttributes[attrId].name;
                }
            }
            return attributes;
        }
        throw Error('Unknown label ID');
    }


    attributes() {
        const attributes = {};
        for (const attrId in this._attributes) {
            if (Object.prototype.hasOwnProperty.call(this._attributes, attrId)) {
                attributes[attrId] = this._attributes[attrId].name;
            }
        }
        return attributes;
    }


    attrInfo(attrId) {
        if (attrId in this._attributes) {
            return JSON.parse(JSON.stringify(this._attributes[attrId]));
        }
        throw Error('Unknown attribute ID');
    }


    labelIdOf(name) {
        for (const labelId in this._labels) {
            if (this._labels[labelId].name === name) {
                return +labelId;
            }
        }
        throw Error('Unknown label name');
    }


    attrIdOf(labelId, name) {
        const attributes = this.labelAttributes(labelId);
        for (const attrId in attributes) {
            if (this._attributes[attrId].name === name) {
                return +attrId;
            }
        }
        throw Error('Unknown attribute name');
    }


    static normalize(type, attrValue) {
        const value = String(attrValue);
        if (type === 'checkbox') {
            return value !== '0' && value.toLowerCase() !== 'false';
        }

        if (type === 'text') {
            return value;
        }

        if (type === 'number') {
            if (Number.isNaN(+value)) {
                throw Error(`Can not convert ${value} to number.`);
            } else {
                return +value;
            }
        }

        return value;
    }


    static serialize(deserialized) {
        let serialized = '';
        for (const label of deserialized) {
            serialized += ` ${label.name}`;
            for (const attr of label.attributes) {
                serialized += ` ${attr.mutable ? '~' : '@'}`;
                serialized += `${attr.input_type}=${attr.name}:`;
                serialized += attr.values.join(',');
            }
        }

        return serialized.trim();
    }


    static deserialize(serialized) {
        const normalized = serialized.replace(/'+/g, '\'').replace(/\s+/g, ' ').trim();
        const fragments = String.customSplit(normalized, ' ');

        const deserialized = [];
        let latest = null;
        for (let fragment of fragments) {
            fragment = fragment.trim();
            if ((fragment.startsWith('~')) || (fragment.startsWith('@'))) {
                const regex = /(@|~)(checkbox|select|number|text|radio)=(.+):(.+)/g;
                const result = regex.exec(fragment);
                if (result === null || latest === null) {
                    throw Error('Bad labels format');
                }

                const values = String.customSplit(result[4], ',');
                latest.attributes.push({
                    name: result[3].replace(/^"/, '').replace(/"$/, ''),
                    mutable: result[1] === '~',
                    input_type: result[2],
                    default_value: values[0].replace(/^"/, '').replace(/"$/, ''),
                    values: values.map(val => val.replace(/^"/, '').replace(/"$/, '')),
                });
            } else {
                latest = {
                    name: fragment.replace(/^"/, '').replace(/"$/, ''),
                    attributes: [],
                };

                deserialized.push(latest);
            }
        }
        return deserialized;
    }
}

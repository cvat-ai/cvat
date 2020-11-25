// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

const jsonpath = require('jsonpath');
const { AttributeType, ObjectType } = require('./enums');
const { ArgumentError } = require('./exceptions');

class AnnotationsFilter {
    constructor() {
        // eslint-disable-next-line security/detect-unsafe-regex
        this.operatorRegex = /(==|!=|<=|>=|>|<)(?=(?:[^"]*(["])[^"]*\2)*[^"]*$)/g;
    }

    // Method splits expression by operators that are outside of any brackets
    _splitWithOperator(container, expression) {
        const operators = ['|', '&'];
        const splitted = [];
        let nestedCounter = 0;
        let isQuotes = false;
        let start = -1;

        for (let i = 0; i < expression.length; i++) {
            if (expression[i] === '"') {
                // all quotes inside other quotes must
                // be escaped by a user and changed to ` above
                isQuotes = !isQuotes;
            }

            // We don't split with operator inside brackets
            // It will be done later in recursive call
            if (!isQuotes && expression[i] === '(') {
                nestedCounter++;
            }
            if (!isQuotes && expression[i] === ')') {
                nestedCounter--;
            }

            if (operators.includes(expression[i])) {
                if (!nestedCounter) {
                    const subexpression = expression.substr(start + 1, i - start - 1).trim();
                    splitted.push(subexpression);
                    splitted.push(expression[i]);
                    start = i;
                }
            }
        }

        const subexpression = expression.substr(start + 1).trim();
        splitted.push(subexpression);

        splitted.forEach((internalExpression) => {
            if (internalExpression === '|' || internalExpression === '&') {
                container.push(internalExpression);
            } else {
                this._groupByBrackets(container, internalExpression);
            }
        });
    }

    // Method groups bracket containings to nested arrays of container
    _groupByBrackets(container, expression) {
        if (!(expression.startsWith('(') && expression.endsWith(')'))) {
            container.push(expression);
        }

        let nestedCounter = 0;
        let startBracket = null;
        let endBracket = null;
        let isQuotes = false;

        for (let i = 0; i < expression.length; i++) {
            if (expression[i] === '"') {
                // all quotes inside other quotes must
                // be escaped by a user and changed to ` above
                isQuotes = !isQuotes;
            }

            if (!isQuotes && expression[i] === '(') {
                nestedCounter++;
                if (startBracket === null) {
                    startBracket = i;
                }
            }

            if (!isQuotes && expression[i] === ')') {
                nestedCounter--;
                if (!nestedCounter) {
                    endBracket = i;

                    const subcontainer = [];
                    const subexpression = expression.substr(startBracket + 1, endBracket - 1 - startBracket);
                    this._splitWithOperator(subcontainer, subexpression);

                    container.push(subcontainer);

                    startBracket = null;
                    endBracket = null;
                }
            }
        }

        if (startBracket !== null) {
            throw Error('Extra opening bracket found');
        }
        if (endBracket !== null) {
            throw Error('Extra closing bracket found');
        }
    }

    _parse(expression) {
        const groups = [];
        this._splitWithOperator(groups, expression);
    }

    _join(groups) {
        let expression = '';
        for (const group of groups) {
            if (Array.isArray(group)) {
                expression += `(${this._join(group)})`;
            } else if (typeof group === 'string') {
                // it can be operator or expression
                if (group === '|' || group === '&') {
                    expression += group;
                } else {
                    let [field, operator, , value] = group.split(this.operatorRegex);
                    field = `@.${field.trim()}`;
                    operator = operator.trim();
                    value = value.trim();
                    if (value === 'width' || value === 'height' || value.startsWith('attr')) {
                        value = `@.${value}`;
                    }
                    expression += [field, operator, value].join('');
                }
            }
        }

        return expression;
    }

    _convertObjects(statesData) {
        const objects = statesData.map((state) => {
            const labelAttributes = state.label.attributes.reduce((acc, attr) => {
                acc[attr.id] = attr;
                return acc;
            }, {});

            let xtl = Number.MAX_SAFE_INTEGER;
            let xbr = Number.MIN_SAFE_INTEGER;
            let ytl = Number.MAX_SAFE_INTEGER;
            let ybr = Number.MIN_SAFE_INTEGER;
            let [width, height] = [null, null];

            if (state.objectType !== ObjectType.TAG) {
                state.points.forEach((coord, idx) => {
                    if (idx % 2) {
                        // y
                        ytl = Math.min(ytl, coord);
                        ybr = Math.max(ybr, coord);
                    } else {
                        // x
                        xtl = Math.min(xtl, coord);
                        xbr = Math.max(xbr, coord);
                    }
                });
                [width, height] = [xbr - xtl, ybr - ytl];
            }

            const attributes = {};
            Object.keys(state.attributes).reduce((acc, key) => {
                const attr = labelAttributes[key];
                let value = state.attributes[key].replace(/\\"/g, '`');
                if (attr.inputType === AttributeType.NUMBER) {
                    value = +value;
                } else if (attr.inputType === AttributeType.CHECKBOX) {
                    value = value === 'true';
                }
                acc[attr.name] = value;
                return acc;
            }, attributes);

            return {
                width,
                height,
                attr: attributes,
                label: state.label.name.replace(/\\"/g, '`'),
                serverID: state.serverID,
                clientID: state.clientID,
                type: state.objectType,
                shape: state.shapeType,
                occluded: state.occluded,
            };
        });

        return {
            objects,
        };
    }

    toJSONQuery(filters) {
        try {
            if (!Array.isArray(filters) || filters.some((value) => typeof value !== 'string')) {
                throw Error('Argument must be an array of strings');
            }

            if (!filters.length) {
                return [[], '$.objects[*].clientID'];
            }

            const groups = [];
            const expression = filters
                .map((filter) => `(${filter})`)
                .join('|')
                .replace(/\\"/g, '`');
            this._splitWithOperator(groups, expression);
            return [groups, `$.objects[?(${this._join(groups)})].clientID`];
        } catch (error) {
            throw new ArgumentError(`Wrong filter expression. ${error.toString()}`);
        }
    }

    filter(statesData, query) {
        try {
            const objects = this._convertObjects(statesData);
            return jsonpath.query(objects, query);
        } catch (error) {
            throw new ArgumentError(`Could not apply the filter. ${error.toString()}`);
        }
    }
}

module.exports = AnnotationsFilter;

// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { inspect } from 'util';

export function generateString(countPointsToMove, arrow) {
    let action = '';
    for (let i = 0; i < countPointsToMove; i++) {
        action += `{${arrow}}`;
    }
    return action;
}

function deltaTransformPoint(matrix, point) {
    const dx = point.x * matrix.a + point.y * matrix.c;
    const dy = point.x * matrix.b + point.y * matrix.d;
    return { x: dx, y: dy };
}

export function decomposeMatrix(matrix) {
    const px = deltaTransformPoint(matrix, { x: 0, y: 1 });
    const skewX = ((180 / Math.PI) * Math.atan2(px.y, px.x) - 90).toFixed(1);
    return skewX;
}

export function translatePoints(points, delta, axis) {
    if (axis === 'x') {
        return [
            points[0] + delta,
            points[1],
            points[2] + delta,
            points[3],
        ];
    }
    if (axis === 'y') {
        return [
            points[0],
            points[1] + delta,
            points[2],
            points[3] + delta,
        ];
    }
    return points;
}

export function fullMatch(string) {
    // eslint-disable-next-line security/detect-non-literal-regexp
    return new RegExp(`^${string}$`);
}

export function convertClasses(data, $win) {
    if (typeof data !== 'object' || data === null) {
        return data;
    }

    const prototype = Object.getPrototypeOf(data);
    if ([null, Object.prototype].includes(prototype)) {
        let clone = $win.Object.create(null);

        if (prototype === Object.prototype) {
            clone = new $win.Object();
        }

        for (const key of Object.keys(data)) {
            clone[key] = convertClasses(data[key], $win);
        }

        return clone;
    }

    if (Array.isArray(data)) {
        const clone = new $win.Array();
        for (const item of data) {
            clone.push(convertClasses(item, $win));
        }
        return clone;
    }

    return data;
}

export function toSnakeCase(obj) {
    const result = {};
    for (const [k, v] of Object.entries(obj)) {
        result[Cypress._.snakeCase(k)] = v;
    }
    return result;
}

export const aYearFrom = (date) => new Date(
    new Date(date.getTime())
        .setFullYear(date.getFullYear() + 1),
);
export const aMonthFrom = (date) => new Date(
    new Date(date.getTime())
        .setMonth(date.getMonth() + 1),
);

/**
 * Build a Date object from Date Time String Format
 * @param {string} s - YYYY-MM-DDTHH:mm:ss.sssZ
 * @returns {Date}
 */
export const parseDatetime = (s) => new Date(Date.parse(s));

/**
 * Transform Date object to datetime string with format DD/MM/YYYY
 * @param {Date} date
 * @returns {String}
 */
export function format(date) {
    const [yyyy, mm, dd] = [
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate(),
    ].map((n) => String(n).padStart(2, '0'));
    return `${dd}/${mm}/${yyyy}`;
}

/**
 * Format and expand an object for assertion logs.
 * fixes [object object] in logs
 * @param {any} obj
 * @returns {string}
 */
export function prettify(obj) {
    // note: JSON.stringify doesn't expand the object
    return inspect(obj, { depth: 6 });
}

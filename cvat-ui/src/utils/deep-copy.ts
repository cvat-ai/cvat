// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

function deepCopy<T>(obj: T): T {
    if (typeof obj !== 'object') {
        return obj;
    }
    if (!obj) {
        return obj;
    }
    const container: any = (obj instanceof Array) ? [] : {};
    for (const i in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, i)) {
            container[i] = deepCopy(obj[i]);
        }
    }
    return container;
}

export default deepCopy;

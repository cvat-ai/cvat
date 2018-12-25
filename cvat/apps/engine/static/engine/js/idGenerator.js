/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

 /* exported
    IncrementIdGenerator
    ConstIdGenerator
*/

"use strict";

class IncrementIdGenerator {
    constructor(startId=0) {
        this._startId = startId;
    }

    next() {
        return this._startId++;
    }

    reset(startId=0) {
        this._startId = startId;
    }
}

class ConstIdGenerator {
    constructor(startId=-1) {
        this._startId = startId;
    }

    next() {
        return this._startId;
    }
}

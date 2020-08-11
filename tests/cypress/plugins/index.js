/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

const {imageGenerator} = require('../plugins/imageGenerator/addPlugin')

module.exports = (on) => {
    on('task', {imageGenerator})
}

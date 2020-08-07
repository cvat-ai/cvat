/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />
/**
 * @type {Cypress.PluginConfig}
 */

const {imageGenerator} = require('../plugins/imageGenerator/addPlugin')

module.exports = (on, config) => {
    on('task', {imageGenerator})
}

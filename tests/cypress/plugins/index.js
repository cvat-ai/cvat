/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

const {imageGenerator} = require('../plugins/imageGenerator/addPlugin')
const {createZipArchive} = require('../plugins/createZipArchive/addPlugin')
module.exports = (on, config) => {
    require('@cypress/code-coverage/task')(on, config)
    on('task', {imageGenerator})
    on('task', {createZipArchive})
    on('task', {
        log(message) {
            console.log(message)
            return null
        }
    })
    return config
}

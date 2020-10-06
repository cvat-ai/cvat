/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

const {imageGenerator} = require('../plugins/imageGenerator/addPlugin')
const {createZipArchive} = require('../plugins/createZipArchive/addPlugin')
const istanbul = require('istanbul-lib-coverage')
const { join } = require('path')
const { existsSync, mkdirSync, writeFileSync } = require('fs')
const execa = require('execa')

module.exports = (on) => {
    let coverageMap = istanbul.createCoverageMap({})
    const outputFolder = '../.nyc_output'
    const nycFilename = join(outputFolder, 'out.json')

    if (!existsSync(outputFolder)) {
      mkdirSync(outputFolder)
      console.log('created folder %s for output coverage', outputFolder)
    }

    on('task', {imageGenerator})
    on('task', {createZipArchive})
    on('task', {
        log(message) {
            console.log(message)
            return null
        }
    })
    on('task', {
        /**
         * Combines coverage information from single test
         * with previously collected coverage.
         */
        combineCoverage (coverage) {
          coverageMap.merge(coverage)
          return null
        },

        /**
         * Saves coverage information as a JSON file and calls
         */
        coverageReportPrepare () {
          writeFileSync(nycFilename, JSON.stringify(coverageMap, null, 2))
          return null
        }
    })
}

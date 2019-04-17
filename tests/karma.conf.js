/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

const path = require('path');
module.exports = function(config) {
  config.set({
    basePath: path.join(process.env.HOME, 'cvat/apps/'),
    frameworks: ['qunit'],
    files: [
      'engine/static/engine/js/labelsInfo.js',
      'engine/static/engine/js/annotationParser.js',
      'engine/static/engine/js/listener.js',
      'engine/static/engine/js/player.js',
      'engine/static/engine/js/shapes.js',
      'engine/static/engine/js/qunitTests.js',
    ],
    port: 9876,
    colors: true,
    autoWatch: false,
    browsers: ['ChromeNoSandbox'],

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true,

    // Concurrency level
    // how many browser should be started simultanous
    concurrency: Infinity,

    preprocessors: {
        '**/!(qunitTests).js': ['coverage']
    },

    reporters: ['progress', 'junit', 'coverage', 'coveralls'],

    coverageReporter: {
      dir: path.join(process.env.HOME, 'media/coverage'),
      reporters: [
        { type: 'html', subdir: '.' }, { type: 'lcov', subdir: '.' }
      ],
      instrumenterOptions: {
       istanbul: { noCompact: true }
     }
   },

    junitReporter: {
      outputDir: path.join(process.env.HOME, 'media/junit'),
      outputFile: undefined,
      useBrowserName: true,
      nameFormatter: undefined,
      classNameFormatter: undefined,
      properties: {},
      xmlVersion: null
    },

    customLaunchers: {
      ChromeNoSandbox: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox']
      }
    },

    logLevel: config.LOG_DEBUG
  });
}

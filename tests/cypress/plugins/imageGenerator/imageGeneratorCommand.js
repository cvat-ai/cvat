/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

"use strict";

Cypress.Commands.add('imageGenerator', function (directory, fileName, width, height, color, message) {
    return cy.task('imageGenerator', {
        directory: directory,
        fileName: fileName,
        width: width,
        height: height,
        color: color,
        message: message
      });
});

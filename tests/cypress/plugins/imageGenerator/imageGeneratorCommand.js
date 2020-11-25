// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

Cypress.Commands.add('imageGenerator', (directory, fileName, width, height, color, posX, posY, message, count) => {
    return cy.task('imageGenerator', {
        directory: directory,
        fileName: fileName,
        width: width,
        height: height,
        color: color,
        posX: posX,
        posY: posY,
        message: message,
        count: count,
    });
});

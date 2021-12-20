// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

Cypress.Commands.add('imageGenerator', (directory, fileName, width, height, color, posX, posY, message, count, extension = 'png') => cy.task('imageGenerator', {
    directory,
    fileName,
    width,
    height,
    color,
    posX,
    posY,
    message,
    count,
    extension,
}));

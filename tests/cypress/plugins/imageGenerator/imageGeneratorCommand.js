// Copyright (C) 2020-2022 Intel Corporation
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

Cypress.Commands.add('generateImageFromCanvas', (directory, fileName, width, height, color, posX, posY, message, textWidth, textHeightPx, extension = 'png') => cy.task('generateImageFromCanvas', {
    directory,
    fileName,
    width,
    height,
    color,
    posX,
    posY,
    message,
    textWidth,
    textHeightPx,
    extension,
}));

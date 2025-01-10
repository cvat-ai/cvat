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

Cypress.Commands.add('imageGeneratorManyObjects', (directory, fileName, width, height, color, posXs, posYs, message, imagesCount, extension = 'png') => cy.task('imageGeneratorManyObjects', {
    directory,
    fileName,
    width,
    height,
    color,
    posXs,
    posYs,
    message,
    imagesCount,
    extension,
}));

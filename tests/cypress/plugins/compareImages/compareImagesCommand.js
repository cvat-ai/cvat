// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

Cypress.Commands.add('compareImages', function (imgBase, imgAfterChanges) {
    return cy.task('compareImages', {
        imgBase: imgBase,
        imgAfterChanges: imgAfterChanges,
    });
});

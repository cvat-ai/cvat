// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

Cypress.Commands.add(
    'compareImages',
    (imgBase, imgAfterChanges) => cy.task('compareImages', {
        imgBase,
        imgAfterChanges,
    }),
);

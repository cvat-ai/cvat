// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Models page.', () => {
    const caseId = '51';

    before(() => {
        cy.visit('/');
        cy.login();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('The link to the models page and the models page exists.', () => {
            cy.goToModelsList();
        });
    });
});

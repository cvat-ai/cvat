// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Settings. "Auto save" option.', () => {
    const caseId = '51';

    before(() => {
        cy.visit('/');
        cy.login();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Link to models page exist.', () => {
            cy.goToModelsList();
        });
    });
});

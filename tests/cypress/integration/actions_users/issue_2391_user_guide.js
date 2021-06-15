// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Check User Guide.', () => {
    const issueId = '2391';

    describe(`Testing issue "${issueId}"`, () => {
        it('User Guide is available.', () => {
            cy.visit('documentation/user_guide.html');
        });
        it('Checking for the several elements.', () => {
            cy.get('#users-guide');
            cy.get('a');
            cy.get('img');
        });
    });
});

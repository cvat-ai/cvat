// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('When clicking on the Logout button, get the user session closed.', () => {
    const issueId = '1810';

    before(() => {
        cy.visit('auth/login');
    });

    describe(`Testing issue "${issueId}"`, () => {
        it('Login', () => {
            cy.login();
            cy.url().should('include', '/tasks');
        });
        it('Logout', () => {
            cy.logout();
            cy.url().should('include', '/auth/login');
        });
    });
});

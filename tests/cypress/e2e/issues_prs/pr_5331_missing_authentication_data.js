// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Check behavior in case of missing authentification data', () => {
    const prId = '5331';

    before(() => {
        cy.visit('auth/login');
    });

    describe(`Testing pr "${prId}"`, () => {
        it('Auto logout if authentication token is missing', () => {
            cy.login();
            cy.clearLocalStorage('token');
            cy.reload();
            cy.get('.cvat-login-form-wrapper').should('exist');
        });

        it('Cookies are set correctly if only token is present', () => {
            cy.login();
            cy.get('.cvat-tasks-page').should('exist');
            cy.clearCookies();
            cy.getCookies()
                .should('have.length', 0)
                .then(() => {
                    cy.reload();
                    cy.get('.cvat-tasks-page').should('exist');
                });
        });
    });
});

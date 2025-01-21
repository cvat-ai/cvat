// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

describe('Auth page cases', () => {
    before(() => {
        cy.headlessLogout();
    });

    it('Admin can login on the server using valid credentials', () => {
        cy.visit('/');
        cy.url().should('include', '/auth/login');
        cy.get('#credential').type(Cypress.env('user'));
        cy.get('#password').type(Cypress.env('password'));
        cy.get('[type="submit"]').click();
        cy.get('.cvat-tasks-page').should('exist').and('be.visible');
    });
});

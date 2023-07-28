// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

describe('Check server availability', () => {
    it('Server web interface is available', () => {
        cy.visit('/');
    });

    it('"/auth/login" contains in the URL', () => {
        cy.url().should('include', '/auth/login');
    });

    it('Check placeholder "Username"', () => {
        cy.get('#credential').type(Cypress.env('user'));
    });

    it('Check placeholder "Password"', () => {
        cy.get('#password').type(Cypress.env('password'));
    });

    it('Click to "Sign in" button', () => {
        cy.get('[type="submit"]').click();
    });
});

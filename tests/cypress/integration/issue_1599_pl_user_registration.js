// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Issue 1599 (Polish alphabet).', () => {
    before(() => {
        cy.visit('auth/register');
        cy.url().should('include', '/auth/register');
    });

    describe('User registration using the Polish alphabet.', () => {
        it('Filling in the placeholder "First name"', () => {
            cy.get('[placeholder="First name"]').type('Świętobor').should('not.have.class', 'has-error');
        });

        it('Filling in the placeholder "Last name"', () => {
            cy.get('[placeholder="Last name"]').type('Сzcić').should('not.have.class', 'has-error');
        });

        it('Filling in the placeholder "Username"', () => {
            cy.get('[placeholder="Username"]').type('Testuser_pl');
        });

        it('Filling in the placeholder "Email address"', () => {
            cy.get('[placeholder="Email address"]').type('Testuser_pl@local.local');
        });

        it('Filling in the placeholder "Password"', () => {
            cy.get('[placeholder="Password"]').type('Qwerty123!');
        });

        it('Filling in the placeholder "Confirm password"', () => {
            cy.get('[placeholder="Confirm password"]').type('Qwerty123!');
        });

        it('Click to "Submit" button', () => {
            cy.get('[type="submit"]').click();
        });

        it('Successful registration', () => {
            cy.url().should('include', '/tasks');
        });
    });
});

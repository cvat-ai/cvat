// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Issue 1599 (Polish alphabet).', () => {
    const firstName = 'Świętobor';
    const lastName = 'Сzcić';
    const userName = 'Testuser_pl';
    const email = 'Testuser_pl@local.local';
    const password = 'Qwerty123!';

    before(() => {
        cy.visit('auth/register');
        cy.url().should('include', '/auth/register');
    });

    after(() => {
        cy.logout(userName);
        cy.getAuthKey().then((authKey) => {
            cy.deleteUsers(authKey, [userName]);
        });
    });

    describe('User registration using the Polish alphabet.', () => {
        it('Filling in the placeholder "First name"', () => {
            cy.get('[placeholder="First name"]').type(firstName).should('not.have.class', 'has-error');
        });

        it('Filling in the placeholder "Last name"', () => {
            cy.get('[placeholder="Last name"]').type(lastName).should('not.have.class', 'has-error');
        });

        it('Filling in the placeholder "Username"', () => {
            cy.get('[placeholder="Username"]').type(userName);
        });

        it('Filling in the placeholder "Email address"', () => {
            cy.get('[placeholder="Email address"]').type(email);
        });

        it('Filling in the placeholder "Password"', () => {
            cy.get('[placeholder="Password"]').type(password);
        });

        it('Filling in the placeholder "Confirm password"', () => {
            cy.get('[placeholder="Confirm password"]').type(password);
        });

        it('Click to "Submit" button', () => {
            cy.get('[type="submit"]').click();
        });

        it('Successful registration', () => {
            cy.url().should('include', '/tasks');
        });
    });
});

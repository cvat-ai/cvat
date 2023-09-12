// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Issue 1599 (Chinese alphabet).', () => {
    const firstName = '测试者';
    const lastName = '测试';
    const userName = 'Testuser_ch';
    const email = 'Testuser_ch@local.local';
    const password = 'Qwerty123!';

    before(() => {
        cy.visit('auth/register');
        cy.url().should('include', '/auth/register');
    });

    after(() => {
        cy.logout();
        cy.getAuthKey().then((authKey) => {
            cy.deleteUsers(authKey, [userName]);
        });
    });

    describe('User registration using the Chinese alphabet.', () => {
        it('Filling in the placeholder "First name"', () => {
            cy.get('#firstName').type(firstName);
            cy.get('#firstName').should('not.have.class', 'has-error');
        });

        it('Filling in the placeholder "Last name"', () => {
            cy.get('#lastName').type(lastName);
            cy.get('#lastName').should('not.have.class', 'has-error');
        });

        it('Filling in the placeholder "Username"', () => {
            cy.get('#username').type(userName);
        });

        it('Filling in the placeholder "Email address"', () => {
            cy.get('#email').type(email);
        });

        it('Filling in the placeholder "Password"', () => {
            cy.get('#password1').type(password);
        });

        it('Click to "Submit" button', () => {
            cy.get('[type="submit"]').click();
        });
        it('Successful registration', () => {
            cy.url().should('include', '/tasks');
        });
    });
});

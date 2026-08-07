// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Check email verification system', () => {
    const firstName = 'email';
    const lastName = 'user';
    const userName = 'EmailUser';
    const emailAddr = `${userName}@local.local`;
    const password = 'notCommonPassword1!!!';

    before(() => {
        cy.visit('auth/register');
        cy.url().should('include', '/auth/register');
    });

    after(() => {
        cy.headlessLogin();
        cy.headlessDeleteUserByUsername(userName);
    });

    describe.skip('User registration', () => {
        // It is unclear how this functionality works at the moment
        it('Register user. Notification exists. Response status is successful.', () => {
            cy.intercept('POST', '/api/auth/register?**').as('userRegister');
            cy.userRegistration(firstName, lastName, userName, emailAddr, password);
            cy.get('.ant-notification-topRight')
                .contains(`We have sent an email with a confirmation link to ${emailAddr}.`)
                .should('exist');
            cy.wait('@userRegister').its('response.statusCode').should('eq', 201);
        });
    });
});

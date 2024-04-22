// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

const randomString = (isPassword) => {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    for (let i = 0; i <= 8; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return isPassword ? `${result}${Math.floor(Math.random() * 10)}` : result;
};

context('Check email verification system', () => {
    const caseId = 'Email verification system';
    const firstName = `${randomString()}`;
    const lastName = `${randomString()}`;
    const userName = `${randomString()}`;
    const emailAddr = `${userName}@local.local`;
    const password = `${randomString(true)}`;

    before(() => {
        cy.visit('auth/register');
        cy.url().should('include', '/auth/register');
    });

    describe(`Case: "${caseId}"`, () => {
        it('Register user. Notification exist. The response status is successful.', () => {
            cy.intercept('POST', '/api/auth/register?**').as('userRegister');
            cy.userRegistration(firstName, lastName, userName, emailAddr, password);
            cy.get('.ant-notification-topRight')
                .contains(`We have sent an email with a confirmation link to ${emailAddr}.`)
                .should('exist');
            cy.wait('@userRegister').its('response.statusCode').should('eq', 201);
        });
    });
});

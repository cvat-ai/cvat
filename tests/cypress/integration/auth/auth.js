// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

// eslint-disable-next-line import/no-extraneous-dependencies
import {
    When, Then, And,
} from 'cypress-cucumber-preprocessor/steps';

When('Server web interface is available', () => {
    cy.visit(Cypress.env('url'));
});

Then('{string} contains in the URL', (routeName) => {
    cy.url().should('include', routeName);
});

Then('Check {string} button', (buttonName) => {
    cy.getButton(buttonName).should('exist');
});

And('Check placeholder {string}', (placeholderName) => {
    cy.get('.ant-input').prev().should('contain', placeholderName);
});
When('Enter value in field {string}', (fieldName) => {
    cy.get(`#${fieldName}`).type('Email or username');
});

And('Clear field {string}', (fieldName) => {
    cy.get(`#${fieldName}`).clear();
});

When('Log in', () => {
    cy.login();
});

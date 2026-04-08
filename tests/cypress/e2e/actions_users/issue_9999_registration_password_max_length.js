// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Registration password length validation', () => {
    it('Shows a validation error and disables submit for passwords longer than 256 characters', () => {
        const oversizedPassword = `Aa1${'x'.repeat(254)}`;
        const suffix = Date.now();

        cy.visit('/auth/register');
        cy.url().should('include', '/auth/register');

        cy.get('#firstName').type('Test');
        cy.get('#lastName').type('User');
        cy.get('#username').type(`test_user_ui_limit_${suffix}`);
        cy.get('#email').type(`test_user_ui_limit_${suffix}@example.local`);
        cy.get('#password1').type(oversizedPassword).blur();

        cy.contains('Password must be between 8 and 256 characters').should('be.visible');
        cy.get('.cvat-credentials-action-button').should('be.disabled');
        cy.url().should('include', '/auth/register');
    });
});

// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Email confirmation page.', () => {

    const caseId = 106;

    describe(`Testing "Case ${caseId}."`, () => {
        it('Check email confirmation page.', () => {
            cy.visit('auth/email-confirmation');
            cy.url().should('include', '/auth/email-confirmation');
            cy.get('#email-confirmation-page-container').should('exist');
            // Automatic return to the login page
            cy.url().should('include', '/auth/login');
        });
    });
});

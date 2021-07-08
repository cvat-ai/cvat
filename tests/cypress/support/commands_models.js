// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

Cypress.Commands.add('goToModelsList', () => {
    cy.get('a[value="models"]').click();
    cy.url().should('include', '/models');
    cy.get('.cvat-models-page').should('exist');
});

// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

export function selectAll() {
    cy.get('.cvat-bulk-wrapper').should('exist').and('be.visible');
    cy.contains('Select all').click();
}

export function getBulkActionsMenu() {
    cy.get('.cvat-item-selected').first().within(() => {
        cy.get('.cvat-actions-menu-button').click();
    });
    return cy.get('.ant-dropdown');
}

export function assignAllTo(username, numberOfObjects = null) {
    if (numberOfObjects) {
        // if caller asks, check number of objects
        cy.contains(`Assignee (${numberOfObjects})`)
            .should('exist').and('be.visible').click();
    } else {
        cy.contains('Assignee (').click();
    }
    cy.get('.cvat-user-search-field').type(username, { delay: 0 }); // all at once
    return cy.get('.cvat-user-search-field').type('{enter}');
}

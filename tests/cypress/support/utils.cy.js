/// <reference types="cypress" />

export function selectAll() {
    cy.get('.cvat-bulk-wrapper').should('exist').and('be.visible');
    cy.contains('Select all').click();
}
export function getBulkActionsMenu() {
    selectAll();
    cy.get('.cvat-item-selected').first().within(() => {
        cy.get('.cvat-actions-menu-button').click();
    });
    return cy.get('.ant-dropdown');
}

export function assignAllJobsTo(username, numberOfObjects = null) {
    cy.url().should('contain', 'tasks');
    if (numberOfObjects) {
        // if caller asks, check number of jobs
        cy.contains(`Assignee (${numberOfObjects})`).click();
    }
    cy.get('.cvat-user-search-field').type(username, { delay: 0 }); // all at once
    return cy.get('.cvat-user-search-field').type('{enter}');
}

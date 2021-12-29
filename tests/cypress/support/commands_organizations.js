// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

Cypress.Commands.add('createOrganization', (organizationParams) => {
    cy.get('.cvat-header-menu-user-dropdown').trigger('mouseover');
    cy.get('.cvat-header-menu')
        .should('be.visible')
        .find('[role="menuitem"]')
        .filter(':contains("Organization")')
        .trigger('mouseover');
    cy.get('.cvat-header-menu-create-organization')
        .should('be.visible')
        .click();
    cy.url().should('contain', '/organizations/create');
    cy.get('.cvat-create-organization-form').should('be.visible').within(() => {
        cy.get('#slug').type(organizationParams.shortName);
        cy.get('#name').type(organizationParams.fullName);
        cy.get('#description').type(organizationParams.description);
        cy.get('#email').type(organizationParams.email);
        cy.get('#phoneNumber').type(organizationParams.phoneNumber);
        cy.get('#location').type(organizationParams.location);
        cy.get('[type="submit"]').click();
    });
});

Cypress.Commands.add('activateOrganization', (organizationShortName) => {
    cy.get('.cvat-header-menu-user-dropdown').trigger('mouseover');
    cy.get('.ant-dropdown')
        .should('be.visible')
        .not('ant-dropdown-hidden')
        .find('[role="menuitem"]')
        .filter(':contains("Organization")')
        .trigger('mouseover');
    cy.contains('.cvat-header-menu-organization-item', organizationShortName).click();
});

Cypress.Commands.add('openOrganization', (organizationShortName) => {
    cy.get('.cvat-header-menu-user-dropdown').trigger('mouseover');
    cy.get('.ant-dropdown')
        .should('be.visible')
        .not('ant-dropdown-hidden')
        .find('[role="menuitem"]')
        .filter(':contains("Organization")')
        .trigger('mouseover');
    cy.get('.cvat-header-menu-active-organization-item')
        .should('have.text', organizationShortName);
    cy.get('.cvat-header-menu-open-organization')
        .should('be.visible')
        .click();
    cy.get('.cvat-organization-page').should('exist');
});

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
    cy.get('.cvat-organization-page').should('exist').and('be.visible');
});

Cypress.Commands.add('сheckPresenceOrganization', (organizationShortName) => {
    cy.get('.cvat-header-menu-user-dropdown').trigger('mouseover');
    cy.get('.ant-dropdown')
        .should('be.visible')
        .not('ant-dropdown-hidden')
        .find('[role="menuitem"]')
        .filter(':contains("Organization")')
        .trigger('mouseover');
    cy.contains('.cvat-header-menu-organization-item', organizationShortName).should('exist')
        .trigger('mouseout');
});

Cypress.Commands.add('checkOrganizationParams', (organizationParams) => {
    cy.get('.cvat-organization-top-bar-descriptions').then((orgDescriptions) => {
        const orgDescText = orgDescriptions.text();
        expect(orgDescText).contain(organizationParams.shortName);
        expect(orgDescText).contain(organizationParams.fullName);
        expect(orgDescText).contain(organizationParams.description);
    });
    cy.get('.cvat-organization-top-bar-contacts').then((orgContacts) => {
        const orgContactsText = orgContacts.text();
        expect(orgContactsText).contain(organizationParams.email);
        expect(orgContactsText).contain(organizationParams.phoneNumber);
        expect(orgContactsText).contain(organizationParams.location);
    });
});

Cypress.Commands.add('checkOrganizationMembers', (expectedMembersCount, expectedOrganizationMembers) => {
    const orgMembersUserameText = [];
    cy.get('.cvat-organization-member-item').should('have.length', expectedMembersCount);
    cy.get('.cvat-organization-member-item-username').each((el) => {
        orgMembersUserameText.push(el.text());
    }).then(() => {
        expect(orgMembersUserameText).to.include.members(expectedOrganizationMembers);
    });
});

Cypress.Commands.add('inviteMembersToOrganization', (membersEmailRole) => {
    cy.get('.cvat-organization-top-bar-buttons-block').should('exist');
    cy.contains('button', 'Invite members').click();
    cy.get('.cvat-organization-invitation-modal').should('be.visible');
    let i = 0;
    for (const el of membersEmailRole) {
        cy.get('.cvat-organization-invitation-field-email')
            .last()
            .find('input')
            .type(el.email)
            .should('have.value', el.email);
        cy.get('.cvat-organization-invitation-field-email')
            .find('[aria-label="check-circle"]')
            .should('exist');
        cy.get('.cvat-organization-invitation-field-role').last().click();
        cy.get('.ant-select-dropdown')
            .should('be.visible')
            .not('.ant-select-dropdown-hidden')
            .find(`[title=${el.role}]`)
            .click();
        i++;
        if (i !== Object.keys(membersEmailRole).length) {
            cy.contains('button', 'Invite more').click();
        }
    }
    cy.get('.cvat-organization-invitation-modal')
        .contains('button', 'OK')
        .click();
});

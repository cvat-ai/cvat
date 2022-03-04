// Copyright (C) 2022 Intel Corporation
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
        cy.intercept('POST', '/api/organizations**').as('createOrganizations');
        cy.get('[type="submit"]').click();
        cy.wait('@createOrganizations').its('response.statusCode').should('equal', 201);
    });
});

Cypress.Commands.add('deleteOrganizations', (authResponse, otrganizationsToDelete) => {
    const authKey = authResponse.body.key;
    cy.request({
        url: '/api/organizations?page_size=all',
        headers: {
            Authorization: `Token ${authKey}`,
        },
    }).then((_response) => {
        const responceResult = _response.body;
        for (const organization of responceResult) {
            const { id, slug } = organization;
            for (const organizationToDelete of otrganizationsToDelete) {
                if (slug === organizationToDelete) {
                    cy.request({
                        method: 'DELETE',
                        url: `/api/organizations/${id}`,
                        headers: {
                            Authorization: `Token ${authKey}`,
                        },
                    });
                }
            }
        }
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
    cy.get('.cvat-header-menu-user-dropdown').should('be.visible');
    cy.get('.cvat-header-menu-user-dropdown-organization')
        .should('exist')
        .and('have.text', organizationShortName);
});

Cypress.Commands.add('deactivateOrganization', () => {
    cy.get('.cvat-header-menu-user-dropdown').trigger('mouseover');
    cy.get('.ant-dropdown')
        .should('be.visible')
        .not('ant-dropdown-hidden')
        .find('[role="menuitem"]')
        .filter(':contains("Organization")')
        .trigger('mouseover');
    cy.contains('.cvat-header-menu-organization-item', 'Personal workspace').click();
    cy.get('.cvat-header-menu-user-dropdown').should('be.visible');
    cy.get('.cvat-header-menu-user-dropdown-organization').should('not.exist');
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

Cypress.Commands.add('checkOrganizationExists', (organizationShortName, shouldExist = true) => {
    cy.get('.cvat-header-menu-user-dropdown').trigger('mouseover');
    cy.get('.ant-dropdown')
        .should('be.visible')
        .not('ant-dropdown-hidden')
        .find('[role="menuitem"]')
        .filter(':contains("Organization")')
        .trigger('mouseover');
    if (shouldExist) {
        cy.contains('.cvat-header-menu-organization-item', organizationShortName)
            .should('exist')
            .trigger('mouseout')
            .should('be.hidden');
    } else {
        cy.contains('.cvat-header-menu-organization-item', organizationShortName).should('not.exist');
        cy.get('.cvat-header-menu-active-organization-item').trigger('mouseout').should('be.hidden');
    }
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

Cypress.Commands.add('inviteMembersToOrganization', (members) => {
    cy.get('.cvat-organization-top-bar-buttons-block').should('exist');
    cy.contains('button', 'Invite members').click();
    cy.get('.cvat-organization-invitation-modal').should('be.visible');
    let addedMembers = 0;
    for (const el of members) {
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
        addedMembers++;
        if (addedMembers !== Object.keys(members).length) {
            cy.contains('button', 'Invite more').click();
        }
    }
    cy.get('.cvat-organization-invitation-modal')
        .contains('button', 'OK')
        .click();
});

Cypress.Commands.add('removeMemberFromOrganization', (username) => {
    cy.contains('.cvat-organization-member-item-username', username)
        .parents('.cvat-organization-member-item')
        .find('.cvat-organization-member-item-remove')
        .click();
    cy.get('.cvat-modal-organization-member-remove')
        .contains('button', 'Yes, remove')
        .click();
});

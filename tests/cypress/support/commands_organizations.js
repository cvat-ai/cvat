// Copyright (C) 2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { convertClasses } from './utils';

function openOrganizationsMenu() {
    cy.get('.cvat-header-menu-user-dropdown-user').should('be.visible');
    cy.get('.cvat-header-menu-user-dropdown').should('be.visible');
    cy.get('.cvat-header-menu-user-dropdown').click();
    cy.get('.cvat-header-menu').should('be.visible');
    cy.get('.cvat-header-menu')
        .find('[role="menuitem"]')
        .filter(':contains("Organization")')
        .should('exist')
        .and('be.visible')
        .and('not.have.attr', 'aria-disabled', 'true');
    cy.get('.cvat-header-menu')
        .find('[role="menuitem"]')
        .filter(':contains("Organization")')
        .click();
    cy.get('.cvat-header-menu-create-organization').should('be.visible');
}

Cypress.Commands.add('createOrganization', (organizationParams) => {
    openOrganizationsMenu();
    cy.get('.cvat-header-menu-create-organization')
        .should('be.visible');
    cy.get('.cvat-header-menu-create-organization').click();
    cy.url().should('contain', '/organizations/create');
    const idWrapper = { id: null };
    cy.get('.cvat-create-organization-form').should('be.visible').within(() => {
        cy.get('#slug').type(organizationParams.shortName);
        cy.get('#name').type(organizationParams.fullName);
        cy.get('#description').type(organizationParams.description);
        cy.get('#email').type(organizationParams.email);
        cy.get('#phoneNumber').type(organizationParams.phoneNumber);
        cy.get('#location').type(organizationParams.location);
        cy.intercept('POST', '/api/organizations**').as('createOrganizations');
        cy.get('[type="submit"]').click();
        cy.wait('@createOrganizations')
            .then((interception) => {
                expect(interception.response.statusCode).to.equal(201);
                idWrapper.id = interception.response.body.id;
            });
    });
    cy.get('.cvat-organization-page').should('exist').and('be.visible');
    cy.get('.cvat-spinner').should('not.exist');
    cy.get('.cvat-header-menu-user-dropdown-organization')
        .should('have.text', organizationParams.shortName);
    return cy.wrap(idWrapper);
});

Cypress.Commands.add('deleteOrganizations', (authHeaders, otrganizationsToDelete) => {
    cy.request({
        url: '/api/organizations?page_size=all',
        headers: authHeaders,
    }).then((_response) => {
        const responseResult = _response.body.results;
        for (const organization of responseResult) {
            const { id, slug } = organization;
            for (const organizationToDelete of otrganizationsToDelete) {
                if (slug === organizationToDelete) {
                    cy.request({
                        method: 'DELETE',
                        url: `/api/organizations/${id}`,
                        headers: authHeaders,
                    });
                }
            }
        }
    });
});

Cypress.Commands.add('activateOrganization', (organizationShortName) => {
    openOrganizationsMenu();
    cy.contains('.cvat-header-menu-organization-item', organizationShortName)
        .should('be.visible')
        .click();
    cy.get('.cvat-header-menu-user-dropdown').should('be.visible');
    cy.get('.cvat-header-menu-user-dropdown-organization')
        .should('exist')
        .and('have.text', organizationShortName);
    cy.get('.cvat-spinner').should('not.exist');
});

Cypress.Commands.add('deactivateOrganization', () => {
    openOrganizationsMenu();
    cy.contains('.cvat-header-menu-organization-item', 'Personal workspace').click();
    cy.get('.cvat-header-menu-user-dropdown').should('be.visible');
    cy.get('.cvat-header-menu-user-dropdown-organization').should('not.exist');
    cy.get('.cvat-spinner').should('not.exist');
});

Cypress.Commands.add('openOrganization', (organizationShortName) => {
    openOrganizationsMenu();
    cy.get('.cvat-header-menu-active-organization-item')
        .should('have.text', organizationShortName);
    cy.get('.cvat-header-menu-open-organization')
        .should('be.visible')
        .click();
    cy.get('.cvat-organization-page').should('exist').and('be.visible');
});

Cypress.Commands.add('checkOrganizationExists', (organizationShortName, shouldExist = true) => {
    openOrganizationsMenu();
    if (shouldExist) {
        cy.contains('.cvat-header-menu-organization-item', organizationShortName).should('exist');
    } else {
        cy.contains('.cvat-header-menu-organization-item', organizationShortName).should('not.exist');
    }
    cy.get('body').click();
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
    const orgMembersUsernameText = [];
    cy.get('.cvat-organization-member-item').should('have.length', expectedMembersCount);
    cy.get('.cvat-organization-member-item-username').each((el) => {
        orgMembersUsernameText.push(el.text());
    });
    cy.get('.cvat-organization-member-item-username').then(() => {
        expect(orgMembersUsernameText).to.include.members(expectedOrganizationMembers);
    });
});

Cypress.Commands.add('inviteMembersToOrganization', (members) => {
    cy.get('.cvat-organization-top-bar-buttons-block').should('exist');
    cy.contains('button', 'Invite members').click();
    cy.get('.cvat-organization-invitation-modal').should('be.visible');
    let addedMembers = 0;
    for (const el of members) {
        cy.get('.cvat-organization-invitation-field-email').last().find('input').type(el.email);
        cy.get('.cvat-organization-invitation-field-email').last().find('input').should('have.value', el.email);
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
    cy.intercept('POST', '/api/invitations**').as('inviteOrganizationMember');
    cy.intercept('GET', '/api/memberships**').as('getOrganizationMembersAfterInvite');
    cy.get('.cvat-organization-invitation-modal')
        .contains('button', 'OK')
        .click();
    const invitedEmails = [];
    for (let i = 0; i < members.length; i++) {
        cy.wait('@inviteOrganizationMember').then((interception) => {
            expect(interception.response.statusCode).to.be.oneOf([200, 201]);
            invitedEmails.push(interception.request.body.email);
        });
    }
    cy.wrap(invitedEmails).should('have.members', members.map((el) => el.email));
    cy.get('.cvat-organization-invitation-modal').should('not.exist');
    cy.wait('@getOrganizationMembersAfterInvite')
        .its('response.statusCode')
        .should('equal', 200);
    cy.get('.cvat-organization-page').should('be.visible');
});

Cypress.Commands.add('removeMemberFromOrganization', (username) => {
    cy.contains('.cvat-organization-member-item-username', username)
        .parents('.cvat-organization-member-item')
        .find('.cvat-organization-actions-button')
        .click();
    cy.get('.cvat-organization-membership-actions-menu')
        .should('exist')
        .and('be.visible')
        .contains('Delete')
        .click();
    cy.get('.cvat-modal-organization-member-remove')
        .contains('button', 'Yes, remove')
        .click();
});

Cypress.Commands.add('headlessCreateOrganization', (data = {}) => cy.window().then(($win) => {
    const organization = new $win.cvat.classes.Organization(convertClasses(data, $win));
    return cy.wrap(organization.save());
}));

Cypress.Commands.add('headlessDeleteOrganization', (orgId) => {
    cy.window().then(($win) => cy.wrap($win.cvat.organizations.get({
        filter: `{"and":[{"==":[{"var":"id"},${orgId}]}]}`,
    })).then(([organization]) => cy.wrap(organization.remove())));
});

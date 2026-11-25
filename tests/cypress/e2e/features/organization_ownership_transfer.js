// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { fullMatch } from '../../support/utils';

context('Organization ownership transfer', () => {
    const suffix = Date.now();
    const orgSlug = `own${suffix.toString(36)}`;
    const password = 'Fv5Df3#f55g';
    const maintainer = `transfer-maintainer-${suffix}`;
    const worker = `transfer-worker-${suffix}`;
    const createdUsernames = [];
    let orgId = null;

    function visitOrganizationPage() {
        cy.window().then(($win) => $win.localStorage.setItem('currentOrganization', orgSlug));
        cy.visit('/organization');
        cy.get('.cvat-organization-page').should('be.visible');
    }

    function openOrganizationPage() {
        visitOrganizationPage();
        cy.get('.cvat-organization-member-item').should('have.length', 3);
    }

    function openActionsMenu() {
        cy.get('.cvat-organization-page-actions-button').click();
        return cy.get('.cvat-organization-actions-menu').filter(':visible').should('have.length', 1);
    }

    function openTransferOwnershipModal() {
        openActionsMenu().within(() => {
            cy.contains('[role="menuitem"]', 'Transfer ownership').click();
        });
        return cy.get('.cvat-organization-transfer-ownership-modal').should('be.visible');
    }

    function checkMemberRole(username, role) {
        cy.contains('.cvat-organization-member-item-username', fullMatch(username))
            .parents('.cvat-organization-member-item')
            .find('.cvat-organization-member-item-role')
            .should('contain', role);
    }

    before(() => {
        cy.headlessLogout();
        cy.visit('/auth/login');
        [maintainer, worker].forEach((username) => {
            cy.headlessCreateUser({
                username,
                password,
                firstName: 'Transfer',
                lastName: 'User',
                email: `${username}@local.local`,
            }).then(() => createdUsernames.push(username));
        });
        cy.headlessLogin();
        cy.headlessCreateOrganization({ slug: orgSlug, name: orgSlug }).then((organization) => {
            orgId = organization.id;
        });
        visitOrganizationPage();
        cy.window().then(async ($win) => {
            const [organization] = await $win.cvat.organizations.get({
                filter: JSON.stringify({ '==': [{ var: 'id' }, orgId] }),
            });
            await organization.invite(`${maintainer}@local.local`, 'maintainer');
            await organization.invite(`${worker}@local.local`, 'worker');
            const { data: { results: invitations } } = await $win.cvat.server.request(
                `/api/invitations?org=${orgSlug}&accepted=false`, { method: 'GET' },
            );
            await Promise.all(invitations.map(({ key }) => $win.cvat.organizations.acceptInvitation(key)));
        });
    });

    after(() => {
        cy.headlessLogin();
        if (orgId !== null) {
            cy.headlessDeleteOrganization(orgId);
        }
        cy.clearLocalStorage('currentOrganization');
        createdUsernames.forEach((username) => {
            cy.headlessDeleteUserByUsername(username);
        });
    });

    it('Only maintainers are offered as the new owner', () => {
        openOrganizationPage();
        openTransferOwnershipModal().within(() => {
            cy.get('.cvat-organization-transfer-ownership-new-owner').click();
        });
        cy.get('.ant-select-dropdown').not('.ant-select-dropdown-hidden').within(() => {
            cy.get('.ant-select-item-option').should('have.length', 1).and('contain', maintainer);
        });
        cy.get('.cvat-organization-transfer-ownership-modal').within(() => {
            cy.contains('button', 'Cancel').click();
        });
        cy.get('.cvat-organization-transfer-ownership-modal').should('not.exist');
    });

    it('The owner transfers the organization to a maintainer, and they swap roles', () => {
        cy.intercept('PATCH', `/api/organizations/${orgId}**`).as('transferOwnership');
        openOrganizationPage();
        openTransferOwnershipModal().within(() => {
            cy.get('.cvat-organization-transfer-ownership-new-owner').click();
        });
        cy.get('.ant-select-dropdown').not('.ant-select-dropdown-hidden')
            .contains('.ant-select-item-option', fullMatch(maintainer))
            .click();
        cy.get('.cvat-organization-transfer-ownership-modal').within(() => {
            cy.contains('button', 'Transfer ownership').should('be.disabled');
            cy.get('.cvat-organization-transfer-ownership-confirmation').type(orgSlug);
            cy.contains('button', 'Transfer ownership').should('be.enabled').click();
        });
        cy.wait('@transferOwnership').then(({ request, response }) => {
            expect(request.body).to.have.property('owner_id');
            expect(response.statusCode).to.equal(200);
            expect(response.body.owner.username).to.equal(maintainer);
        });

        cy.get('.cvat-organization-transfer-ownership-modal').should('not.exist');
        checkMemberRole(maintainer, 'Owner');
        checkMemberRole(Cypress.env('user'), 'Maintainer');
        checkMemberRole(worker, 'Worker');
        cy.get('.cvat-leave-org-button').should('be.visible');
        openActionsMenu().within(() => {
            cy.contains('[role="menuitem"]', 'Transfer ownership').should('not.exist');
            cy.contains('[role="menuitem"]', 'Remove organization').should('not.exist');
        });

        cy.headlessLogin({ username: maintainer, password });
        openOrganizationPage();
        cy.get('.cvat-leave-org-button').should('not.exist');
        openActionsMenu().within(() => {
            cy.contains('[role="menuitem"]', 'Transfer ownership').should('exist');
            cy.contains('[role="menuitem"]', 'Remove organization').should('exist');
        });
    });
});

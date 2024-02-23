// Copyright (C) 2022-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

Cypress.Commands.add('createWebhook', (webhookData) => {
    cy.get('.cvat-create-webhook').click();
    cy.get('.cvat-setup-webhook-content').should('exist');
    cy.setUpWebhook(webhookData);
    cy.get('.cvat-notification-create-webhook-success').should('exist').find('[data-icon="close"]').click();
    cy.get('.cvat-webhooks-go-back').click();
});

Cypress.Commands.add('openWebhookActions', (description) => {
    cy.contains(description).parents('.cvat-webhooks-list-item').within(() => {
        cy.get('.cvat-webhooks-page-actions-button').click();
    });
});

Cypress.Commands.add('editWebhook', (description, webhookData) => {
    cy.openWebhookActions(description);
    cy.contains('[role="menuitem"]', 'Edit').click();
    cy.get('.cvat-setup-webhook-content').should('exist');
    cy.setUpWebhook(webhookData);
    cy.get('.cvat-notification-update-webhook-success').should('exist').find('[data-icon="close"]').click();
    cy.get('.cvat-webhooks-go-back').click();
});

Cypress.Commands.add('deleteWebhook', (description) => {
    cy.openWebhookActions(description);
    cy.contains('[role="menuitem"]', 'Delete').click();
    cy.get('.cvat-modal-confirm-remove-webhook')
        .should('contain', 'Are you sure you want to remove the hook?')
        .within(() => {
            cy.contains('button', 'OK').click();
        });
    cy.contains(description).parents('.cvat-webhooks-list-item').should('have.css', 'opacity', '0.5');
});

Cypress.Commands.add('setUpWebhook', (webhookData) => {
    cy.get('#targetURL').clear();
    cy.get('#targetURL').type(webhookData.targetURL);
    cy.get('#description').clear();
    cy.get('#description').type(webhookData.description);
    cy.get('#secret').clear();
    cy.get('#secret').type(webhookData.secret);
    if (!webhookData.enableSSL) cy.get('#enableSSL').uncheck();
    if (!webhookData.isActive) cy.get('#isActive').uncheck();

    if (webhookData.events && Array.isArray(webhookData.events)) {
        cy.get('#eventsMethod')
            .within(() => {
                cy.contains('Select individual events').click();
            });
        cy.get('.cvat-setup-webhook-content').within(() => {
            cy.get('.cvat-webhook-detailed-events').within(() => {
                cy.get('[type="checkbox"]').uncheck();
                for (const event of webhookData.events) {
                    cy.contains(event).click();
                }
            });
        });
    }
    cy.get('.cvat-setup-webhook-content').within(() => {
        cy.contains('Submit').click();
    });
});

Cypress.Commands.add('openOrganizationWebhooks', () => {
    cy.get('.cvat-organization-page-actions-button').click();
    cy.get('.cvat-organization-actions-menu').within(() => {
        cy.contains('[role="menuitem"]', 'Setup webhooks').click();
    });
    cy.get('.cvat-spinner').should('not.exist');
    cy.get('.cvat-webhooks-page').should('exist');
});

Cypress.Commands.add('openProjectWebhooks', () => {
    cy.clickInProjectMenu('Setup webhooks', true);
    cy.get('.cvat-spinner').should('not.exist');
    cy.get('.cvat-webhooks-page').should('exist');
});

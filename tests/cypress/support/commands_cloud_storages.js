// Copyright (C) CVAT.ai Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

Cypress.Commands.add('attachS3Bucket', (data) => {
    let createdCloudStorageId;
    cy.contains('.cvat-header-button', 'Cloud Storages').should('be.visible').click();
    cy.get('.cvat-attach-cloud-storage-button').should('be.visible').click();
    cy.get('#display_name').type(data.displayName);
    cy.get('#display_name').should('have.attr', 'value', data.displayName);
    cy.get('#provider_type').click();
    cy.contains('.cvat-cloud-storage-select-provider', 'Amazon').click();
    cy.get('#resource').should('exist').type(data.resource);
    cy.get('#resource').should('have.attr', 'value', data.resource);
    cy.get('#credentials_type').should('exist').click();
    cy.get('.ant-select-dropdown')
        .not('.ant-select-dropdown-hidden')
        .get('[title="Anonymous access"]')
        .should('be.visible')
        .click();
    cy.get('#endpoint_url').type(data.endpointUrl);
    cy.get('#endpoint_url').should('have.attr', 'value', data.endpointUrl);

    if (data.manifest) {
        cy.get('.cvat-add-manifest-button').should('be.visible').click();
        cy.get('[placeholder="manifest.jsonl"]').should('exist').should('have.attr', 'value', '');
        cy.get('[placeholder="manifest.jsonl"]').type(data.manifest);
        cy.get('[placeholder="manifest.jsonl"]').should('have.attr', 'value', data.manifest);
    }
    cy.intercept('POST', /\/api\/cloudstorages.*/).as('createCloudStorage');
    cy.get('.cvat-cloud-storage-form').within(() => {
        cy.contains('button', 'Submit').click();
    });
    cy.wait('@createCloudStorage').then((interception) => {
        expect(interception.response.statusCode).to.be.equal(201);
        createdCloudStorageId = interception.response.body.id;
    });
    cy.verifyNotification();
    return createdCloudStorageId;
});

Cypress.Commands.add('headlessAttachCloudStorage', (spec) => {
    cy.window().its('cvat').should('not.be.undefined').then(async (cvat) => {
        const res = await cvat.server.request('/api/cloudstorages', { method: 'POST', data: spec });
        return cy.wrap(res);
    });
});

// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Cloud storage.', () => {
    const caseId = '113';

    const cloudStorageData = {
        displayName: 'Demo bucket',
        resource: 'public',
        manifest: 'manifest.jsonl',
        endpointUrl: 'http://localhost:9000', // for running in docker: http://minio:9000
    };

    let createdCloudStorageId;

    function attachS3Bucket(data) {
        cy.contains('.cvat-header-button', 'Cloud Storages').should('be.visible').click();
        cy.get('.cvat-attach-cloud-storage-button').should('be.visible').click();
        cy.get('#display_name')
            .type(data.displayName)
            .should('have.attr', 'value', data.displayName);
        cy.get('#provider_type').click();
        cy.contains('.cvat-cloud-storage-select-provider', 'AWS').click();
        cy.get('#resource')
            .should('exist')
            .type(data.resource)
            .should('have.attr', 'value', data.resource);
        cy.get('#credentials_type').should('exist').click();
        cy.get('.ant-select-dropdown')
            .not('.ant-select-dropdown-hidden')
            .get('[title="Anonymous access"]')
            .should('be.visible')
            .click();
        cy.get('#endpoint_url')
            .type(data.endpointUrl)
            .should('have.attr', 'value', data.endpointUrl);

        cy.get('.cvat-add-manifest-button').should('be.visible').click();
        cy.get('[placeholder="manifest.jsonl"]')
            .should('exist')
            .should('have.attr', 'value', '')
            .type(data.manifest)
            .should('have.attr', 'value', data.manifest);
        cy.intercept('POST', /\/api\/cloudstorages.*/).as('createCloudStorage');
        cy.get('.cvat-cloud-storage-form').within(() => {
            cy.contains('button', 'Submit').click();
        });
        cy.wait('@createCloudStorage').then((interseption) => {
            console.log(interseption);
            expect(interseption.response.statusCode).to.be.equal(201);
            // expect(interseption.response.body.id).to.exist();
            createdCloudStorageId = interseption.response.body.id;
        });
    }

    afterEach(() => {
        cy.visit('auth/login');
        cy.login();
        attachS3Bucket(cloudStorageData);
    });

    afterEach(() => {
        cy.goToCloudStoragesPage();
        cy.deleteCloudStorage(createdCloudStorageId, cloudStorageData.displayName);
        cy.logout();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('', () => {

        });
        // test cases:
        // 1. create a project with source & target storages,
        // create a task in a project with default source & target storages
        // export annotations, dataset, task backup, project backup to "public" bucket,
        // import annotations, dataset, restore task & project backups from "public" bucket
        // 2. create a project with source & target storages,
        // create a task in a project with another source & target storages, do all previous actions
        // 3. do all previous actions with specifying source & target storages via query params
    });
});

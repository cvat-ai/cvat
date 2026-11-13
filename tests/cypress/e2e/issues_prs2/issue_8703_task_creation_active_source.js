// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Task creation uses only the active data source (#8703).', () => {
    const storageName = `Issue 8703 cloud storage ${Date.now()}`;
    const cloudFile = 'images/image_1.jpg';
    const localFile = 'local-source_1.png';
    const localFixtureDirectory = 'cypress/fixtures/issue_8703';
    const createdTaskIds = [];
    let cloudStorageId;

    before(() => {
        cy.prepareUserSession();
        cy.imageGenerator(localFixtureDirectory, 'local-source', 100, 100, 'gray', 0, 0, 'Local', 1);
        cy.window().then(({ cvat }) => cvat.server.request('/api/cloudstorages', {
            method: 'POST',
            data: {
                display_name: storageName,
                provider_type: 'AWS_S3_BUCKET',
                resource: 'public',
                credentials_type: 'ANONYMOUS_ACCESS',
                specific_attributes: `endpoint_url=${Cypress.config('motoUrl')}&prefix=images/`,
            },
        })).then(({ data: storage }) => {
            cloudStorageId = storage.id;
        });
    });

    after(() => {
        createdTaskIds.forEach((taskId) => {
            cy.headlessDeleteTask(taskId);
        });
        if (cloudStorageId) {
            cy.window().then(({ cvat }) => cvat.cloudStorages.get({ id: cloudStorageId }))
                .then(([storage]) => storage.delete());
        }
    });

    ['cloudStorage', 'local'].forEach((activeSource) => {
        it(`submits only ${activeSource} files when both sources have selections`, () => {
            let localUploads = 0;
            cy.intercept({ method: 'POST', pathname: '/api/tasks' }).as('createTask');
            cy.intercept({ method: 'POST', pathname: '/api/tasks/*/data' }, (request) => {
                if (request.headers['upload-finish']) {
                    // eslint-disable-next-line no-param-reassign -- Cypress supports aliases on individual requests.
                    request.alias = 'taskData';
                } else if (request.headers['upload-multiple']) {
                    localUploads++;
                }
            });

            cy.visit('/tasks/create');
            cy.get('#name').click();
            cy.get('#name').type(`Issue 8703 ${activeSource}`);
            cy.addNewLabel({ name: 'object' });
            cy.get('.cvat-file-manager-local-tab input[type="file"]').attachFile(`issue_8703/${localFile}`);

            cy.contains('[role="tab"]', 'Cloud storage').click();
            cy.get('#cloudStorageSelect').type(storageName);
            cy.contains('.cvat-cloud-storage-select-provider', storageName).click();
            cy.get('.cvat-create-task-page-cloud-storage-tab').within(() => {
                cy.contains('tr', 'image_1.jpg').find('input[type="checkbox"]').check();
            });

            if (activeSource === 'local') {
                cy.contains('[role="tab"]', 'My computer').click();
                cy.get('.cvat-file-manager-local-tab').should('contain', localFile);
            }

            cy.get('.cvat-submit-continue-task-button').click();
            cy.wait('@createTask').then(({ response }) => {
                expect(response.statusCode).to.equal(201);
                createdTaskIds.push(response.body.id);
            });
            cy.wait('@taskData').then(({ request, response }) => {
                expect(response.statusCode).to.equal(202);
                expect(request.body.remote_files).to.deep.equal([]);
                if (activeSource === 'cloudStorage') {
                    expect(request.body.server_files).to.deep.equal([cloudFile]);
                    expect(request.body.cloud_storage_id).to.equal(cloudStorageId);
                    expect(localUploads).to.equal(0);
                } else {
                    expect(request.body.server_files).to.deep.equal([]);
                    expect(request.body).not.to.have.property('cloud_storage_id');
                    expect(localUploads).to.equal(1);
                }
            });
            cy.get('.cvat-notification-create-task-success', { timeout: 60000 }).should('be.visible');
            cy.then(() => {
                const taskId = createdTaskIds[createdTaskIds.length - 1];
                cy.request(`/api/tasks/${taskId}/data/meta`).then(({ body }) => {
                    expect(body.frames).to.have.length(1);
                    expect(body.frames[0].name).to.equal(activeSource === 'cloudStorage' ? cloudFile : localFile);
                });
            });
        });
    });
});

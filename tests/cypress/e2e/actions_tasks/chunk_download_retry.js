// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Retry chunk downloads on annotation page', () => {
    const taskName = 'Test retry chunk download';
    const labelName = 'car';
    const serverFiles = ['images/image_1.jpg'];
    const failedAttempts = 3;

    let taskID = null;
    let jobID = null;

    before(() => {
        cy.visit('/auth/login');
        cy.login();
        cy.url().should('contain', '/tasks');
        cy.headlessCreateTask({
            labels: [{ name: labelName, attributes: [], type: 'any' }],
            name: taskName,
            project_id: null,
            source_storage: { location: 'local' },
            target_storage: { location: 'local' },
        }, {
            server_files: serverFiles,
            image_quality: 70,
            use_zip_chunks: true,
            use_cache: true,
            sorting_method: 'lexicographical',
        }).then((response) => {
            taskID = response.taskID;
            [jobID] = response.jobIDs;
        });
    });

    after(() => {
        if (taskID) {
            cy.headlessDeleteTask(taskID);
        }
    });

    it('loads the annotation frame after several network errors during chunk download', () => {
        let chunkRequests = 0;

        cy.intercept({
            method: 'GET',
            pathname: `/api/jobs/${jobID}/data`,
            query: {
                type: 'chunk',
            },
        }, (req) => {
            chunkRequests++;

            if (chunkRequests <= failedAttempts) {
                req.reply({
                    forceNetworkError: true,
                });
            } else {
                req.continue();
            }
        }).as('getJobChunk');
        cy.intercept('GET', `/tasks/${taskID}/jobs/${jobID}`).as('visitAnnotationView');

        cy.visit(`/tasks/${taskID}/jobs/${jobID}`);
        cy.wait('@visitAnnotationView');
        for (let attempt = 0; attempt < failedAttempts; attempt++) {
            cy.wait('@getJobChunk').its('error').should('exist');
        }
        cy.wait('@getJobChunk').its('response.statusCode').should('equal', 200);

        cy.get('.cvat-canvas-container').should('exist').and('be.visible');
        cy.get('#cvat_canvas_background').should('exist').and('be.visible');
        cy.get('.cvat-notification-notice-fetch-frame-data-from-the-server-failed').should('not.exist');
        cy.then(() => {
            expect(chunkRequests).to.be.at.least(failedAttempts + 1);
        });
    });
});

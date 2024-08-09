// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Requests page', () => {
    const serverFiles = ['images/image_1.jpg', 'images/image_2.jpg', 'images/image_3.jpg'];
    const projectName = 'Project for testing requests page';
    const mainLabelName = 'requests_page_label';
    const secondLabelName = 'requests_page_label_2';
    const projectLabels = [
        { name: mainLabelName, attributes: [], type: 'any' },
        { name: secondLabelName, attributes: [], type: 'any' },
    ];

    const attrName = 'requests_attr';
    const imagesCount = 1;
    const imageFileName = `image_${mainLabelName}`;
    const width = 800;
    const height = 800;
    const posX = 10;
    const posY = 10;
    const color = 'gray';
    const badArchiveName = `${imageFileName}.zipabcd`;
    const badArchivePath = `cypress/fixtures/${badArchiveName}`;
    const imagesFolder = `cypress/fixtures/${imageFileName}`;
    const directoryToArchive = imagesFolder;

    const taskName = 'Annotation task for testing requests page';

    const data = {
        projectID: null,
        taskID: null,
        jobID: null,
    };

    before(() => {
        cy.visit('/auth/login');
        cy.login();
        // cy.visit('/tasks');

        cy.headlessCreateProject({
            labels: projectLabels,
            name: projectName,
        }).then((response) => {
            data.projectID = response.projectID;

            cy.headlessCreateTask({
                labels: [],
                name: taskName,
                project_id: data.projectID,
                source_storage: { location: 'local' },
                target_storage: { location: 'local' },
            }, {
                server_files: serverFiles,
                image_quality: 70,
                use_zip_chunks: true,
                use_cache: true,
                sorting_method: 'lexicographical',
            }).then((taskResponse) => {
                data.taskID = taskResponse.taskID;
                [data.jobID] = taskResponse.jobIDs;
            });
        });

        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, mainLabelName, imagesCount);
        cy.createZipArchive(directoryToArchive, badArchivePath);
    });

    after(() => {
        cy.headlessDeleteTask(data.taskID);
    });

    describe('Requests page', () => {
        it('Check creating a task creates a request. Correct task can be opened.', () => {
            cy.visit('/requests');
            cy.contains('.cvat-requests-card', 'Create Task')
                .within(() => {
                    cy.contains('Finished').should('exist');
                    cy.get('.cvat-requests-name').click();
                });
            cy.get('.cvat-spinner').should('not.exist');
            cy.url().should('include', `/tasks/${data.taskID}`);

            cy.visit('/tasks');
            cy.createAnnotationTask(
                taskName,
                mainLabelName,
                attrName,
                attrName,
                badArchiveName,
                false,
                false,
                false,
                false,
                false,
                'fail',
            );
            cy.contains('.cvat-header-button', 'Requests').click();
            cy.contains('.cvat-requests-card', 'Create Task')
                .within(() => {
                    cy.contains('Error').should('exist');
                    cy.get('.cvat-requests-name').click();
                });
            cy.get('.cvat-spinner').should('not.exist');
            cy.url().should('include', '/requests');
        });

        // it('Check creating a task creates a request. Correct task can be opened.', () => {

        // });
    });
});

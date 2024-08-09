// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Requests page', () => {
    const mainLabelName = 'requests_page_label';

    const attrName = 'requests_attr';
    const imagesCount = 1;
    const imageFileName = `image_${mainLabelName}`;
    const width = 800;
    const height = 800;
    const posX = 10;
    const posY = 10;
    const color = 'gray';
    const archiveName = `${imageFileName}.zip`;
    const archivePath = `cypress/fixtures/${archiveName}`;
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
        cy.visit('/tasks');
        // cy.login();

        // cy.headlessCreateProject({
        //     labels: projectLabels,
        //     name: projectName,
        // }).then((response) => {
        //     data.projectID = response.projectID;
        // });

        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, mainLabelName, imagesCount);
        cy.createZipArchive(directoryToArchive, archivePath);

        cy.createZipArchive(directoryToArchive, badArchivePath);

        cy.createAnnotationTask(taskName, mainLabelName, attrName, attrName, archiveName);
        cy.openTask(taskName);
        cy.url().then((url) => {
            data.taskID = Number(url.split('/').slice(-1)[0].split('?')[0]);
        });
    });

    after(() => {
        cy.headlessDeleteTask(data.taskID);
    });

    describe('Requests page', () => {
        it('Check creating a task creates a request. Correct task can be opened.', () => {
            const checkTaskCanBeOpened = () => {
                cy.contains('.cvat-requests-card', 'Create Task')
                    .within(() => {
                        cy.contains('Finished').should('exist');
                        cy.get('.cvat-requests-name').click();
                    });
                cy.get('.cvat-spinner').should('not.exist');
                cy.url().should('include', `/tasks/${data.taskID}`);
            };

            cy.contains('.cvat-header-button', 'Requests').click();
            checkTaskCanBeOpened();
            cy.visit('/requests');
            checkTaskCanBeOpened();

            const checkTaskCantBeOpened = () => {
                cy.contains('.cvat-requests-card', 'Create Task')
                    .within(() => {
                        cy.contains('Error').should('exist');
                        cy.get('.cvat-requests-name').click();
                    });
                cy.get('.cvat-spinner').should('not.exist');
                cy.url().should('include', '/requests');
            };

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
            checkTaskCantBeOpened();
            cy.visit('/requests');
            checkTaskCantBeOpened();
        });
    });
});

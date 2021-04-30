// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Import annotations for frames with dots in name.', { browser: '!firefox' }, () => {
    const issueId = '2473';
    const labelName = `Issue ${issueId}`;
    const taskName = labelName;
    const attrName = `Attr for ${labelName}`;
    const textDefaultValue = 'Some default value for type Text';
    const imagesCount = 1;
    const imageFileName = `image.${labelName.replace(' ', '_').toLowerCase()}`; // Dot in the image name
    const width = 800;
    const height = 800;
    const posX = 10;
    const posY = 10;
    const color = 'gray';
    const archiveName = `${imageFileName}.zip`;
    const archivePath = `cypress/fixtures/${archiveName}`;
    const imagesFolder = `cypress/fixtures/${imageFileName}`;
    const directoryToArchive = imagesFolder;

    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName: labelName,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };

    const dumpType = 'YOLO';
    let annotationArchiveName = '';

    function confirmUpdate(modalWindowClassName) {
        cy.get(modalWindowClassName).within(() => {
            cy.contains('button', 'Update').click();
        });
    }

    before(() => {
        cy.visit('auth/login');
        cy.login();
        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
        cy.createZipArchive(directoryToArchive, archivePath);
        cy.createAnnotationTask(
            taskName,
            labelName,
            attrName,
            textDefaultValue,
            archiveName,
        );
        cy.openTaskJob(taskName);
        cy.createRectangle(createRectangleShape2Points);
    });

    after(() => {
        cy.goToTaskList();
        cy.deleteTask(taskName);
    });

    describe(`Testing case "${issueId}"`, () => {
        it('Save job. Dump annotaion to YOLO format. Remove annotation. Save job.', () => {
            cy.saveJob('PATCH', 200, 'saveJobDump');
            cy.intercept('GET', '/api/v1/tasks/**/annotations**').as('dumpAnnotations');
            cy.interactMenu('Dump annotations');
            cy.get('.cvat-menu-dump-submenu-item').within(() => {
                cy.contains(dumpType).click();
            });
            cy.wait('@dumpAnnotations', { timeout: 5000 }).its('response.statusCode').should('equal', 202);
            cy.wait('@dumpAnnotations').its('response.statusCode').should('equal', 201);
            cy.removeAnnotations();
            cy.saveJob('PUT');
            cy.get('#cvat_canvas_shape_1').should('not.exist');
            cy.get('#cvat-objects-sidebar-state-item-1').should('not.exist');

            cy.task('listFiles', 'cypress/fixtures').each((fileName) => {
                if (fileName.includes(dumpType.toLowerCase())) {
                    annotationArchiveName = fileName;
                }
            });
        });

        it('Upload annotation with YOLO format to job.', () => {
            cy.interactMenu('Upload annotations');
            cy.contains('.cvat-menu-load-submenu-item', dumpType.split(' ')[0])
                .should('be.visible')
                .within(() => {
                    cy.get('.cvat-menu-load-submenu-item-button')
                        .click()
                        .get('input[type=file]')
                        .attachFile(annotationArchiveName);
                });
            cy.intercept('PUT', '/api/v1/jobs/**/annotations**').as('uploadAnnotationsPut');
            cy.intercept('GET', '/api/v1/jobs/**/annotations**').as('uploadAnnotationsGet');
            confirmUpdate('.cvat-modal-content-load-job-annotation');
            cy.wait('@uploadAnnotationsPut', { timeout: 5000 }).its('response.statusCode').should('equal', 202);
            cy.wait('@uploadAnnotationsPut').its('response.statusCode').should('equal', 201);
            cy.wait('@uploadAnnotationsGet').its('response.statusCode').should('equal', 200);
            cy.get('.cvat-notification-notice-upload-annotations-fail').should('not.exist');
            cy.get('#cvat_canvas_shape_1').should('exist');
            cy.get('#cvat-objects-sidebar-state-item-1').should('exist');
        });
    });
});

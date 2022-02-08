// Copyright (C) 2021-2022 Intel Corporation
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
        labelName,
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
        it('Save job. Dump annotation to YOLO format. Remove annotation. Save job.', () => {
            cy.saveJob('PATCH', 200, 'saveJobDump');
            cy.intercept('GET', '/api/tasks/**/annotations**').as('dumpAnnotations');
            cy.interactMenu('Export task dataset');
            cy.get('.cvat-modal-export-task').find('.cvat-modal-export-select').click();
            cy.get('.ant-select-dropdown')
                .not('.ant-select-dropdown-hidden')
                .within(() => {
                    cy.get('.rc-virtual-list-holder')
                        .trigger('wheel', { deltaY: 1000 })
                        .trigger('wheel', { deltaY: 1000 })
                        .contains('.cvat-modal-export-option-item', dumpType)
                        .should('be.visible')
                        .click();
                });
            cy.get('.cvat-modal-export-select').should('contain.text', dumpType);
            cy.get('.cvat-modal-export-task').contains('button', 'OK').click();
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
                .scrollIntoView()
                .should('be.visible')
                .within(() => {
                    cy.get('.cvat-menu-load-submenu-item-button')
                        .click()
                        .get('input[type=file]')
                        .attachFile(annotationArchiveName);
                });
            cy.intercept('GET', '/api/jobs/**/annotations?**').as('uploadAnnotationsGet');
            confirmUpdate('.cvat-modal-content-load-job-annotation');
            cy.wait('@uploadAnnotationsGet').its('response.statusCode').should('equal', 200);
            cy.get('.cvat-notification-notice-upload-annotations-fail').should('not.exist');
            cy.get('#cvat_canvas_shape_1').should('exist');
            cy.get('#cvat-objects-sidebar-state-item-1').should('exist');
        });
    });
});

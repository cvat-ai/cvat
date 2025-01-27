// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
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

    const dumpType = 'YOLO 1.1';
    let annotationArchiveName = '';

    function confirmUpdate(modalWindowClassName) {
        cy.get(modalWindowClassName).should('be.visible').within(() => {
            cy.contains('button', 'Update').click();
        });
    }

    function uploadAnnotation(format, file, confirmModalClassName) {
        cy.get('.cvat-modal-import-dataset').should('be.visible');
        cy.get('.cvat-modal-import-select').click();
        cy.get('.ant-select-dropdown')
            .not('.ant-select-dropdown-hidden').within(() => {
                cy.get('.rc-virtual-list-holder')
                    .contains('.cvat-modal-import-dataset-option-item', format)
                    .click();
            });
        cy.get('.cvat-modal-import-select').should('contain.text', format);
        cy.get('input[type="file"]').attachFile(file, { subjectType: 'drag-n-drop' });
        cy.get(`[title="${file}"]`).should('be.visible');
        cy.contains('button', 'OK').click();
        confirmUpdate(confirmModalClassName);
        cy.get('.cvat-notification-notice-import-annotation-start').should('be.visible');
        cy.closeNotification('.cvat-notification-notice-import-annotation-start');
    }

    before(() => {
        cy.visit('/auth/login');
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
            cy.intercept('GET', '/api/jobs/**/annotations**').as('dumpAnnotations');
            cy.interactMenu('Export job dataset');
            cy.get('.cvat-modal-export-select').click();
            cy.get('.ant-select-dropdown')
                .not('.ant-select-dropdown-hidden');
            cy.get('.rc-virtual-list-holder')
                .contains('.cvat-modal-export-option-item', dumpType)
                .click();
            cy.get('.cvat-modal-export-select').should('contain.text', dumpType);
            cy.get('.cvat-modal-export-job').contains('button', 'OK').click();
            cy.get('.cvat-notification-notice-export-job-start').should('be.visible');
            cy.closeNotification('.cvat-notification-notice-export-job-start');
            cy.downloadExport();
            cy.goBack();
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
            cy.intercept('GET', '/api/jobs/**/annotations?**').as('uploadAnnotationsGet');
            uploadAnnotation(
                dumpType,
                annotationArchiveName,
                '.cvat-modal-content-load-job-annotation',
            );
            cy.wait('@uploadAnnotationsGet').its('response.statusCode').should('equal', 200);
            cy.contains('Annotations have been loaded').should('be.visible');
            cy.closeNotification('.ant-notification-notice-info');
            cy.get('.cvat-notification-notice-upload-annotations-fail').should('not.exist');
            cy.get('#cvat_canvas_shape_1').should('exist');
            cy.get('#cvat-objects-sidebar-state-item-1').should('exist');
        });
    });
});

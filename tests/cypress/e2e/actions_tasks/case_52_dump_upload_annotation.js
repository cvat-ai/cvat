// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Dump/Upload annotation.', { browser: '!firefox' }, () => {
    const caseId = '52';
    const createRectangleTrack2Points = {
        points: 'By 2 Points',
        type: 'Track',
        labelName,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };

    const labelNameSecond = `Case ${caseId}`;
    const taskNameSecond = `New annotation task for ${labelNameSecond}`;
    const attrName = `Attr for ${labelNameSecond}`;
    const textDefaultValue = 'Some default value for type Text';
    const imagesCount = 1;
    const imageFileName = `image_${labelNameSecond.replace(' ', '_').toLowerCase()}`;
    const width = 800;
    const height = 800;
    const posX = 10;
    const posY = 10;
    const color = 'gray';
    const archiveName = `${imageFileName}.zip`;
    const archivePath = `cypress/fixtures/${archiveName}`;
    const imagesFolder = `cypress/fixtures/${imageFileName}`;
    const directoryToArchive = imagesFolder;

    const exportFormat = 'CVAT for images';
    let annotationArchiveName = '';
    let annotationArchiveNameCustomName = '';

    function uploadToTask(toTaskName) {
        cy.contains('.cvat-item-task-name', toTaskName)
            .parents('.cvat-tasks-list-item')
            .find('.cvat-menu-icon')
            .click();
        cy.contains('Upload annotations').click();
        cy.get('.cvat-modal-import-dataset').find('.cvat-modal-import-select').click();
        cy.contains('.cvat-modal-import-dataset-option-item', exportFormat.split(' ')[0]).click();
        cy.get('.cvat-modal-import-select').should('contain.text', exportFormat.split(' ')[0]);
        cy.get('input[type="file"]').attachFile(annotationArchiveNameCustomName, { subjectType: 'drag-n-drop' });
        cy.get(`[title="${annotationArchiveNameCustomName}"]`).should('be.visible');
        cy.contains('button', 'OK').click();
    }

    function confirmUpdate(modalWindowClassName) {
        cy.get(modalWindowClassName)
            .should('be.visible')
            .within(() => {
                cy.contains('button', 'Update').click();
            });
    }

    before(() => {
        cy.openTaskJob(taskName);
        cy.createRectangle(createRectangleTrack2Points);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Save job. Dump annotation with renaming the archive.', () => {
            cy.saveJob('PATCH', 200, 'saveJobDump');
            const exportAnnotationRenameArchive = {
                as: 'exportAnnotationsRenameArchive',
                type: 'annotations',
                format: exportFormat,
                archiveCustomName: 'task_export_annotation_custome_name',
            };
            cy.exportJob(exportAnnotationRenameArchive);
            cy.downloadExport().then((file) => {
                annotationArchiveNameCustomName = file;
                cy.verifyDownload(annotationArchiveNameCustomName);
            });
            cy.goBack();
        });

        it('Save job. Dump annotation. Remove annotation. Save job.', () => {
            const exportAnnotation = {
                as: 'exportAnnotations',
                type: 'annotations',
                format: exportFormat,
            };
            cy.exportJob(exportAnnotation);
            cy.downloadExport().then((file) => {
                annotationArchiveName = file;
                cy.verifyDownload(annotationArchiveName);
            });
            cy.goBack();
            cy.removeAnnotations();
            cy.saveJob('PUT');
            cy.get('#cvat_canvas_shape_1').should('not.exist');
            cy.get('#cvat-objects-sidebar-state-item-1').should('not.exist');
        });

        it('Upload annotation to job.', () => {
            cy.interactMenu('Upload annotations');
            cy.get('.cvat-modal-import-dataset');
            cy.get('.cvat-modal-import-select').click();
            cy.contains('.cvat-modal-import-dataset-option-item', exportFormat.split(' ')[0]).click();
            cy.get('.cvat-modal-import-select').should('contain.text', exportFormat.split(' ')[0]);
            cy.get('input[type="file"]').attachFile(annotationArchiveName, { subjectType: 'drag-n-drop' });
            cy.get(`[title="${annotationArchiveName}"]`).should('be.visible');
            cy.contains('button', 'OK').click();
            confirmUpdate('.cvat-modal-content-load-job-annotation');
            cy.intercept('GET', '/api/jobs/**/annotations**').as('uploadAnnotationsGet');
            cy.get('.cvat-notification-notice-import-annotation-start').should('be.visible');
            cy.closeNotification('.cvat-notification-notice-import-annotation-start');
            cy.wait('@uploadAnnotationsGet').its('response.statusCode').should('equal', 200);
            cy.verifyNotification();
            cy.get('#cvat_canvas_shape_1').should('exist');
            cy.get('#cvat-objects-sidebar-state-item-1').should('exist');
            cy.removeAnnotations();
            cy.get('#cvat_canvas_shape_1').should('not.exist');
            cy.get('#cvat-objects-sidebar-state-item-1').should('not.exist');
        });

        it('Upload annotation to task.', () => {
            cy.goToTaskList();
            uploadToTask(taskName);
            confirmUpdate('.cvat-modal-content-load-task-annotation');
            cy.get('.cvat-notification-notice-import-annotation-start').should('be.visible');
            cy.closeNotification('.cvat-notification-notice-import-annotation-start');
            cy.verifyNotification();
            cy.openTaskJob(taskName, 0, false);
            cy.get('#cvat_canvas_shape_1').should('exist');
            cy.get('#cvat-objects-sidebar-state-item-1').should('exist');
        });

        it('Upload annotation to task which does not match the parameters. The error should be exist.', () => {
            cy.goToTaskList();
            cy.imageGenerator(
                imagesFolder,
                imageFileName,
                width,
                height,
                color,
                posX,
                posY,
                labelNameSecond,
                imagesCount,
            );
            cy.createZipArchive(directoryToArchive, archivePath);
            cy.createAnnotationTask(taskNameSecond, labelNameSecond, attrName, textDefaultValue, archiveName);
            uploadToTask(taskNameSecond);
            confirmUpdate('.cvat-modal-content-load-task-annotation');
            cy.get('.cvat-notification-notice-import-annotation-start').should('be.visible');
            cy.closeNotification('.cvat-notification-notice-import-annotation-start');
            cy.get('.cvat-notification-notice-load-annotation-failed')
                .should('exist')
                .find('[aria-label="close"]')
                .click();
            cy.deleteTask(taskNameSecond);
        });
    });
});

// Copyright (C) 2021-2022 Intel Corporation
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
    let annotationArchiveNameCustomeName = '';

    function uploadToTask(toTaskName) {
        cy.contains('.cvat-item-task-name', toTaskName)
            .parents('.cvat-tasks-list-item')
            .find('.cvat-menu-icon')
            .trigger('mouseover');
        cy.contains('Upload annotations').trigger('mouseover');
        cy.contains('.cvat-menu-load-submenu-item', exportFormat.split(' ')[0])
            .should('be.visible')
            .within(() => {
                cy.get('.cvat-menu-load-submenu-item-button').click();
            });
        // when a user clicks, menu is closing and it triggers rerender
        // we use mouseout here to emulate user behaviour
        cy.get('.cvat-actions-menu').trigger('mouseout').should('be.hidden');
        cy.contains('.cvat-menu-load-submenu-item', exportFormat.split(' ')[0]).within(() => {
            cy.get('input[type=file]').attachFile(annotationArchiveNameCustomeName);
        });
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
                archiveCustomeName: 'task_export_annotation_custome_name',
            };
            cy.exportTask(exportAnnotationRenameArchive);
            cy.getDownloadFileName().then((file) => {
                annotationArchiveNameCustomeName = file;
                cy.verifyDownload(annotationArchiveNameCustomeName);
            });
        });

        it('Save job. Dump annotation. Remove annotation. Save job.', () => {
            const exportAnnotation = {
                as: 'exportAnnotations',
                type: 'annotations',
                format: exportFormat,
            };
            cy.exportTask(exportAnnotation);
            cy.getDownloadFileName().then((file) => {
                annotationArchiveName = file;
                cy.verifyDownload(annotationArchiveName);
            });
            cy.removeAnnotations();
            cy.saveJob('PUT');
            cy.get('#cvat_canvas_shape_1').should('not.exist');
            cy.get('#cvat-objects-sidebar-state-item-1').should('not.exist');
        });

        it('Upload annotation to job.', () => {
            cy.interactMenu('Upload annotations');
            cy.contains('.cvat-menu-load-submenu-item', exportFormat.split(' ')[0])
                .should('be.visible')
                .within(() => {
                    cy.get('.cvat-menu-load-submenu-item-button').click();
                });
            // when a user clicks, menu is closing and it triggers rerender
            // we use mouseout here to emulate user behaviour
            cy.get('.cvat-annotation-menu').trigger('mouseout').should('be.hidden');
            cy.contains('.cvat-menu-load-submenu-item', exportFormat.split(' ')[0]).within(() => {
                cy.get('input[type=file]').attachFile(annotationArchiveName);
            });
            confirmUpdate('.cvat-modal-content-load-job-annotation');
            cy.intercept('GET', '/api/jobs/**/annotations**').as('uploadAnnotationsGet');
            cy.wait('@uploadAnnotationsGet').its('response.statusCode').should('equal', 200);
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
            cy.contains('Annotations have been loaded').should('be.visible');
            cy.get('[data-icon="close"]').click();
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
            cy.get('.cvat-notification-notice-load-annotation-failed')
                .should('exist')
                .find('[aria-label="close"]')
                .click();
            cy.deleteTask(taskNameSecond);
        });
    });
});

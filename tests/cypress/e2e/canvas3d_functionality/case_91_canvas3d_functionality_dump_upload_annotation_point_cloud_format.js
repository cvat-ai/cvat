// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const_canvas3d';

context('Canvas 3D functionality. Dump/upload annotation. "Point Cloud" format', () => {
    const caseId = '91';
    const cuboidCreationParams = {
        objectType: 'Shape',
        labelName,
        x: 480,
        y: 160,
    };
    const dumpTypePC = 'Sly Point Cloud Format';
    let annotationPCArchiveName = '';
    let annotationPCArchiveCustomName = '';

    function confirmUpdate(modalWindowClassName) {
        cy.get(modalWindowClassName).should('be.visible').within(() => {
            cy.contains('button', 'Update').click();
        });
    }

    function uploadAnnotation(format, file, confirmModalClassName) {
        cy.get('.cvat-modal-import-dataset').should('be.visible');
        cy.get('.cvat-modal-import-select').click();
        cy.contains('.cvat-modal-import-dataset-option-item', format).click();
        cy.get('.cvat-modal-import-select').should('contain.text', format);
        cy.get('input[type="file"]').attachFile(file, { subjectType: 'drag-n-drop' });
        cy.get(`[title="${file}"]`).should('be.visible');
        cy.contains('button', 'OK').click();
        confirmUpdate(confirmModalClassName);
        cy.get('.cvat-notification-notice-import-annotation-start').should('be.visible');
        cy.closeNotification('.cvat-notification-notice-import-annotation-start');
    }

    before(() => {
        cy.openTask(taskName);
        cy.openJob();
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(1000); // Waiting for the point cloud to display
        cy.create3DCuboid(cuboidCreationParams);
        cy.saveJob('PATCH', 200, 'saveJob');
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Export with "Point Cloud" format.', () => {
            const exportAnnotation = {
                as: 'exportAnnotations',
                type: 'annotations',
                format: dumpTypePC,
            };
            cy.exportJob(exportAnnotation);
            cy.downloadExport().then((file) => {
                annotationPCArchiveName = file;
                cy.verifyDownload(annotationPCArchiveName);
            });
            cy.goBack();
        });

        it('Export with "Point Cloud" format. Renaming the archive', () => {
            const exportAnnotationRenameArchive = {
                as: 'exportAnnotationsRenameArchive',
                type: 'annotations',
                format: dumpTypePC,
                archiveCustomName: 'job_export_3d_annotation_custome_name_pc_format',
            };
            cy.exportJob(exportAnnotationRenameArchive);
            cy.downloadExport().then((file) => {
                annotationPCArchiveCustomName = file;
                cy.verifyDownload(annotationPCArchiveCustomName);
            });
            cy.goBack();
            cy.removeAnnotations();
            cy.saveJob('PUT');
            cy.get('#cvat-objects-sidebar-state-item-1').should('not.exist');
        });

        it('Upload "Point Cloud" format annotation to job.', () => {
            cy.intercept('GET', '/api/jobs/**/annotations**').as('uploadAnnotationsGet');
            cy.interactMenu('Upload annotations');
            uploadAnnotation(
                dumpTypePC.split(' ')[0],
                annotationPCArchiveName,
                '.cvat-modal-content-load-job-annotation',
            );
            cy.wait('@uploadAnnotationsGet').its('response.statusCode').should('equal', 200);
            cy.verifyNotification();
            cy.get('#cvat-objects-sidebar-state-item-1').should('exist');
            cy.removeAnnotations();
            cy.clickSaveAnnotationView();
            cy.get('#cvat-objects-sidebar-state-item-1').should('not.exist');
        });

        it('Upload annotation from the archive with a custom name to task.', () => {
            cy.goToTaskList();
            cy.contains('.cvat-item-task-name', taskName)
                .parents('.cvat-tasks-list-item')
                .find('.cvat-menu-icon')
                .click();
            cy.contains('Upload annotations').click();
            uploadAnnotation(
                dumpTypePC.split(' ')[0],
                annotationPCArchiveName,
                '.cvat-modal-content-load-task-annotation',
            );
            cy.contains('Annotations have been loaded').should('be.visible');
            cy.closeNotification('.ant-notification-notice-info');
            cy.openTaskJob(taskName);
            cy.get('#cvat-objects-sidebar-state-item-1').should('exist');
            cy.removeAnnotations();
            cy.clickSaveAnnotationView();
        });
    });
});

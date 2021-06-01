// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const_canvas3d';

context('Canvas 3D functionality. Dump/upload annotation. "Point Cloud" format', () => {
    const caseId = '91';
    const screenshotsPath = 'cypress/screenshots/canvas3d_functionality/case_91_canvas3d_functionality_dump_upload_annotation_point_cloud_format.js';
    const cuboidCreationParams = {
        labelName: labelName,
    };
    const dumpTypePC = 'Point Cloud Format';
    let annotationPCArchiveName = '';

    function confirmUpdate(modalWindowClassName) {
        cy.get(modalWindowClassName).within(() => {
            cy.contains('button', 'Update').click();
        });
    }

    before(() => {
        cy.openTask(taskName)
        cy.openJob();
        cy.wait(1000); // Waiting for the point cloud to display
        cy.create3DCuboid(cuboidCreationParams);
        cy.get('.cvat-canvas3d-perspective').screenshot('canvas3d_perspective_after_add_cuboid');

    });

    describe(`Testing case "${caseId}"`, () => {
        it('Save a job. Upload with "Point Cloud" format.', () => {
            cy.saveJob('PATCH', 200, 'saveJob');
            cy.intercept('GET', '/api/v1/tasks/**/annotations**').as('dumpAnnotations');
            cy.interactMenu('Dump annotations');
            cy.get('.cvat-menu-dump-submenu-item').then((subMenu) => {
                expect(subMenu.length).to.be.equal(2)
            });
            cy.get('.cvat-menu-dump-submenu-item').within(() => {
                cy.contains(dumpTypePC).click();
            });
            cy.wait('@dumpAnnotations', { timeout: 5000 }).its('response.statusCode').should('equal', 202);
            cy.wait('@dumpAnnotations').its('response.statusCode').should('equal', 201);
            cy.removeAnnotations();
            cy.saveJob('PUT');
            cy.get('#cvat-objects-sidebar-state-item-1').should('not.exist');

            cy.wait(2000); // Waiting for the full download.
            cy.task('listFiles', 'cypress/fixtures').each((fileName) => {
                if (fileName.includes(dumpTypePC.toLowerCase())) {
                    annotationPCArchiveName = fileName;
                }
            });
        });

        it('Upload "Point Cloud" format annotation to job.', () => {
            cy.interactMenu('Upload annotations');
            cy.contains('.cvat-menu-load-submenu-item', dumpTypePC.split(' ')[0])
                .should('be.visible')
                .within(() => {
                    cy.get('.cvat-menu-load-submenu-item-button')
                        .click()
                        .get('input[type=file]')
                        .attachFile(annotationPCArchiveName);
                });
            cy.intercept('PUT', '/api/v1/jobs/**/annotations**').as('uploadAnnotationsPut');
            cy.intercept('GET', '/api/v1/jobs/**/annotations**').as('uploadAnnotationsGet');
            confirmUpdate('.cvat-modal-content-load-job-annotation');
            cy.wait('@uploadAnnotationsPut', { timeout: 5000 }).its('response.statusCode').should('equal', 202);
            cy.wait('@uploadAnnotationsPut').its('response.statusCode').should('equal', 201);
            cy.wait('@uploadAnnotationsGet').its('response.statusCode').should('equal', 200);
            cy.get('#cvat-objects-sidebar-state-item-1').should('exist');
            cy.get('.cvat-canvas3d-perspective').screenshot('canvas3d_perspective_after_upload_annotation');
            cy.compareImagesAndCheckResult(
                `${screenshotsPath}/canvas3d_perspective_after_add_cuboid.png`,
                `${screenshotsPath}/canvas3d_perspective_after_upload_annotation.png`,
                true,
            );
            cy.removeAnnotations();
            cy.get('button').contains('Save').click({ force: true });
        });
    });
});

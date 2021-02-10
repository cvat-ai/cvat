// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Dump/Upload annotation.', { browser: '!firefox' }, () => {
    const caseId = '52';
    const createRectangleTrack2Points = {
        points: 'By 2 Points',
        type: 'Track',
        labelName: labelName,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };

    const dumpType = 'CVAT for images';
    let annotationArchiveName = '';

    before(() => {
        cy.openTaskJob(taskName);
        cy.createRectangle(createRectangleTrack2Points);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Save job. Dump annotaion. Remove annotation. Save job.', () => {
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

            cy.wait(2000); // Waiting for the full download.
            cy.task('listFiles', 'cypress/fixtures').each((fileName) => {
                if (fileName.includes(dumpType.toLowerCase())) {
                    annotationArchiveName = fileName;
                }
            });
        });

        it('Upload annotation.', () => {
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
            cy.get('.cvat-modal-content-load-job-annotation').within(() => {
                cy.contains('button', 'Update').click();
            });
            cy.wait('@uploadAnnotationsPut', { timeout: 5000 }).its('response.statusCode').should('equal', 202);
            cy.wait('@uploadAnnotationsPut').its('response.statusCode').should('equal', 201);
            cy.wait('@uploadAnnotationsGet').its('response.statusCode').should('equal', 200);
            cy.get('#cvat_canvas_shape_1').should('exist');
            cy.get('#cvat-objects-sidebar-state-item-1').should('exist');
        });
    });
});

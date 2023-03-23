// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Upload annotations in different file formats', () => {
    const issueId = '5274';
    const createRectangleTrack2Points = {
        points: 'By 2 Points',
        type: 'Track',
        labelName,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };

    const archives = [
        {
            type: 'annotations',
            format: 'CVAT for images',
            archiveCustomName: 'issue5274-cvat-for-images',
            annotationsPath: 'annotations.xml',
        },
        {
            type: 'annotations',
            format: 'COCO',
            archiveCustomName: 'issue5274-coco',
            annotationsPath: 'annotations/instances_default.json',
        },
    ];

    before(() => {
        cy.openTaskJob(taskName);
        cy.createRectangle(createRectangleTrack2Points);
        cy.saveJob('PATCH', 200, 'saveJobDump');
        for (const archive of archives) {
            cy.exportJob(archive);
            cy.waitForDownload();
            cy.unpackZipArchive(`cypress/fixtures/${archive.archiveCustomName}.zip`, archive.archiveCustomName);
        }
    });

    describe(`Testing issue "${issueId}"`, () => {
        it('Dump annotations. Upload different file formats.', () => {
            cy.removeAnnotations();
            cy.intercept('GET', '/api/jobs/**/annotations?**').as('uploadAnnotationsGet');
            for (const archive of archives) {
                cy.interactMenu('Upload annotations');
                cy.uploadAnnotations(
                    archive.format.split(' ')[0],
                    `${archive.archiveCustomName}/${archive.annotationsPath}`,
                    '.cvat-modal-content-load-job-annotation',
                );

                cy.get('.cvat-notification-notice-upload-annotations-fail').should('not.exist');
                cy.get('#cvat_canvas_shape_1').should('exist');
                cy.get('#cvat-objects-sidebar-state-item-1').should('exist');

                cy.removeAnnotations();
            }
        });
    });
});

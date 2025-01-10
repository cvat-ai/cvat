// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context.skip('OpenCV - TrackerMIL - Tracking error with big resolution', () => {
    const issueId = '8894';
    const labelName = `${issueId}`;
    const attrName = `Attr for ${labelName}`;
    const imageFileName = `image_${labelName.replace(' ', '_').toLowerCase()}`;
    const width = 5000;
    const height = 5000;
    const posX = 10;
    const posY = 10;
    const color = 'gray';
    const imagesFolder = `cypress/fixtures/${imageFileName}`;
    const archiveName = `${imageFileName}.zip`;
    const archivePath = `cypress/fixtures/${archiveName}`;
    const directoryToArchive = imagesFolder;
    const extension = 'jpg';
    const textDefaultValue = 'Some default value for type Text';
    const spacing = 5;
    const imagesCount = 3;

    const createOpencvTrackerShape = {
        labelName,
        tracker: 'TrackerMIL',
        pointsMap: [
            { x: 430, y: 40 },
            { x: 640, y: 145 },
        ],
    };

    function loadOpenCV() {
        cy.interactOpenCVControlButton();
        cy.get('.cvat-opencv-control-popover').within(() => {
            cy.contains('OpenCV is loading').should('not.exist');
        });
        cy.get('body').click();
    }

    before(() => {
        for (let i = 0; i < imagesCount; i++) {
            cy.imageGenerator(imagesFolder, imageFileName + i, width, height, color, posX + i * spacing,
                posY + i * spacing, labelName, 1, extension);
        }
        cy.createZipArchive(directoryToArchive, archivePath);
        cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, archiveName);

        cy.openTaskJob(taskName);
    });
    describe(`Testing issue ${issueId}`, () => {
        // TODO: activate it after the fix
        it.skip('Create a shape with "TrackerMIL" on a big picture. Look out for a tracking error', () => {
            const shapeNumber = 1;
            loadOpenCV();
            // We will start testing tracking from 2nd frame because it's a bit unstable on inintialization
            cy.goToNextFrame(1);
            cy.createOpenCVTrack(createOpencvTrackerShape);
            cy.get('.cvat-tracking-notice').should('not.exist');
            cy.get(`#cvat_canvas_shape_${shapeNumber}`)
                .then(() => {
                    cy.get('.cvat-tracking-notice').should('not.exist');
                    cy.get(`#cvat-objects-sidebar-state-item-${shapeNumber}`)
                        .should('contain', 'RECTANGLE TRACK');
                    // We don't actually check tracking functionality, we just doing load testing
                });
            cy.goToNextFrame(2);
            cy.get('.ant-notification-notice-message').contains('Tracking error').should('not.exist');
        });
    });
});

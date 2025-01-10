// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { inspect } from 'util';
import { taskName } from '../../support/const';

context('OpenCV - TrackerMIL - Tracking error', () => {
    const issueId = '8894';
    // const labelName = `Issue ${issueId}`;
    const labelName = `${issueId}`;
    const text = labelName;
    const attrName = `Attr for ${labelName}`;
    const imageFileName = `image_${labelName.replace(' ', '_').toLowerCase()}`;
    const width = 5000;
    const height = 5000;
    // const textWidth = 375;
    // const textHeight = 52;
    const posX0 = 101;
    const posY0 = 103;
    const color = 'gray';
    const archiveName = `${imageFileName}.zip`;
    const archivePath = `cypress/fixtures/${archiveName}`;
    const imagesFolder = `cypress/fixtures/${imageFileName}`;
    const directoryToArchive = imagesFolder;
    const extension = 'jpg';
    // const objCount = 1;
    const textDefaultValue = 'Some default value for type Text';

    const spacing = 100; // minimal step so that texts don't overlap
    // const imagesCount = 3;
    // const scale = textWidth / textHeight;

    const opencvTrackerShape = {
        labelName,
        tracker: 'TrackerMIL',
        pointsMap: [
            { x: 50, y: 20 }, //
            { x: 150, y: 35 },
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
        cy.imageGenerator(
            imagesFolder, '01',
            width, height, color,
            posX0, posY0,
            text, 1, extension,
        );
        cy.imageGenerator(
            imagesFolder, '02',
            width, height, color,
            posX0 + spacing, posY0,
            text, 1, extension,
        );
        cy.createZipArchive(directoryToArchive, archivePath);
        cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, archiveName);
        cy.openTaskJob(taskName);
    });
    describe(`Testing issue ${issueId}`, () => {
        it('Testing TrackerMIL', () => {
            loadOpenCV();
            cy.get('#cvat_canvas_content,#cvat_canvas_background')
            // .then(([$el]) => {

                //     return {
                //         svg: $el,
                //         canvas,
                //     };
            //     cy.find()
            //     const canvasBackground = $el.querySelector('canvas');
            //     const svgObj = $el.querySelector('svg');
            //     // cy.task('log', svgObj.getCTM());
            //     // cy.task('log', canvasBackground);
            //     return {
            //         svg: svgObj.getCTM(),
            //         canvasBackground,
            //     };
            // })
            // .then((obj) => cy.task('log', obj))
                .then(([stuff]) => {
                    // cy.customScreenshot('iframe.aut-iframe', 'iframe');
                    cy.task('log', inspect(stuff));
                    // cy.task('log', obj);
                    cy.createOpenCVTrack(opencvTrackerShape).then(() => {
                        cy.screenshot('looking_for_tracking_error1', { capture: 'runner', overwrite: true });
                        cy.goToNextFrame(1)
                        // .then(() => cy.wait(2))
                            .then(() => cy.screenshot('looking_for_tracking_error2', { capture: 'runner', overwrite: true }));
                    });
                });
        });
    });
});
// });
// cy.customScreenshot('', `${i}`);

// for (let i = 0; i < imagesCount; i++) {
// cy.screenshot(`page_${i}`, { capture: 'fullPage' });
// cy.screenshot(`viewport_${i}`, { capture: 'viewport', scale: false, overwrite: true });
// cy.screenshot(`viewport_${i}`, { capture: 'viewport' });
//     cy.customScreenshot('', `custom_${i}`);
//     cy.goToNextFrame(i + 1);
// cy.screenshot({ capture: 'fullPage' });
// }
// cy.

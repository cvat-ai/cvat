// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { generateString } from '../../support/utils';

context('OpenCV. Intelligent scissors. Histogram Equalization. TrackerMIL.', () => {
    const caseId = '101';
    const labelName = `Case ${caseId}`;
    const newLabel = `Case ${caseId}`;
    const createOpencvShape = {
        labelName,
        pointsMap: [
            { x: 200, y: 200 },
            { x: 250, y: 200 },
            { x: 300, y: 250 },
            { x: 350, y: 300 },
            { x: 300, y: 350 },
        ],
    };
    const createOpencvShapeSecondLabel = {
        labelName: newLabel,
        pointsMap: [
            { x: 300, y: 200 },
            { x: 350, y: 200 },
            { x: 400, y: 250 },
            { x: 450, y: 300 },
            { x: 400, y: 350 },
        ],
        finishWithButton: true,
    };

    const createRectangleTrack2Points = {
        points: 'By 2 Points',
        type: 'Track',
        firstX: 430,
        firstY: 40,
        secondX: 640,
        secondY: 145,
        labelName,
    };

    const keyCodeN = 78;
    const pointsMap = [
        { x: 300, y: 400 },
        { x: 350, y: 500 },
        { x: 400, y: 450 },
        { x: 450, y: 500 },
        { x: 400, y: 550 },
    ];

    const taskName = `New annotation task for ${labelName}`;
    const attrName = `Attr for ${labelName}`;
    const textDefaultValue = 'Some default value for type Text';
    const imagesCount = 5;
    const imageFileName = `image_${labelName.replace(' ', '_').toLowerCase()}`;
    const width = 400;
    const height = 400;
    const posX = 10;
    const posY = 10;
    const color = 'gray';
    const archiveName = `${imageFileName}.zip`;
    const archivePath = `cypress/fixtures/${archiveName}`;
    const imagesFolder = `cypress/fixtures/${imageFileName}`;
    const directoryToArchive = imagesFolder;
    const extension = 'jpg';

    before(() => {
        cy.visit('/auth/login');
        cy.login();
        for (let i = 0; i < imagesCount; i++) {
            cy.imageGenerator(imagesFolder, imageFileName + i, width, height, color, posX + i * 5,
                posY + i * 5, labelName, 1, extension);
        }
        cy.createZipArchive(directoryToArchive, archivePath);
        cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, archiveName);
        cy.openTaskJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Load OpenCV.', () => {
            cy.interactOpenCVControlButton();
            cy.get('.cvat-opencv-control-popover').within(() => {
                cy.contains('OpenCV is loading').should('not.exist');
            });
            cy.get('body').click();
        });

        it('Create a shape with "Intelligent cissors". Create the second shape with the label change and "Done" button.', () => {
            cy.interactOpenCVControlButton();
            cy.get('.cvat-opencv-drawing-tool').should('exist').and('be.visible');
            cy.get('body').click();

            cy.opencvCreateShape(createOpencvShape);
            cy.opencvCreateShape(createOpencvShapeSecondLabel);
        });

        it('Change the number of points when the shape is drawn. Cancel drawing.', () => {
            cy.interactOpenCVControlButton();
            cy.get('.cvat-opencv-drawing-tool').click();
            pointsMap.forEach((element) => {
                cy.get('.cvat-canvas-container').click(element.x, element.y);
            });
            cy.get('.cvat_canvas_interact_intermediate_shape').then((intermediateShape) => {
                // Get count of points
                const intermediateShapeNumberPointsBeforeChange = intermediateShape.attr('points').split(' ').length;
                // expected 7 to be above 5
                expect(intermediateShapeNumberPointsBeforeChange).to.be.gt(pointsMap.length);
                // Change number of points
                cy.get('.cvat-approx-poly-threshold-wrapper')
                    .find('[role="slider"]')
                    .type(generateString(4, 'rightarrow'));
                cy.get('.cvat_canvas_interact_intermediate_shape').then((_intermediateShape) => {
                    // Get count of points againe
                    const intermediateShapeNumberPointsAfterChange = _intermediateShape.attr('points').split(' ').length;
                    // expected 7 to be below 10
                    expect(intermediateShapeNumberPointsBeforeChange).to.be.lt(
                        intermediateShapeNumberPointsAfterChange,
                    );
                });
            });
            cy.get('.cvat-appearance-selected-opacity-slider').click('left');
            cy.get('.cvat-appearance-selected-opacity-slider').find('[role="slider"]')
                .then((sliderSelectedOpacityLeft) => {
                    const sliderSelectedOpacityValuenow = sliderSelectedOpacityLeft.attr('aria-valuenow');
                    cy.get('.cvat_canvas_interact_intermediate_shape').should(
                        'have.attr',
                        'fill-opacity',
                        sliderSelectedOpacityValuenow / 100,
                    );
                });
            cy.get('.cvat-appearance-selected-opacity-slider').click('right');
            cy.get('.cvat-appearance-selected-opacity-slider')
                .find('[role="slider"]')
                .then((sliderSelectedOpacityRight) => {
                    const sliderSelectedOpacityValuenow = sliderSelectedOpacityRight.attr('aria-valuenow');
                    cy.get('.cvat_canvas_interact_intermediate_shape').should(
                        'have.attr',
                        'fill-opacity',
                        sliderSelectedOpacityValuenow / 100,
                    );
                });
            cy.get('body').type('{Esc}'); // Cancel drawing
            cy.get('.cvat_canvas_interact_intermediate_shape').should('not.exist');
            cy.get('.cvat_canvas_shape').should('have.length', 2);
        });

        it('Check "Intelligent scissors blocking feature". Cancel drawing.', () => {
            cy.interactOpenCVControlButton();
            cy.get('.cvat-opencv-drawing-tool').click();
            cy.get('.cvat-annotation-header-block-tool-button').click();
            cy.get('.cvat-annotation-header-block-tool-button').should('have.class', 'cvat-button-active');

            pointsMap.forEach((element) => {
                cy.get('.cvat-canvas-container').click(element.x, element.y);
            });

            cy.get('.cvat_canvas_interact_intermediate_shape').then((intermediateShape) => {
                // The last point on the crosshair
                expect(intermediateShape.attr('points').split(' ').length - 1).to.be.equal(pointsMap.length);
            });

            cy.get('.cvat-annotation-header-block-tool-button').click();
            cy.get('.cvat-annotation-header-block-tool-button').should('not.have.class', 'cvat-button-active');
            cy.get('.cvat-canvas-container').click(600, 600);

            cy.get('.cvat_canvas_interact_intermediate_shape').then((intermediateShape) => {
                // The last point on the crosshair
                expect(intermediateShape.attr('points').split(' ').length).to.be.gt(pointsMap.length);
            });

            // Cancel drawing
            cy.get('body').type('{Esc}');
        });

        it('Check "Histogram Equalization" feature.', () => {
            cy.checkPopoverHidden('opencv-control');
            cy.interactOpenCVControlButton();
            cy.get('.cvat-opencv-control-popover').contains('[role="tab"]', 'Image').click();
            cy.get('.cvat-opencv-control-popover').contains('[role="tab"]', 'Image')
                .parents('.ant-tabs-tab')
                .should('have.class', 'ant-tabs-tab-active');
            cy.get('.cvat-opencv-image-tool').click();
            cy.get('.cvat-opencv-image-tool').should('have.class', 'cvat-opencv-image-tool-active');
            cy.get('.cvat-notification-notice-image-processing-error').should('not.exist');
            cy.get('.cvat-opencv-image-tool').click();
            cy.get('.cvat-opencv-image-tool').should('not.have.class', 'cvat-opencv-image-tool-active');
            cy.get('.cvat-opencv-image-tool').trigger('mouseleave');
            cy.get('.cvat-opencv-image-tool').trigger('mouseout');
            cy.get('.cvat-opencv-control').click();
        });

        // Waiting for fix https://github.com/openvinotoolkit/cvat/issues/3474
        it.skip('Redraw the shape created with "Intelligent cissors".', () => {
            cy.get('.cvat-canvas-container').click();
            cy.get('.cvat-opencv-control-popover').should('be.hidden');
            cy.get('#cvat_canvas_shape_1').trigger('mousemove');
            cy.get('#cvat_canvas_shape_1').trigger('mouseover');
            cy.get('#cvat_canvas_shape_1').should('have.class', 'cvat_canvas_shape_activated');
            cy.get('body').trigger('keydown', { keyCode: keyCodeN, code: 'KeyN', shiftKey: true });
            cy.get('body').trigger('keyup');
            cy.get('.cvat-opencv-control').should('have.attr', 'tabindex');
            createOpencvShape.pointsMap.forEach((el) => {
                cy.get('.cvat-canvas-container').click(el.x + 150, el.y + 50);
            });
            cy.get('body').trigger('keydown', { keyCode: keyCodeN, code: 'KeyN' });
            cy.get('body').trigger('keyup');
        });

        it('Create a shape with "TrackerMIL". Track it for several frames.', () => {
            cy.createRectangle(createRectangleTrack2Points);
            // We will start testing tracking from 2-d frame because it's a bit unstable on inintialization
            cy.useOpenCVTracker({ tracker: 'TrackerMIL', targetFrame: 4 });
            cy.get('#cvat_canvas_shape_4')
                .then((shape) => {
                    const x = Math.round(shape.attr('x'));
                    const y = Math.round(shape.attr('y'));
                    for (let i = 1; i < imagesCount; i++) {
                        cy.goToNextFrame(i);
                        // In the beginning of this test we created images with text
                        // On each frame text is moved by 5px on x and y axis,
                        // so we expect shape to be close to real text positions
                        cy.get('#cvat_canvas_shape_4').invoke('attr', 'x').then((xVal) => {
                            expect(parseFloat(xVal)).to.be.closeTo(x + i * 5, 3.0);
                        });
                        cy.get('#cvat_canvas_shape_4').invoke('attr', 'y').then((yVal) => {
                            expect(parseFloat(yVal)).to.be.closeTo(y + i * 5, 3.0);
                        });
                        cy.get('#cvat-objects-sidebar-state-item-4')
                            .should('contain', 'RECTANGLE TRACK')
                            .within(() => {
                                cy.get('.cvat-object-item-button-keyframe-enabled').should('exist');
                            });
                    }
                });
        });
    });
});

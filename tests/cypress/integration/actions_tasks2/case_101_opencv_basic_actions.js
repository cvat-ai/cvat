// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';
import { generateString } from '../../support/utils';

context('OpenCV. Intelligent cissors. Histogram Equalization.', () => {
    const caseId = '101';
    const newLabel = `Case ${caseId}`
    const createOpencvShape = {
        labelName: labelName,
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
    const keyCodeN = 78;
    const pointsMap = [
        { x: 300, y: 400 },
        { x: 350, y: 500 },
        { x: 400, y: 450 },
        { x: 450, y: 500 },
        { x: 400, y: 550 },
    ];

    function openOpencvControlPopover() {
        cy.get('body').focus();
        cy.get('.cvat-tools-control').trigger('mouseleave').trigger('mouseout').trigger('mouseover');
    }

    before(() => {
        cy.openTask(taskName);
        cy.addNewLabel(newLabel);
        cy.openJob();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Load OpenCV.', () => {
            openOpencvControlPopover();
            cy.get('.cvat-opencv-control-popover-visible').find('.cvat-opencv-initialization-button').click();
            // Intelligent cissors button be visible
            cy.get('.cvat-opencv-drawing-tool').should('exist').and('be.visible');
        });

        it('Create a shape with "Intelligent cissors". Create the second shape with the label change and "Done" button.', () => {
            cy.opencvCreateShape(createOpencvShape);
            cy.opencvCreateShape(createOpencvShapeSecondLabel);
        });

        it('Change the number of points when the shape is drawn. Cancel drawing.', () => {
            openOpencvControlPopover();
            cy.get('.cvat-opencv-drawing-tool').click();
            pointsMap.forEach((element) => {
                cy.get('.cvat-canvas-container').click(element.x, element.y);
            });
            cy.get('.cvat_canvas_interact_intermediate_shape').then((intermediateShape) => {
                // Get count of points
                const intermediateShapeNumberPointsBeforeChange = intermediateShape.attr('points').split(' ').length;
                // Change number of points
                cy.get('.cvat-approx-poly-threshold-wrapper')
                    .find('[role="slider"]')
                    .type(generateString(4, 'rightarrow'));
                cy.get('.cvat_canvas_interact_intermediate_shape').then((intermediateShape) => {
                    // Get count of points againe
                    const intermediateShapeNumberPointsAfterChange = intermediateShape.attr('points').split(' ').length;
                    // expected 7 to be below 10
                    expect(intermediateShapeNumberPointsBeforeChange).to.be.lt(intermediateShapeNumberPointsAfterChange);
                });
            });
            cy.get('body').type('{Esc}'); // Cancel drawing
            cy.get('.cvat_canvas_interact_intermediate_shape').should('not.exist');
            cy.get('.cvat_canvas_shape').should('have.length', 2);
        });

        it('Check "Histogram Equalization" feature.', () => {
            openOpencvControlPopover();
            cy.get('.cvat-opencv-control-popover-visible').contains('[role="tab"]', 'Image').click();
            cy.get('.cvat-opencv-image-tool').click().should('have.class', 'cvat-opencv-image-tool-active').trigger('mouseout');
            cy.get('.cvat-notification-notice-opencv-processing-error').should('not.exist');
            cy.get('.cvat-opencv-image-tool').click().should('not.have.class', 'cvat-opencv-image-tool-active').trigger('mouseout');
        });

        // Waiting for fix https://github.com/openvinotoolkit/cvat/issues/3474
        it.skip('Redraw the shape created with "Intelligent cissors".', () => {
            cy.get('.cvat-canvas-container').click();
            cy.get('.cvat-opencv-control-popover').should('be.hidden');
            cy.get('#cvat_canvas_shape_1')
                .trigger('mousemove')
                .trigger('mouseover')
                .should('have.class', 'cvat_canvas_shape_activated');
            cy.get('body').trigger('keydown', { keyCode: keyCodeN, shiftKey: true }).trigger('keyup');
            cy.get('.cvat-tools-control').should('have.attr', 'tabindex');
            createOpencvShape.pointsMap.forEach((el) => {
                cy.get('.cvat-canvas-container')
                    .click(el.x + 150, el.y + 50)
            });
            cy.get('body').trigger('keydown', { keyCode: keyCodeN }).trigger('keyup');
        });
    });
});

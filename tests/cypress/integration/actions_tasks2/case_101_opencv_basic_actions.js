// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('OpenCV. Intelligent cissors. Basic actions.', () => {
    const caseId = '101';
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
    const newLabel = `${createOpencvShape.labelName} new`
    const createOpencvShapeSecondLabel = {
        labelName: newLabel,
        pointsMap: [
            { x: 300, y: 200 },
            { x: 350, y: 200 },
            { x: 400, y: 250 },
            { x: 450, y: 300 },
            { x: 400, y: 350 },
        ],
        useDoneButton: true,
    };
    const keyCodeN = 78;
    const pointsMap = [
        { x: 300, y: 400 },
        { x: 350, y: 500 },
        { x: 400, y: 450 },
        { x: 450, y: 500 },
        { x: 400, y: 550 },
    ]

    function generateString(countPointsToMove) {
        let action = '';
        for (let i = 0; i < countPointsToMove; i++) {
            action += '{rightarrow}';
        }
        return action;
    }

    before(() => {
        cy.openTask(taskName);
        cy.addNewLabel(newLabel);
        cy.openJob();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Load OpenCV.', () => {
            cy.get('.cvat-tools-control').click();
            cy.get('.cvat-opencv-control-popover-visible').find('.cvat-opencv-initialization-button').click();
            // Intelligent cissors button be visible
            cy.get('.cvat-opencv-drawing-tool').should('exist').and('be.visible');
        });

        it('Create a shape with "Intelligent cissors".', () => {
            cy.opencvCreateShape(createOpencvShape);
        });

        it('Create a shape with "Intelligent cissors" and "Done" button.', () => {
            cy.opencvCreateShape(createOpencvShapeSecondLabel);
        });

        it('Change the number of points when the shape is drawn.', () => {
            cy.get('body').focus();
            cy.get('.cvat-tools-control').trigger('mouseleave').trigger('mouseout').trigger('mouseover');
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
                    .type(generateString(4))
                cy.get('.cvat_canvas_interact_intermediate_shape').then((intermediateShape) => {
                    // Get count of points againe
                    const intermediateShapeNumberPointsAfterChange = intermediateShape.attr('points').split(' ').length;
                    // expected 7 to be below 10
                    expect(intermediateShapeNumberPointsBeforeChange).to.be.lt(intermediateShapeNumberPointsAfterChange);
                });
            });
            cy.get('.cvat-canvas-container')
                .trigger('keydown', { keyCode: keyCodeN })
                .trigger('keyup', { keyCode: keyCodeN });
        });

        // Waiting for fix https://github.com/openvinotoolkit/cvat/issues/3474
        it.skip('Redraw the shape created with "Intelligent cissors".', () => {
            cy.get('#cvat_canvas_shape_1')
                .trigger('mousemove', {scrollBehavior: false})
                .trigger('mouseover', {scrollBehavior: false})
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

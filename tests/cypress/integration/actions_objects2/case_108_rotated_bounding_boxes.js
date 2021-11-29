// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { labelName, taskName } from '../../support/const';

context('Rotated bounding boxes.', () => {
    const caseId = '108';
    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };
    const createRectangleTrack2Points = {
        points: 'By 2 Points',
        type: 'Track',
        labelName,
        firstX: createRectangleShape2Points.firstX,
        firstY: createRectangleShape2Points.firstY - 150,
        secondX: createRectangleShape2Points.secondX,
        secondY: createRectangleShape2Points.secondY - 150,
    };

    const transformMatrixShape = [];

    function testShapeRotate(shape, x, y, expectedRorate, shift) {
        cy.get(shape)
            .trigger('mousemove')
            .trigger('mouseover')
            .should('have.class', 'cvat_canvas_shape_activated');
        cy.get('.svg_select_points_rot')
            .should('be.visible')
            .and('have.length', 1)
            .trigger('mousemove')
            .trigger('mouseover')
            .trigger('mousedown', { button: 0 });
        if (shift) {
            cy.get('.cvat-canvas-container').trigger('mousemove', x, y, { shiftKey: true });
        } else {
            cy.get('.cvat-canvas-container').trigger('mousemove', x, y);
        }
        cy.get('#cvat_canvas_text_content').should('contain.text', expectedRorate);
        cy.get('.cvat-canvas-container').trigger('mouseup');
        cy.get(shape).should('have.attr', 'transform');
    }

    before(() => {
        cy.openTask(taskName);
        cy.openJob();
        Cypress.config('scrollBehavior', false);
        cy.createRectangle(createRectangleShape2Points);
        cy.createRectangle(createRectangleTrack2Points);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Check that bounding boxes can be rotated.', () => {
            testShapeRotate('#cvat_canvas_shape_1', 350, 150, '11.4°');
            testShapeRotate('#cvat_canvas_shape_2', 350, 150, '26.6°');
            cy.get('#cvat_canvas_shape_2').then((shape2) => {
                const shapeAttrs = shape2.attr('transform').split('(')[1].split(')')[0].split(',');
                for (const i of shapeAttrs) {
                    transformMatrixShape.push(Number(i).toFixed(3));
                }
            });
        });

        it('Check interpolation, merging/splitting rotated shapes.', () => {
            // Check track roration on all frames
            for (let frame = 1; frame < 10; frame++) {
                cy.goToNextFrame(frame);
                cy.get('#cvat_canvas_shape_2').should('have.attr', 'transform').then(($transform) => {
                    const transform = $transform.split('(')[1].split(')')[0].split(',');
                    const transformMatrix = [];
                    for (const i of transform) {
                        transformMatrix.push(Number(i).toFixed(3));
                    }
                    expect(transformMatrix).to.deep.eq(transformMatrixShape);
                });
            }
            // Merge tracks
            cy.get('.cvat-merge-control').click();
            cy.get('#cvat_canvas_shape_2').click();
            cy.get('body').type('m');

            testShapeRotate('#cvat_canvas_shape_2', 350, 250, '91.9°');

            // Comparison of the values of the shape attribute of the current frame with the previous frame
            for (let frame = 8; frame >= 1; frame--) {
                cy.get('#cvat_canvas_shape_2').should('have.attr', 'transform').then(($transform) => {
                    const transform = $transform.split('(')[1].split(')')[0].split(',');
                    const transformMatrix = [];
                    for (const i of transform) {
                        transformMatrix.push(Number(i).toFixed(3));
                    }
                    cy.goToPreviousFrame(frame);
                    cy.get('#cvat_canvas_shape_2').should('have.attr', 'transform').then(($transform2) => {
                        const transform2 = $transform2.split('(')[1].split(')')[0].split(',');
                        const transformMatrix2 = [];
                        for (const i of transform2) {
                            transformMatrix2.push(Number(i).toFixed(3));
                        }
                        expect(transformMatrix).not.deep.eq(transformMatrix2);
                    });
                });
            }
            cy.goCheckFrameNumber(2);

            // Split tracks
            cy.get('.cvat-split-track-control').click();
            // A single click does not reproduce the split a track scenario in cypress test.
            cy.get('#cvat_canvas_shape_2').click().click();
            cy.get('#cvat_canvas_shape_3').should('have.attr', 'transform').then((shapeTransform) => {
                cy.get('#cvat_canvas_shape_4').should('have.attr', 'transform', shapeTransform);
            });
        });

        it('Check rotation with hold Shift button.', () => {
            cy.goCheckFrameNumber(0);
            testShapeRotate('#cvat_canvas_shape_1', 350, 150, '13.0°', true);
            testShapeRotate('#cvat_canvas_shape_1', 350, 180, '14.2°', true);
        });
    });
});

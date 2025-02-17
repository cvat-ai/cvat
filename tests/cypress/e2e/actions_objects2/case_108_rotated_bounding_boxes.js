// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { labelName, taskName } from '../../support/const';
import { decomposeMatrix } from '../../support/utils';

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

    function testCompareRotate(shape, toFrame) {
        for (let frame = 8; frame >= toFrame; frame--) {
            cy.document().then((doc) => {
                const shapeTranformMatrix = decomposeMatrix(doc.getElementById(shape).getCTM());
                cy.goToPreviousFrame(frame);
                cy.document().then((doc2) => {
                    const shapeTranformMatrix2 = decomposeMatrix(doc2.getElementById(shape).getCTM());
                    expect(shapeTranformMatrix).not.deep.eq(shapeTranformMatrix2);
                });
            });
        }
    }

    function testCompareRotateBetweenShapes(shape1, shape2) {
        cy.document().then((doc) => {
            const shape1RotateDeg = decomposeMatrix(doc.getElementById(shape1).getCTM());
            cy.document().then((docNext) => {
                const shape2RotateDeg = (
                    decomposeMatrix(docNext.getElementById(shape2).getCTM())
                );
                expect(shape1RotateDeg).to.deep.eq(shape2RotateDeg);
            });
        });
    }

    before(() => {
        cy.openTask(taskName);
        cy.openJob();
        Cypress.config('scrollBehavior', false);
        cy.createRectangle(createRectangleShape2Points);
        cy.createRectangle(createRectangleTrack2Points);
        cy.goCheckFrameNumber(1);
        cy.createRectangle(createRectangleShape2Points);
        cy.goCheckFrameNumber(0);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Check that bounding boxes can be rotated.', () => {
            cy.shapeRotate('#cvat_canvas_shape_1', '15.7');
            cy.shapeRotate('#cvat_canvas_shape_2', '15.7');
        });

        it('Check interpolation, merging/splitting rotated shapes.', () => {
            // Check track roration on all frames
            cy.document().then((doc) => {
                const shapeTranformMatrix = decomposeMatrix(doc.getElementById('cvat_canvas_shape_2').getCTM());
                for (let frame = 1; frame < 10; frame++) {
                    cy.goToNextFrame(frame);
                    cy.document().then((docNext) => {
                        const nextShapeTranformMatrix = (
                            decomposeMatrix(docNext.getElementById('cvat_canvas_shape_2').getCTM())
                        );
                        expect(nextShapeTranformMatrix).to.deep.eq(shapeTranformMatrix);
                    });
                }
            });

            cy.shapeRotate('#cvat_canvas_shape_2', '29.8');

            // Comparison of the values of the shape attribute of the current frame with the previous frame
            testCompareRotate('cvat_canvas_shape_2', 0);

            // Merge shapes
            cy.goCheckFrameNumber(0);
            cy.get('.cvat-merge-control').click();
            cy.get('#cvat_canvas_shape_1').click();
            cy.goCheckFrameNumber(1);
            cy.get('#cvat_canvas_shape_3').click();
            cy.get('body').type('m');
            cy.goCheckFrameNumber(2);
            cy.get('#cvat_canvas_shape_4').should('be.hidden');
            cy.get('#cvat-objects-sidebar-state-item-4')
                .should('contain', '4')
                .and('contain', 'RECTANGLE TRACK')
                .within(() => {
                    cy.get('.cvat-object-item-button-keyframe').click();
                    cy.get('.cvat-object-item-button-keyframe-enabled').should('not.exist');
                    cy.get('.cvat-object-item-button-keyframe').trigger('mouseout');
                });
            cy.get('#cvat_canvas_shape_4').should('be.visible');
            cy.goCheckFrameNumber(9);

            cy.shapeRotate('#cvat_canvas_shape_4', '15.7');

            // Comparison of the values of the shape attribute of the current frame with the previous frame
            testCompareRotate('cvat_canvas_shape_4', 2);

            cy.goCheckFrameNumber(3);
            // Split tracks
            cy.pressSplitControl();
            // A single click does not reproduce the split a track scenario in cypress test.
            cy.get('#cvat_canvas_shape_2').click();
            cy.get('#cvat_canvas_shape_2').click();

            // Disabling outside for checking deg rotate correctly
            cy.get('#cvat-objects-sidebar-state-item-5').within(() => {
                cy.get('.cvat-object-item-button-outside').click();
                cy.get('.cvat-object-item-button-outside').trigger('mouseout');
            });

            testCompareRotateBetweenShapes('cvat_canvas_shape_5', 'cvat_canvas_shape_6');
        });

        it('Check rotation with hold Shift button.', () => {
            cy.goCheckFrameNumber(0);
            cy.shapeRotate('#cvat_canvas_shape_4', '30.0', true).then(() => {
                cy.shapeRotate('#cvat_canvas_shape_4', '45.0', true);
            });
        });

        it('Copy/paste a rotated shape.', () => {
            cy.get('.cvat-canvas-container').click(500, 385);
            cy.get('#cvat_canvas_shape_5').trigger('mousemove');
            cy.get('#cvat_canvas_shape_5').should('have.class', 'cvat_canvas_shape_activated');
            cy.get('body').type('{ctrl}c');
            cy.get('.cvat-canvas-container').trigger('mousemove', 500, 385);
            cy.get('body').type('{ctrl}v');
            cy.get('.cvat-canvas-container').click(500, 385);
            cy.get('#cvat_canvas_shape_7').should('be.visible');

            testCompareRotateBetweenShapes('cvat_canvas_shape_5', 'cvat_canvas_shape_7');
        });
    });
});

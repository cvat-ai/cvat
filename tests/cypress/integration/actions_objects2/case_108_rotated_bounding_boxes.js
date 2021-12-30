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

    function deltaTransformPoint(matrix, point) {
        const dx = point.x * matrix.a + point.y * matrix.c;
        const dy = point.x * matrix.b + point.y * matrix.d;
        return { x: dx, y: dy };
    }

    function decomposeMatrix(matrix) {
        const px = deltaTransformPoint(matrix, { x: 0, y: 1 });
        const skewX = ((180 / Math.PI) * Math.atan2(px.y, px.x) - 90).toFixed(1);
        return skewX;
    }

    function testShapeRotate(shape, x, y, expectedRotateDeg, pressShift) {
        cy.get(shape)
            .trigger('mousemove')
            .trigger('mouseover')
            .should('have.class', 'cvat_canvas_shape_activated');
        cy.get('.cvat-canvas-container')
            .trigger('mousemove', x, y)
            .trigger('mouseenter', x, y);
        cy.get('.svg_select_points_rot').should('have.class', 'cvat_canvas_selected_point');
        cy.get('.cvat-canvas-container').trigger('mousedown', x, y, { button: 0 });
        if (pressShift) {
            cy.get('body').type('{shift}', { release: false });
        }
        cy.get('.cvat-canvas-container').trigger('mousemove', x + 20, y);
        cy.get(shape).should('have.attr', 'transform');
        cy.document().then((doc) => {
            const modShapeIDString = shape.substring(1); // Remove "#" from the shape id string
            const shapeTranformMatrix = decomposeMatrix(doc.getElementById(modShapeIDString).getCTM());
            cy.get('#cvat_canvas_text_content').should('contain.text', `${shapeTranformMatrix}°`);
            expect(`${expectedRotateDeg}°`).to.be.equal(`${shapeTranformMatrix}°`);
        });
        cy.get('.cvat-canvas-container').trigger('mouseup');
    }

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
            testShapeRotate(
                '#cvat_canvas_shape_1',
                (createRectangleShape2Points.firstX + createRectangleShape2Points.secondX) / 2,
                createRectangleShape2Points.firstY + 20,
                '33.7',
            );
            testShapeRotate(
                '#cvat_canvas_shape_2',
                (createRectangleTrack2Points.firstX + createRectangleTrack2Points.secondX) / 2,
                createRectangleTrack2Points.firstY + 20,
                '33.7',
            );
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

            testShapeRotate('#cvat_canvas_shape_2', 320, 225, '53.0');

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

            testShapeRotate(
                '#cvat_canvas_shape_4',
                (createRectangleShape2Points.firstX + createRectangleShape2Points.secondX) / 2,
                createRectangleShape2Points.firstY + 20,
                '33.7',
            );

            // Comparison of the values of the shape attribute of the current frame with the previous frame
            testCompareRotate('cvat_canvas_shape_4', 2);

            cy.goCheckFrameNumber(3);
            // Split tracks
            cy.get('.cvat-split-track-control').click();
            // A single click does not reproduce the split a track scenario in cypress test.
            cy.get('#cvat_canvas_shape_2').click().click();

            // Disabling outside for checking deg rotate correctly
            cy.get('#cvat-objects-sidebar-state-item-5').within(() => {
                cy.get('.cvat-object-item-button-outside').click();
                cy.get('.cvat-object-item-button-outside').trigger('mouseout');
            });

            testCompareRotateBetweenShapes('cvat_canvas_shape_5', 'cvat_canvas_shape_6');
        });

        it('Check rotation with hold Shift button.', () => {
            cy.goCheckFrameNumber(0);
            testShapeRotate('#cvat_canvas_shape_4', 320, 375, '60.0', true);
            testShapeRotate('#cvat_canvas_shape_4', 325, 385, '75.0', true);
        });

        it('Copy/paste a rotated shape.', () => {
            cy.get('.cvat-canvas-container').click(500, 385);
            cy.get('#cvat_canvas_shape_5')
                .trigger('mousemove')
                .should('have.class', 'cvat_canvas_shape_activated');
            cy.get('body').type('{ctrl}c');
            cy.get('.cvat-canvas-container').trigger('mousemove', 500, 385);
            cy.get('body').type('{ctrl}v');
            cy.get('.cvat-canvas-container').click(500, 385);
            cy.get('#cvat_canvas_shape_7').should('be.visible');

            testCompareRotateBetweenShapes('cvat_canvas_shape_5', 'cvat_canvas_shape_7');
        });
    });
});

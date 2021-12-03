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

    function testShapeRotate(shape, x, y, expectedRotate, pressShift) {
        cy.get(shape)
            .trigger('mousemove')
            .trigger('mouseover')
            .should('have.class', 'cvat_canvas_shape_activated');
        cy.get('.svg_select_points_rot')
            .should('be.visible')
            .and('have.length', 1)
            .trigger('mousemove')
            .trigger('mouseover');
        if (pressShift) {
            cy.get('body').type('{shift}', { release: false });
        }
        cy.get('.svg_select_points_rot').trigger('mousedown', { button: 0 });
        cy.get('.cvat-canvas-container').trigger('mousemove', x, y);
        cy.get('#cvat_canvas_text_content').should('contain.text', expectedRotate);
        cy.get('.cvat-canvas-container').trigger('mouseup');
        cy.get(shape).should('have.attr', 'transform');
    }

    function testCompareRotate(shape, toFrame) {
        for (let frame = 8; frame >= toFrame; frame--) {
            cy.document().then((doc) => {
                const shapeTranformMatrix = doc.getElementById(shape).getCTM();
                cy.goToPreviousFrame(frame);
                cy.document().then((doc2) => {
                    const shapeTranformMatrix2 = doc2.getElementById(shape).getCTM();
                    expect(shapeTranformMatrix).not.deep.eq(shapeTranformMatrix2);
                });
            });
        }
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
            testShapeRotate('#cvat_canvas_shape_1', 350, 150, '11.4°');
            testShapeRotate('#cvat_canvas_shape_2', 350, 150, '26.6°');
        });

        it('Check interpolation, merging/splitting rotated shapes.', () => {
            // Check track roration on all frames
            cy.document().then((doc) => {
                const shapeTranformMatrix = doc.getElementById('cvat_canvas_shape_2').getCTM();
                for (let frame = 1; frame < 10; frame++) {
                    cy.goToNextFrame(frame);
                    cy.document().then((docNext) => {
                        const nextShapeTranformMatrix = docNext.getElementById('cvat_canvas_shape_2').getCTM();
                        expect(nextShapeTranformMatrix).to.deep.eq(shapeTranformMatrix);
                    });
                }
            });

            testShapeRotate('#cvat_canvas_shape_2', 350, 250, '91.9°');

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
                });
            cy.get('#cvat_canvas_shape_4').should('be.visible');
            cy.goCheckFrameNumber(9);
            testShapeRotate('#cvat_canvas_shape_4', 350, 250, '18.5°');

            // Comparison of the values of the shape attribute of the current frame with the previous frame
            testCompareRotate('cvat_canvas_shape_4', 2);

            cy.goCheckFrameNumber(3);
            // Split tracks
            cy.get('.cvat-split-track-control').click();
            // A single click does not reproduce the split a track scenario in cypress test.
            cy.get('#cvat_canvas_shape_2').click().click();
            cy.get('#cvat_canvas_shape_5').should('have.attr', 'transform').then((shapeTransform) => {
                cy.get('#cvat_canvas_shape_6').should('have.attr', 'transform', shapeTransform);
            });
        });

        it('Check rotation with hold Shift button.', () => {
            cy.goCheckFrameNumber(0);
            testShapeRotate('#cvat_canvas_shape_4', 350, 150, '15.0°', true);
            testShapeRotate('#cvat_canvas_shape_4', 400, 150, '30.0°', true);
        });
    });
});

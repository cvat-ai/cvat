// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { labelName, taskName } from '../../support/const';

context('Cropping polygon in some corner cases.', () => {
    const caseId = '77';
    const createPolygonShapeRightSide = {
        reDraw: false,
        type: 'Shape',
        labelName,
        pointsMap: [
            { x: 500, y: 120 },
            { x: 900, y: 10 },
            { x: 850, y: 800 },
            { x: 500, y: 750 },
        ],
        complete: true,
        numberOfPoints: null,
    };

    const createPolygonShapeLeftSide = {
        reDraw: false,
        type: 'Shape',
        labelName,
        pointsMap: [
            { x: 500, y: 120 },
            { x: 30, y: 10 },
            { x: 50, y: 800 },
            { x: 500, y: 750 },
        ],
        complete: true,
        numberOfPoints: null,
    };

    before(() => {
        cy.openTask(taskName);
        cy.openJob();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Checking the right side of the canvas.', () => {
            cy.get('.cvat-canvas-container').trigger('wheel', { deltaY: 5 });
            cy.get('.cvat-canvas-container').trigger('wheel', { deltaY: 5 });
            cy.createPolygon(createPolygonShapeRightSide);
            cy.get('.cvat-canvas-container').trigger('mousemove', 650, 250); // Hover over a point that was free of the shape before the fix
            cy.get('#cvat_canvas_shape_1').should('have.class', 'cvat_canvas_shape_activated');
        });

        it('Checking the lift side of the canvas.', () => {
            cy.removeAnnotations();
            cy.createPolygon(createPolygonShapeLeftSide);
            cy.get('.cvat-canvas-container').trigger('mousemove', 300, 250); // Hover over a point that was free of the shape before the fix
            cy.get('#cvat_canvas_shape_1').should('have.class', 'cvat_canvas_shape_activated');
        });
    });
});

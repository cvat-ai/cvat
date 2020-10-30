/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Appearance features', () => {
    const caseId = '14';
    let ariaValuenow = 0;
    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        switchLabel: false,
        firstX: 100,
        firstY: 350,
        secondX: 200,
        secondY: 450,
    };
    const createPolygonShape = {
        reDraw: false,
        type: 'Shape',
        switchLabel: false,
        pointsMap: [
            { x: 250, y: 350 },
            { x: 300, y: 300 },
            { x: 300, y: 450 },
        ],
        complete: true,
        numberOfPoints: null,
    };
    const createPolylinesShape = {
        type: 'Shape',
        switchLabel: false,
        pointsMap: [
            { x: 350, y: 350 },
            { x: 400, y: 300 },
            { x: 400, y: 450 },
            { x: 350, y: 350 },
        ],
        complete: true,
        numberOfPoints: null,
    };
    const createCuboidShape2Points = {
        points: 'From rectangle',
        type: 'Shape',
        switchLabel: false,
        firstX: 450,
        firstY: 350,
        secondX: 550,
        secondY: 450,
    };
    const createPointsShape = {
        type: 'Shape',
        switchLabel: false,
        pointsMap: [{ x: 650, y: 350 }],
        complete: true,
        numberOfPoints: null,
    };

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Create a rectangle, a polygon, a polyline, a cuboid and points.', () => {
            cy.createRectangle(createRectangleShape2Points);
            cy.createPolygon(createPolygonShape);
            cy.createPolyline(createPolylinesShape);
            cy.createCuboid(createCuboidShape2Points);
            cy.createPoint(createPointsShape);
            // Just in case, deactivate all objects
            cy.get('.cvat-canvas-container').click('bottom');
        });
        it('Set opacity level for shapes to 100. All shapes are filled.', () => {
            cy.get('.cvat-objects-appearance-content').within(() => {
                cy.contains('Opacity').next().within(() => {
                    cy.get('.ant-slider-step').click('right');
                    cy.get('[role="slider"]').should('have.attr', 'aria-valuemax').then(($ariaValuemax) => {
                        ariaValuenow = $ariaValuemax;
                        cy.get('[role="slider"]').should('have.attr', 'aria-valuenow', ariaValuenow);
                    });
                });
            });
            cy.get('.cvat_canvas_shape').each(object => {
                cy.get(object).should('have.attr', 'fill-opacity', ariaValuenow / 100);
            });
        });
    });
});

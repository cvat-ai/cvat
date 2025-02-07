// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Repeat draw feature.', () => {
    const caseId = '55';
    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName,
        firstX: 150,
        firstY: 350,
        secondX: 250,
        secondY: 450,
    };
    const createCuboidShape2Points = {
        points: 'From rectangle',
        type: 'Shape',
        labelName,
        firstX: 300,
        firstY: 350,
        secondX: 400,
        secondY: 450,
    };
    const createPolygonShape = {
        redraw: false,
        type: 'Shape',
        labelName,
        pointsMap: [
            { x: 450, y: 350 },
            { x: 550, y: 350 },
            { x: 550, y: 450 },
        ],
        complete: true,
        numberOfPoints: null,
    };
    const createPolylinesShape = {
        type: 'Shape',
        labelName,
        pointsMap: [
            { x: 600, y: 350 },
            { x: 700, y: 350 },
            { x: 700, y: 450 },
        ],
        complete: true,
        numberOfPoints: null,
    };
    const createPointsShape = {
        type: 'Shape',
        labelName,
        pointsMap: [{ x: 750, y: 400 }],
        complete: true,
        numberOfPoints: null,
    };
    const keyCodeN = 78;

    function checkCountShapes(expectedCount) {
        cy.get('.cvat-objects-sidebar-state-item').then(($sidebarItem) => {
            expect($sidebarItem.length).to.be.equal(expectedCount);
        });
    }

    function checkShapeType(id, expectedType) {
        cy.get(id).find('.cvat-objects-sidebar-state-item-object-type-text').should('have.text', expectedType);
    }

    function repeatDrawningStart() {
        cy.get('body').trigger('keydown', { keyCode: keyCodeN, code: 'KeyN' });
    }

    function repeatDrawningFinish() {
        cy.get('.cvat-canvas-container').trigger('keydown', { keyCode: keyCodeN, code: 'KeyN' });
        cy.get('.cvat-canvas-container').trigger('keyup', { keyCode: keyCodeN, code: 'KeyN' });
    }

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Draw and repeat the drawing of the rectangle.', () => {
            cy.createRectangle(createRectangleShape2Points);
            repeatDrawningStart(); // Repeat the drawing the rectangle
            cy.get('.cvat-canvas-container').click(createRectangleShape2Points.firstX, createRectangleShape2Points.firstY - 200);
            cy.get('.cvat-canvas-container').click(createRectangleShape2Points.secondX, createRectangleShape2Points.secondY - 200);
            cy.get('#cvat_canvas_shape_2').should('exist');
            checkCountShapes(2);
            checkShapeType('#cvat-objects-sidebar-state-item-2', 'RECTANGLE SHAPE');
        });

        it('Draw and repeat the drawing of the polygon.', () => {
            cy.createPolygon(createPolygonShape);
            repeatDrawningStart(); // Repeat the drawing the polygon
            createPolygonShape.pointsMap.forEach((element) => {
                cy.get('.cvat-canvas-container').click(element.x, element.y - 200);
            });
            repeatDrawningFinish();
            cy.get('#cvat_canvas_shape_4').should('exist');
            checkCountShapes(4);
            checkShapeType('#cvat-objects-sidebar-state-item-4', 'POLYGON SHAPE');
        });

        it('Draw and repeat the drawing of the polyline.', () => {
            cy.createPolyline(createPolylinesShape);
            repeatDrawningStart(); // Repeat the drawing the polyline
            createPolylinesShape.pointsMap.forEach((element) => {
                cy.get('.cvat-canvas-container').click(element.x, element.y - 200);
            });
            repeatDrawningFinish();
            cy.get('#cvat_canvas_shape_6').should('exist');
            checkCountShapes(6);
            checkShapeType('#cvat-objects-sidebar-state-item-6', 'POLYLINE SHAPE');
        });

        it('Draw and repeat the drawing of the point.', () => {
            cy.createPoint(createPointsShape);
            repeatDrawningStart(); // Repeat the drawing the point
            createPointsShape.pointsMap.forEach((element) => {
                cy.get('.cvat-canvas-container').click(element.x, element.y - 200);
            });
            repeatDrawningFinish();
            cy.get('#cvat_canvas_shape_8').should('exist');
            checkCountShapes(8);
            checkShapeType('#cvat-objects-sidebar-state-item-8', 'POINTS SHAPE');
        });

        it('Draw and repeat the drawing of the cuboid.', () => {
            cy.createCuboid(createCuboidShape2Points);
            repeatDrawningStart(); // Repeat the drawing the cuboid
            cy.get('.cvat-canvas-container').click(createCuboidShape2Points.firstX, createCuboidShape2Points.firstY - 200);
            cy.get('.cvat-canvas-container').click(createCuboidShape2Points.secondX, createCuboidShape2Points.secondY - 200);
            cy.get('#cvat_canvas_shape_10').should('exist');
            checkCountShapes(10);
            checkShapeType('#cvat-objects-sidebar-state-item-10', 'CUBOID SHAPE');
        });
    });
});

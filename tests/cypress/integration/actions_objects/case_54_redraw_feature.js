// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Redraw feature.', () => {
    const caseId = '54';
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
        reDraw: false,
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

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Draw and redraw a rectangle.', () => {
            cy.createRectangle(createRectangleShape2Points);
            cy.get('.cvat-canvas-container').trigger('mousemove', 200, 400);
            cy.get('#cvat_canvas_shape_1').should('have.class', 'cvat_canvas_shape_activated');
            cy.get('body').trigger('keydown', { keyCode: keyCodeN, code: 'KeyN', shiftKey: true }); // Start redraw the rectangle
            cy.get('.cvat-canvas-container')
                .click(createRectangleShape2Points.firstX, createRectangleShape2Points.firstY - 50)
                .click(createRectangleShape2Points.secondX, createRectangleShape2Points.secondY - 50);
            cy.get('.cvat_canvas_shape').then(($shape) => {
                expect($shape.length).to.be.equal(1);
            });
            cy.get('.cvat-objects-sidebar-state-item').then(($sidebarItem) => {
                expect($sidebarItem.length).to.be.equal(1);
            });
        });

        it('Draw and redraw a polygon.', () => {
            cy.createPolygon(createPolygonShape);
            cy.get('.cvat-canvas-container').trigger('mousemove', 520, 400);
            cy.get('#cvat_canvas_shape_2').should('have.class', 'cvat_canvas_shape_activated');
            cy.get('body').trigger('keydown', { keyCode: keyCodeN, code: 'KeyN', shiftKey: true }); // Start redraw the polygon
            createPolygonShape.pointsMap.forEach((element) => {
                cy.get('.cvat-canvas-container').click(element.x, element.y - 50);
            });
            cy.get('.cvat-canvas-container').trigger('keydown', { keyCode: keyCodeN, code: 'KeyN' })
                .trigger('keyup', { keyCode: keyCodeN, code: 'KeyN' });
            cy.get('.cvat_canvas_shape').then(($shape) => {
                expect($shape.length).to.be.equal(2);
            });
            cy.get('.cvat-objects-sidebar-state-item').then(($sidebarItem) => {
                expect($sidebarItem.length).to.be.equal(2);
            });
        });

        it('Draw and redraw a polyline.', () => {
            cy.createPolyline(createPolylinesShape);
            cy.get('.cvat-canvas-container').trigger('mousemove', 700, 400);
            cy.get('#cvat_canvas_shape_3').should('have.class', 'cvat_canvas_shape_activated');
            cy.get('body').trigger('keydown', { keyCode: keyCodeN, code: 'KeyN', shiftKey: true }); // Start redraw the polyline
            createPolylinesShape.pointsMap.forEach((element) => {
                cy.get('.cvat-canvas-container').click(element.x, element.y - 50);
            });
            cy.get('.cvat-canvas-container').trigger('keydown', { keyCode: keyCodeN, code: 'KeyN' })
                .trigger('keyup', { keyCode: keyCodeN, code: 'KeyN' });
            cy.get('.cvat_canvas_shape').then(($shape) => {
                expect($shape.length).to.be.equal(3);
            });
            cy.get('.cvat-objects-sidebar-state-item').then(($sidebarItem) => {
                expect($sidebarItem.length).to.be.equal(3);
            });
        });

        it('Draw and redraw a point.', () => {
            cy.createPoint(createPointsShape);
            cy.get('.cvat-canvas-container').trigger('mousemove', 750, 400);
            cy.get('body').trigger('keydown', { keyCode: keyCodeN, code: 'KeyN', shiftKey: true }); // Start redraw the point
            createPointsShape.pointsMap.forEach((element) => {
                cy.get('.cvat-canvas-container').click(element.x, element.y - 50);
            });
            cy.get('.cvat-canvas-container').trigger('keydown', { keyCode: keyCodeN, code: 'KeyN' })
                .trigger('keyup', { keyCode: keyCodeN, code: 'KeyN' });
            cy.get('.cvat_canvas_shape').then(($shape) => {
                expect($shape.length).to.be.equal(4);
            });
            cy.get('.cvat-objects-sidebar-state-item').then(($sidebarItem) => {
                expect($sidebarItem.length).to.be.equal(4);
            });
        });

        it('Draw and redraw a cuboid.', () => {
            cy.createCuboid(createCuboidShape2Points);
            cy.get('.cvat-canvas-container').trigger('mousemove', 350, 400);
            cy.get('#cvat_canvas_shape_5').should('have.class', 'cvat_canvas_shape_activated');
            cy.get('body').trigger('keydown', { keyCode: keyCodeN, code: 'KeyN', shiftKey: true }); // Start redraw the cuboid
            cy.get('.cvat-canvas-container')
                .click(createCuboidShape2Points.firstX, createCuboidShape2Points.firstY - 50)
                .click(createCuboidShape2Points.secondX, createCuboidShape2Points.secondY - 50);
            // Check issue 3219. Press "N" during the redrawing of the cuboid
            cy.get('.cvat-canvas-container').trigger('mousemove', 350, 300);
            cy.get('#cvat_canvas_shape_5').should('have.class', 'cvat_canvas_shape_activated');
            cy.get('body').trigger('keydown', { keyCode: keyCodeN, code: 'KeyN', shiftKey: true }); // Start redraw the cuboid
            cy.get('.cvat-canvas-container')
                .click(createCuboidShape2Points.firstX, createCuboidShape2Points.firstY - 100)
                .trigger('mousemove', createCuboidShape2Points.secondX, createCuboidShape2Points.secondY - 100);
            cy.get('body').trigger('keydown', { keyCode: keyCodeN, code: 'KeyN' });
            cy.get('.cvat_canvas_shape_drawing').should('not.exist');
            cy.get('.cvat_canvas_shape').then(($shape) => {
                expect($shape.length).to.be.equal(5);
            });
            cy.get('.cvat-objects-sidebar-state-item').then(($sidebarItem) => {
                expect($sidebarItem.length).to.be.equal(5);
            });
        });
    });
});

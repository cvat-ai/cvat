// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';
import { getShapeCoord } from '../../support/utils.cy';

context('Join polygons feature', { scrollBehavior: false }, () => {
    function translatePoint(vector, point) {
        const dx = point.x + vector.a;
        const dy = point.y + vector.b;
        return { x: dx, y: dy };
    }

    const firstPolygonPoints = {
        type: 'Shape',
        labelName,
        pointsMap: [
            { x: 400, y: 200 },
            { x: 600, y: 200 },
            { x: 600, y: 400 },
            { x: 400, y: 400 },
        ],
    };

    const overlapPolygonPoints = {
        ...firstPolygonPoints,
        pointsMap: firstPolygonPoints.pointsMap.map(
            (p) => translatePoint({ a: 0, b: 100 }, p)),
    };

    const includedPolygonPoints = {
        ...firstPolygonPoints,
        pointsMap: [
            // smaller square inside
            { x: 450, y: 250 },
            { x: 550, y: 250 },
            { x: 550, y: 350 },
            { x: 450, y: 350 },
        ],
    };
    const disjointedPolygonPoints = {
        ...firstPolygonPoints,
        pointsMap: firstPolygonPoints.pointsMap.map((p) => translatePoint({ a: 200, b: 200 }, p)),
    };
    const selfIntersectingPolygonPoints = {
        ...overlapPolygonPoints,
        pointsMap: [
            overlapPolygonPoints.pointsMap[0],
            overlapPolygonPoints.pointsMap[3],
            overlapPolygonPoints.pointsMap[1],
            overlapPolygonPoints.pointsMap[2],
        ],
    };

    beforeEach(() => {
        cy.prepareUserSession();
        cy.openTaskJob(taskName);
        cy.createPolygon(firstPolygonPoints);
    });
    afterEach(() => {
        cy.removeAnnotations();
    });
    it('Join overlapping polygons', () => {
        cy.createPolygon(overlapPolygonPoints);
        cy.get('.cvat-join-control').should('exist').and('be.visible').click();
        cy.get('.cvat-join-control').should('have.class', 'cvat-active-canvas-control');
        cy.get('#cvat_canvas_shape_1').click('top'); // non-overlapping shape parts
        cy.get('#cvat_canvas_shape_2').click('bottom');
        cy.get('.cvat-join-control').should('exist').and('be.visible').click();
        cy.get('#cvat_canvas_shape_3').should('exist').and('be.visible');
        cy.get('#cvat_canvas_shape_1').should('not.exist');
        cy.get('#cvat_canvas_shape_2').should('not.exist');
    });

    it('Join nested polygons', () => {
        cy.createPolygon(includedPolygonPoints);
        getShapeCoord('polygon', '#cvat_canvas_shape_1').invoke('toSorted').then((coords1) => {
            cy.get('.cvat-join-control').should('exist').and('be.visible').click();
            cy.get('#cvat_canvas_shape_2').click('center');
            cy.get('#cvat_canvas_shape_1').click('bottom');
            cy.get('.cvat-join-control').should('exist').and('be.visible').click();
            cy.get('#cvat_canvas_shape_3').should('exist').and('be.visible');
            cy.get('#cvat_canvas_shape_1').should('not.exist');
            cy.get('#cvat_canvas_shape_2').should('not.exist');
            getShapeCoord('polygon', '#cvat_canvas_shape_3').invoke('toSorted')
                .should('deep.equal', coords1);
        });
    });

    it('Joining disjointed polygons results in same polygons. Notification appears', () => {
        cy.createPolygon(disjointedPolygonPoints);
        getShapeCoord('polygon', '#cvat_canvas_shape_1').invoke('toSorted').then((coords1) => {
            getShapeCoord('polygon', '#cvat_canvas_shape_2').invoke('toSorted').then((coords2) => {
                cy.get('.cvat-join-control').click();
                cy.get('#cvat_canvas_shape_2').click();
                cy.get('#cvat_canvas_shape_1').click();
                cy.get('.cvat-join-control').click();
                cy.get('.cvat-notification-warning-canvas')
                    .should('exist').and('be.visible')
                    .and('contain', 'Merge resulted in 2 separate polygons.');
                cy.closeNotification('.cvat-notification-warning-canvas');
                cy.get('#cvat_canvas_shape_1').should('not.exist');
                cy.get('#cvat_canvas_shape_2').should('not.exist');
                getShapeCoord('polygon', '#cvat_canvas_shape_3').invoke('toSorted')
                    .should('deep.equal', coords1);
                getShapeCoord('polygon', '#cvat_canvas_shape_4').invoke('toSorted')
                    .should('deep.equal', coords2);
            });
        });
    });

    it('Joining a self-intersected polygon throws an exception', () => {
        cy.once('uncaught:exception', (err) => {
            expect(err.message).to.contain(
                'Cannot join: not enough valid polygons (need at least 2 non-self-intersecting polygons)',
            );
            return false;
        });
        cy.createPolygon(selfIntersectingPolygonPoints);
        cy.get('.cvat-join-control').click();
        cy.get('#cvat_canvas_shape_1').click('top');
        cy.get('#cvat_canvas_shape_2').click('right');
        cy.get('.cvat-join-control').click();
        cy.get('.cvat-notification-notice-canvas-error-occurred')
            .should('exist').and('be.visible');
        cy.closeNotification('.cvat-notification-notice-canvas-error-occurred');
        cy.get('.cvat-notification-warning-canvas')
            .should('exist').and('be.visible')
            .and('contain', '1 self-intersecting polygon excluded from merge');
        cy.closeNotification('.cvat-notification-warning-canvas');
        cy.get('#cvat_canvas_shape_1').should('exist');
        cy.get('#cvat_canvas_shape_2').should('exist');
    });
});

// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Autoborder feature.', () => {
    const caseId = '60';
    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName,
        firstX: 400,
        firstY: 350,
        secondX: 500,
        secondY: 450,
    };

    const createRectangleShape2PointsSec = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName,
        firstX: 600,
        firstY: 350,
        secondX: 700,
        secondY: 450,
    };

    const createRectangleShape2PointsHidden = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName,
        firstX: 200,
        firstY: 350,
        secondX: 300,
        secondY: 450,
    };

    const keyCodeN = 78;
    const rectanglePoints = [];
    const polygonPoints = [];
    const polylinePoints = [];

    function testCollectCoord(type, id, arrToPush) {
        if (type === 'rect') {
            cy.get(id).invoke('attr', 'x').then((x) => arrToPush.push(+x));
            cy.get(id).invoke('attr', 'y').then((y) => arrToPush.push(+y));
            cy.get(id).invoke('attr', 'width').then((width) => arrToPush.push(arrToPush[0] + +width));
            cy.get(id).invoke('attr', 'height').then((height) => arrToPush.push(arrToPush[1] + +height));
        } else {
            cy.get(id).invoke('attr', 'points').then((points) => arrToPush.push(...points.split(/[\s]/)));
        }
    }

    function testAutoborderPointsCount(expextedCount) {
        cy.get('.cvat_canvas_autoborder_point')
            .should('exist')
            .and('be.visible')
            .then(($autoborderPoints) => {
                expect($autoborderPoints.length).to.be.equal(expextedCount);
            });
    }

    before(() => {
        cy.openTaskJob(taskName);
        cy.createRectangle(createRectangleShape2Points);
        cy.createRectangle(createRectangleShape2PointsSec);

        // Check PR 3931 "Fixed issue: autoborder points are visible for invisible shapes"
        cy.createRectangle(createRectangleShape2PointsHidden);
        cy.get('#cvat-objects-sidebar-state-item-3').find('[data-icon="eye"]').click();
        cy.get('#cvat_canvas_shape_3').should('be.hidden');
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Drawning a polygon with autoborder.', () => {
            // Collect the rectagle points coordinates
            testCollectCoord('rect', '#cvat_canvas_shape_1', rectanglePoints);

            cy.interactControlButton('draw-polygon');
            cy.get('.cvat-draw-polygon-popover').find('[type="button"]').contains('Shape').click();
            cy.get('body').type('{Ctrl}'); // Autoborder activation
            testAutoborderPointsCount(8); // 8 points at the rectangles
            cy.get('.cvat-canvas-container').click(400, 350);
            cy.get('.cvat-canvas-container').click(450, 250);
            cy.get('.cvat-canvas-container').click(500, 350);
            cy.get('.cvat-canvas-container').click(500, 450);
            cy.get('.cvat-canvas-container').trigger('keydown', { keyCode: keyCodeN, code: 'KeyN' });
            cy.get('.cvat-canvas-container').trigger('keyup', { keyCode: keyCodeN, code: 'KeyN' });
            cy.get('.cvat_canvas_autoborder_point').should('not.exist');

            // Collect the polygon points coordinates
            testCollectCoord('polygon', '#cvat_canvas_shape_4', polygonPoints);
        });

        it('Start drawing a polyline with autobordering between the two shapes.', () => {
            cy.interactControlButton('draw-polyline');
            cy.get('.cvat-draw-polyline-popover').find('[type="button"]').contains('Shape').click();
            testAutoborderPointsCount(12); // 8 points at the rectangles + 4 at the polygon
            cy.get('.cvat-canvas-container').click(600, 350);
            cy.get('.cvat-canvas-container').click(400, 450);
            cy.get('.cvat-canvas-container').click(550, 500);
            cy.get('.cvat-canvas-container').click(600, 450);
            cy.get('.cvat-canvas-container').click(600, 350);
            cy.get('.cvat-canvas-container').trigger('keydown', { keyCode: keyCodeN, code: 'KeyN' });
            cy.get('.cvat-canvas-container').trigger('keyup', { keyCode: keyCodeN, code: 'KeyN' });
            cy.get('.cvat_canvas_autoborder_point').should('not.exist');

            // Collect the polygon points coordinates
            testCollectCoord('polyline', '#cvat_canvas_shape_5', polylinePoints);
        });

        it('Checking whether the coordinates of the contact points of the shapes match.', () => {
            // The 1st point of the rect and the 1st polygon point
            expect(polygonPoints[0]).to.be
                .equal(`${rectanglePoints[0]},${rectanglePoints[1]}`);
            // The 2nd point of the rect and the 3rd polygon point
            expect(polygonPoints[2]).to
                .be.equal(`${rectanglePoints[2]},${rectanglePoints[1]}`);
            // The 2nd point of the polyline and the 4th point rect
            expect(polylinePoints[1]).to
                .be.equal(`${rectanglePoints[0]},${rectanglePoints[3]}`);
        });
    });
});

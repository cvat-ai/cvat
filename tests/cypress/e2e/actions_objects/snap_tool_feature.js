// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import * as allure from 'allure-js-commons';
import { taskName, labelName } from '../../support/const';

context('Snap tool feature.', () => {
    const keyCodeN = 78;
    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName,
        firstX: 400,
        firstY: 350,
        secondX: 500,
        secondY: 450,
    };

    function testCollectCoord(type, id) {
        const arrToPush = [];
        if (type === 'rect') {
            cy.get(id).invoke('attr', 'x').then((x) => arrToPush.push(+x));
            cy.get(id).invoke('attr', 'y').then((y) => arrToPush.push(+y));
            cy.get(id).invoke('attr', 'width').then((width) => arrToPush.push(arrToPush[0] + +width));
            cy.get(id).invoke('attr', 'height').then((height) => arrToPush.push(arrToPush[1] + +height));
        } else {
            cy.get(id).invoke('attr', 'points').then((points) => arrToPush.push(...points.split(/[\s]/)));
        }
        return cy.wrap(arrToPush);
    }

    function testAutoborderPointsCount(expectedCount) {
        cy.get('.cvat_canvas_autoborder_point')
            .should('exist')
            .and('be.visible')
            .then(($autoborderPoints) => {
                expect($autoborderPoints.length).to.be.equal(expectedCount);
            });
    }

    function testCollectShapePointsRadius(id) {
        cy.get('.cvat_canvas_shape').first()
            .should('exist').and('be.visible')
            .trigger('mousemove', 'center', { scrollBehavior: false });
        return cy.get('#cvat_canvas_content circle').first().should('exist').and('be.visible')
            .invoke('attr', 'r').then((radius) => Number.parseFloat(radius));
    }

    /**
     * Toggle one of the snap tools. Check its final state
     * @param {'contour' | 'point'} toolName
     * @param {boolean} expectedIsActive
     */
    function toggleSnapTool(toolName, expectedIsActive) {
        const toolNameLower = toolName.toLowerCase();
        const toolButton = `.cvat-snap-to-${toolNameLower}-button`;

        cy.get('.cvat-snap-tools-control').click();
        cy.get(toolButton).click();
        cy.get(toolButton).should(
            expectedIsActive === true ? 'have.class' : 'not.have.class',
            'cvat-snap-tool-active',
        );
        // Close snap tools, ensure not visible
        cy.get('.cvat-snap-tools-control').should(
            expectedIsActive === true ? 'have.class' : 'not.have.class',
            'cvat-snap-tools-active',
        ).click();
        cy.get('.cvat-snap-tools-control-popover').should('not.be.visible');
    }

    before(() => {
        cy.prepareUserSession();
        cy.openTaskJob(taskName);
    });

    describe('Testing "Snap to Contour"', () => {
        const createRectangleShape2PointsSec = {
            points: 'By 2 Points',
            type: 'Shape',
            labelName,
            firstX: 600,
            firstY: 350,
            secondX: 700,
            secondY: 450,
        };
        let rectanglePoints;

        context('Basic drawing cases', () => {
            beforeEach(() => {
                cy.createRectangle(createRectangleShape2Points);
                cy.createRectangle(createRectangleShape2PointsSec);

                // Collect the rectagle points coordinates
                testCollectCoord('rect', '#cvat_canvas_shape_1').then((points) => {
                    rectanglePoints = points;
                });
                toggleSnapTool('contour', true);
            });

            afterEach(() => {
                cy.removeAnnotations();

                // Deactivate snap to contour.
                toggleSnapTool('contour', false);
            });

            it('Drawing a polygon with autoborder.', () => {
                cy.interactControlButton('draw-polygon');
                cy.get('.cvat-draw-polygon-popover').find('[type="button"]').contains('Shape').click();

                testAutoborderPointsCount(8); // 8 points at the rectangles

                cy.get('.cvat-canvas-container').click(400, 350);
                cy.wait(500);

                // top right
                cy.get('.cvat-canvas-container').trigger('mousemove', 500, 350);
                cy.get('.cvat-canvas-container').trigger('mousedown', 500, 350, { button: 0 });

                // bottom left
                cy.get('.cvat-canvas-container').trigger('mousemove', 400, 450);
                cy.get('.cvat-canvas-container').trigger('mousedown', 400, 450, { button: 0 });

                cy.get('.cvat-canvas-container').trigger('keydown', { keyCode: keyCodeN, code: 'KeyN' });
                cy.get('.cvat-canvas-container').trigger('keyup', { keyCode: keyCodeN, code: 'KeyN' });
                cy.get('.cvat_canvas_autoborder_point').should('not.exist');

                // Collect the polygon points coordinates
                testCollectCoord('polygon', '#cvat_canvas_shape_3').should((polygonPoints) => {
                // The 1st point of the rect and the 1st polygon point
                    expect(polygonPoints[0]).to.be
                        .equal(`${rectanglePoints[0]},${rectanglePoints[1]}`);
                    expect(polygonPoints[1]).to.be
                        .equal(`${rectanglePoints[2]},${rectanglePoints[1]}`);
                    expect(polygonPoints[2]).to.be
                        .equal(`${rectanglePoints[2]},${rectanglePoints[3]}`);
                    expect(polygonPoints[3]).to.be
                        .equal(`${rectanglePoints[0]},${rectanglePoints[3]}`);
                });
            });

            it('Start drawing a polyline with autobordering between the two shapes.', () => {
                cy.interactControlButton('draw-polyline');
                cy.get('.cvat-draw-polyline-popover').find('[type="button"]').contains('Shape').click();
                testAutoborderPointsCount(8); // 8 points at the rectangles

                cy.get('.cvat-canvas-container').click(700, 350);
                cy.wait(500);

                cy.get('.cvat-canvas-container').trigger('mousemove', 700, 450);
                cy.get('.cvat-canvas-container').trigger('mousedown', 700, 450, { button: 0 });

                cy.get('.cvat-canvas-container').trigger('mousemove', 600, 350);
                cy.get('.cvat-canvas-container').trigger('mousedown', 600, 350, { button: 0 });

                cy.get('.cvat-canvas-container').click(500, 350);

                cy.get('.cvat-canvas-container').trigger('mousemove', 500, 450);
                cy.get('.cvat-canvas-container').trigger('mousedown', 500, 450, { button: 0 });

                cy.get('.cvat-canvas-container').trigger('mousemove', 400, 350);
                cy.get('.cvat-canvas-container').trigger('mousedown', 400, 350, { button: 0 });

                cy.get('.cvat-canvas-container').trigger('keydown', { keyCode: keyCodeN, code: 'KeyN' });
                cy.get('.cvat-canvas-container').trigger('keyup', { keyCode: keyCodeN, code: 'KeyN' });
                cy.get('.cvat_canvas_autoborder_point').should('not.exist');

                // Collect the polyline points coordinates
                testCollectCoord('polyline', '#cvat_canvas_shape_3').should((polylinePoints) => {
                // The 2nd point of the polyline and the 4th point rect
                    expect(polylinePoints[4]).to.be
                        .equal(`${rectanglePoints[2]},${rectanglePoints[1]}`);
                    expect(polylinePoints[5]).to.be
                        .equal(`${rectanglePoints[2]},${rectanglePoints[3]}`);
                    expect(polylinePoints[6]).to.be
                        .equal(`${rectanglePoints[0]},${rectanglePoints[3]}`);
                    expect(polylinePoints[7]).to.be
                        .equal(`${rectanglePoints[0]},${rectanglePoints[1]}`);
                });
            });
        });

        context('Path finding algorithm', () => {
            const polygonPoints = [
                { x: 400, y: 300 },
                { x: 450, y: 300 },
                { x: 600, y: 450 },
                { x: 300, y: 450 },
            ];
            const createTrapeziumShape4Points = {
                pointsMap: polygonPoints,
                type: 'Shape',
                labelName,
            };
            let polygonPointsGlobal;

            before(() => {
                cy.createPolygon(createTrapeziumShape4Points);
                testCollectCoord('polygon', '#cvat_canvas_shape_1').then((pointsGlobal) => {
                    polygonPointsGlobal = pointsGlobal;
                });
                toggleSnapTool('contour', true);
            });

            after(() => {
                cy.removeAnnotations();
                // cy.saveJob(); // todo: remove
                toggleSnapTool('contour', false);
            });
        });
    });

    context('Testing "Snap to Point', () => {
        let rectanglePointsGlobal;

        beforeEach(() => {
            cy.createRectangle(createRectangleShape2Points);
            testCollectCoord('rect', '#cvat_canvas_shape_1').then((pointsGlobal) => {
                rectanglePointsGlobal = pointsGlobal;
            });
            toggleSnapTool('point', true);
        });

        afterEach(() => {
            cy.removeAnnotations();
            // cy.saveJob(); // todo: remove
            toggleSnapTool('point', false);
        });

        it('Draw a polyline. Should snap to every rect corner within radius', () => {
            testCollectShapePointsRadius('#cvat_canvas_shape_1').then((radius) => {
                cy.interactControlButton('draw-polyline');
                cy.get('.cvat-draw-polyline-popover').find('[type="button"]').contains('Shape').click();
                const delta = radius * 1.5; // snapping can be clearly seen on video
                const regionOf = (point) => [point.x - delta, point.y - delta];
                const rectToPoints = (rect) => [
                    { x: rect.firstX, y: rect.firstY },
                    { x: rect.secondX, y: rect.secondY },
                ];
                const rectanglePoints = rectToPoints(createRectangleShape2Points);

                // Starting point
                cy.get('.cvat-canvas-container').click(400, 150);
                cy.wait(500);

                // Should snap inside delta region. Mouse events should work in same position
                cy.get('.cvat-canvas-container').trigger('mousemove', ...regionOf(rectanglePoints[0]));
                cy.get('.cvat-canvas-container').trigger('mousedown', ...regionOf(rectanglePoints[0]), { button: 0 });

                cy.get('.cvat-canvas-container').trigger('mousemove', ...regionOf(rectanglePoints[1]));
                cy.get('.cvat-canvas-container').trigger('mousedown', ...regionOf(rectanglePoints[1]), { button: 0 });

                cy.get('.cvat-canvas-container').trigger('keydown', { keyCode: keyCodeN, code: 'KeyN' });
                cy.get('.cvat-canvas-container').trigger('keyup', { keyCode: keyCodeN, code: 'KeyN' });
            });

            cy.get('#cvat_canvas_shape_2').should('exist').and('be.visible');
            testCollectCoord('polyline', '#cvat_canvas_shape_2').should((polylinePoints) => {
                const [, ...commonPoints] = polylinePoints;
                expect(commonPoints[0]).to.be
                    .equal(`${rectanglePointsGlobal[0]},${rectanglePointsGlobal[1]}`);
                expect(commonPoints[1]).to.be
                    .equal(`${rectanglePointsGlobal[2]},${rectanglePointsGlobal[3]}`);
            });
        });
        it('Snapping works when shape is rotated', () => {
            // TODO: pr
        });
    });

    context('Regression tests', () => {
        const createRectangleShape2PointsHidden = {
            points: 'By 2 Points',
            type: 'Shape',
            labelName,
            firstX: 200,
            firstY: 350,
            secondX: 300,
            secondY: 450,
        };
        before(() => {
            cy.createRectangle(createRectangleShape2PointsHidden);
        });
        after(() => {
            cy.removeAnnotations();
        });
        it('Issue 3931: Autoborder points are not visible for invisible shapes', () => {
            allure.issue('https://github.com/cvat-ai/cvat/pull/3931');

            cy.get('.cvat-objects-sidebar-state-item').find('[data-icon="eye"]').click();
            cy.get('.cvat_canvas_shape').should('be.hidden');
        });
    });
});

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
    const defaultStartingPoint = [450, 150];

    function getShapeCoord(type, objectId) {
        const arrToPush = [];
        if (type === 'rect') {
            cy.get(objectId).invoke('attr', 'x').then((x) => arrToPush.push(+x));
            cy.get(objectId).invoke('attr', 'y').then((y) => arrToPush.push(+y));
            cy.get(objectId).invoke('attr', 'width').then((width) => arrToPush.push(arrToPush[0] + +width));
            cy.get(objectId).invoke('attr', 'height').then((height) => arrToPush.push(arrToPush[1] + +height));
        } else {
            cy.get(objectId).invoke('attr', 'points').then((points) => arrToPush.push(...points.split(/[\s]/)));
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

    function testCollectShapePointRadius(id) {
        cy.get(id).should('exist').and('be.visible')
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
                getShapeCoord('rect', '#cvat_canvas_shape_1').then((points) => {
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
                getShapeCoord('polygon', '#cvat_canvas_shape_3').should((polygonPoints) => {
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
                getShapeCoord('polyline', '#cvat_canvas_shape_3').should((polylinePoints) => {
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

        context('Path finding', () => {
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
            const pointToArr = (point) => [point.x, point.y];
            let polygonPointsGlobal;

            before(() => {
                cy.createPolygon(createTrapeziumShape4Points);
                getShapeCoord('polygon', '#cvat_canvas_shape_1').then((pointsGlobal) => {
                    polygonPointsGlobal = pointsGlobal;
                });
                toggleSnapTool('contour', true);
            });

            after(() => {
                cy.removeAnnotations();
                toggleSnapTool('contour', false);
            });
            it('Draw a diagonal in the trapezium. Should pick the shortest path', () => {
                cy.interactControlButton('draw-polyline');
                cy.get('.cvat-draw-polyline-popover').find('[type="button"]').contains('Shape').click();

                testAutoborderPointsCount(4);

                cy.get('.cvat-canvas-container').click(...defaultStartingPoint);
                cy.wait(500);

                // top right
                cy.get('.cvat-canvas-container').trigger('mousemove', ...pointToArr(polygonPoints[1]));
                cy.get('.cvat-canvas-container').trigger('mousedown', ...pointToArr(polygonPoints[1]), { button: 0 });

                // bottom left
                cy.get('.cvat-canvas-container').trigger('mousemove', ...pointToArr(polygonPoints[3]));
                cy.get('.cvat-canvas-container').trigger('mousedown', ...pointToArr(polygonPoints[3]), { button: 0 });

                cy.get('.cvat-canvas-container').trigger('keydown', { keyCode: keyCodeN, code: 'KeyN' });
                cy.get('.cvat-canvas-container').trigger('keyup', { keyCode: keyCodeN, code: 'KeyN' });
                cy.get('.cvat_canvas_autoborder_point').should('not.exist');

                getShapeCoord('polyline', '#cvat_canvas_shape_2').should((polylinePoints) => {
                    // Check that polyline picked the right path
                    expect(polylinePoints[1]).to.be
                        .equal(`${polygonPointsGlobal[1]}`);
                    expect(polylinePoints[2]).to.be
                        .equal(`${polygonPointsGlobal[0]}`);
                    expect(polylinePoints[3]).to.be
                        .equal(`${polygonPointsGlobal[3]}`);

                    // Confirm no polyline points on the other vertex
                    expect(polylinePoints).does.not.include(`${polygonPointsGlobal[2]}`,
                        'Polyline went the wrong way',
                    );
                });
            });
        });
    });

    context('Testing "Snap to Point"', () => {
        const rectToPoints = (rect) => [
            { x: rect.firstX, y: rect.firstY },
            { x: rect.secondX, y: rect.secondY },
        ];
        function rotate(point, rect, angleDegrees) {
            const width = Math.abs(rect.secondX - rect.firstX);
            const height = Math.abs(rect.secondY - rect.firstY);
            const origin = {
                x: rect.firstX + width / 2,
                y: rect.firstY + height / 2,
            };

            // Translate to origin
            const ox = point.x - origin.x;
            const oy = point.y - origin.y;

            const angleRad = angleDegrees * (Math.PI / 180);

            // Rotate
            const rotatedX = ox * Math.cos(angleRad) - oy * Math.sin(angleRad);
            const rotatedY = ox * Math.sin(angleRad) + oy * Math.cos(angleRad);

            // Translate back
            return {
                x: rotatedX + origin.x,
                y: rotatedY + origin.y,
            };
        }
        let rectanglePointsGlobal;
        let regionOf;

        beforeEach(() => {
            cy.createRectangle(createRectangleShape2Points);
            getShapeCoord('rect', '#cvat_canvas_shape_1').then((pointsGlobal) => {
                rectanglePointsGlobal = pointsGlobal;
            });
            testCollectShapePointRadius('#cvat_canvas_shape_1').then((radius) => {
                const delta = Math.floor(radius * 1.3); // snapping is seen better
                regionOf = (point) => [point.x - delta, point.y - delta];
            });
            toggleSnapTool('point', true);
        });

        afterEach(() => {
            cy.removeAnnotations();
            toggleSnapTool('point', false);
            rectanglePointsGlobal = null;
        });

        it('Draw a polyline. Should snap to rect corners within radius', () => {
            cy.interactControlButton('draw-polyline');
            cy.get('.cvat-draw-polyline-popover').find('[type="button"]').contains('Shape').click();
            const rectanglePoints = rectToPoints(createRectangleShape2Points);

            cy.get('.cvat-canvas-container').click(...defaultStartingPoint);
            cy.wait(500);

            // Should snap inside delta region. Mouse events should work in same position
            cy.get('.cvat-canvas-container').trigger('mousemove', ...regionOf(rectanglePoints[0]));
            cy.get('.cvat-canvas-container').trigger('mousedown', ...regionOf(rectanglePoints[0]), { button: 0 });

            cy.get('.cvat-canvas-container').trigger('mousemove', ...regionOf(rectanglePoints[1]));
            cy.get('.cvat-canvas-container').trigger('mousedown', ...regionOf(rectanglePoints[1]), { button: 0 });

            cy.get('.cvat-canvas-container').trigger('keydown', { keyCode: keyCodeN, code: 'KeyN' });
            cy.get('.cvat-canvas-container').trigger('keyup', { keyCode: keyCodeN, code: 'KeyN' });

            cy.get('#cvat_canvas_shape_2').should('exist').and('be.visible');
            getShapeCoord('polyline', '#cvat_canvas_shape_2').should((polylinePoints) => {
                const [, ...commonPoints] = polylinePoints;
                expect(commonPoints[0]).to.be
                    .equal(`${rectanglePointsGlobal[0]},${rectanglePointsGlobal[1]}`);
                expect(commonPoints[1]).to.be
                    .equal(`${rectanglePointsGlobal[2]},${rectanglePointsGlobal[3]}`);
            });
        });
        it('Snapping works when shape is rotated', { scrollBehavior: false }, () => {
            allure.issue('https://github.com/cvat-ai/cvat/pull/10448', 'Snap to rotated boxes');

            const coordsToRect = (coords) => ({
                firstX: coords[0],
                firstY: coords[1],
                secondX: coords[2],
                secondY: coords[3],
            });
            const rectangleGlobal = coordsToRect(rectanglePointsGlobal);

            // Rotate rectangle, calculate expected point position
            const degrees = 15;
            const rotatedPoints = rectToPoints(createRectangleShape2Points)
                .map((p) => rotate(p, createRectangleShape2Points, degrees));
            const rotatedPointsGlobal = rectToPoints(rectangleGlobal)
                .map((p) => rotate(p, rectangleGlobal, degrees));
            cy.shapeRotate('#cvat_canvas_shape_1', degrees.toFixed(1), true);

            // Draw a polygon
            cy.interactControlButton('draw-polygon');
            cy.get('.cvat-draw-polygon-popover').find('[type="button"]').contains('Shape').click();

            cy.get('.cvat-canvas-container').trigger('mousemove', ...defaultStartingPoint);
            cy.get('.cvat-canvas-container').trigger('mousedown', ...defaultStartingPoint, { button: 0 });

            // Should snap inside delta region
            cy.get('.cvat-canvas-container').trigger('mousemove', ...regionOf(rotatedPoints[0]));
            cy.get('.cvat-canvas-container').trigger('mousedown', ...regionOf(rotatedPoints[0]), { button: 0 });

            cy.get('.cvat-canvas-container').trigger('mousemove', ...regionOf(rotatedPoints[1]));
            cy.get('.cvat-canvas-container').trigger('mousedown', ...regionOf(rotatedPoints[1]), { button: 0 });

            cy.get('.cvat-canvas-container').trigger('keydown', { keyCode: keyCodeN, code: 'KeyN' });
            cy.get('.cvat-canvas-container').trigger('keyup', { keyCode: keyCodeN, code: 'KeyN' });

            // Compare polygon's coords with rotated coords, should have 2 common
            getShapeCoord('polygon', '#cvat_canvas_shape_2').then((polygonPoints) => {
                const [, ...commonPoints] = polygonPoints;
                expect(commonPoints[0]).to.be
                    .equal(`${rotatedPointsGlobal[0].x},${rotatedPointsGlobal[0].y}`);
                expect(commonPoints[1]).to.be
                    .equal(`${rotatedPointsGlobal[1].x},${rotatedPointsGlobal[1].y}`);
            });
        });
    });

    context.only('Regression tests', () => {
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
            toggleSnapTool('contour', true);
        });
        after(() => {
            cy.removeAnnotations();
            toggleSnapTool('contour', false);
        });
        it('Issue 3931: Autoborder points are not visible for invisible shapes', () => {
            allure.issue('https://github.com/cvat-ai/cvat/pull/3931');

            cy.get('.cvat-objects-sidebar-state-item').find('[data-icon="eye"]').click();
            cy.get('.cvat_canvas_shape').should('be.hidden');
        });
    });
});

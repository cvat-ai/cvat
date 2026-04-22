// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

/**
 * A point on a two dimensional plane.
 * @typedef {Object} Point
 * @property {number} x - The X Coordinate
 * @property {number} y - The Y Coordinate
 */

import * as allure from 'allure-js-commons';
import { taskName, labelName } from '../../support/const';
import { checkAutoborderPointsCount } from '../../support/utils.cy';

context('Snap tool feature.', () => {
    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName,
        firstX: 400,
        firstY: 350,
        secondX: 500,
        secondY: 450,
    };
    const createPolygonShape = {
        type: 'Shape',
        labelName,
        pointsMap: [
            { x: 400, y: 350 },
            { x: 500, y: 350 },
            { x: 400, y: 450 },
        ],
    };
    const defaultStartingPoint = { x: 450, y: 150 };

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

    function testCollectShapePointRadius(objectId) {
        cy.get(objectId).should('exist').and('be.visible')
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

    const coordsToRect = (coords) => ({
        firstX: coords[0],
        firstY: coords[1],
        secondX: coords[2],
        secondY: coords[3],
    });
    function rawPointToPoint(rawPoint) {
        const xy = rawPoint.split(',').map((Number.parseFloat));
        return {
            x: xy[0],
            y: xy[1],
        };
    }
    const rectToPoints = (rect) => [
        { x: rect.firstX, y: rect.firstY },
        { x: rect.secondX, y: rect.secondY },
    ];
    const getRectCenter = (rect) => ({
        center: {
            x: rect.firstX + (Math.abs(rect.secondX - rect.firstX) / 2),
            y: rect.firstY + (Math.abs(rect.secondY - rect.firstY) / 2),
        },
    });
    function getRectCorners(rect, sort = false) {
        const corners = {
            tl: { x: rect.firstX, y: rect.firstY },
            tr: { x: rect.secondX, y: rect.firstY },
            br: { x: rect.secondX, y: rect.secondY },
            bl: { x: rect.firstX, y: rect.secondY },
        };
        if (sort) return [corners.tl, corners.tr, corners.br, corners.bl];
        return corners;
    }

    /**
     * Rotate a point around the center of a rectangle
     * @param {object} point
     * @param {number} point.x
     * @param {number} point.y
     * @param {object} rect
     * @param {number} angleDegrees
     * @returns {Point}
     */
    function rotate(point, rect, angleDegrees) {
        const { center: origin } = getRectCenter(rect);

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
            const createPolylineShape = {
                type: 'Shape',
                labelName,
                pointsMap: [
                    { x: 700, y: 350 },
                    { x: 700, y: 450 },
                    { x: 600, y: 350 },
                    { x: 500, y: 350 },
                    { x: 500, y: 450 },
                    { x: 400, y: 350 },
                ],
            };
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
                cy.createPolygon(createPolygonShape, { numberOfAutoborderPoints: 8 });
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

            it('Drawing a polygon with autoborder on rotated shapes.', { scrollBehavior: false }, () => {
                // on rotation, scrollBehavior=true obscures points from view
                allure.issue('https://github.com/cvat-ai/cvat/pull/10457', 'Fix snap to contour with rotation');

                const rectangleGlobal = coordsToRect(rectanglePoints);

                // Rotate the first rectangle
                const degrees = 15;
                cy.shapeRotate('#cvat_canvas_shape_1', degrees.toFixed(1), true);

                // Calculate expected rotated corner positions
                const rotatedCornersGlobal = getRectCorners(rectangleGlobal, true)
                    .map((p) => rotate(p, rectangleGlobal, degrees));

                // Create polygon at rotated positions (use first 3 corners)
                const { tl, br } = getRectCorners(createRectangleShape2Points);
                const createAutoborderedPolygonShape = {
                    type: 'Shape',
                    labelName,
                    pointsMap: [tl, br].map((p) => rotate(p, createRectangleShape2Points, degrees)),
                };

                // Draw polygon with autoborder at the rotated corner positions
                cy.createPolygon(createAutoborderedPolygonShape, { numberOfAutoborderPoints: 8 }, 'trigger');
                cy.get('.cvat_canvas_autoborder_point').should('not.exist');

                // Collect the polygon points coordinates and verify they match rotated rectangle corners
                getShapeCoord('polygon', '#cvat_canvas_shape_3').then((polygonCoords) => {
                    expect(polygonCoords).to.have.length(3);
                    polygonCoords.forEach((rawPoint, i) => {
                        const p = rawPointToPoint(rawPoint);
                        expect(p.x).to.be.closeTo(rotatedCornersGlobal[i].x, 1);
                        expect(p.y).to.be.closeTo(rotatedCornersGlobal[i].y, 1);
                    });
                });
            });

            it('Start drawing a polyline with autobordering between the two shapes.', () => {
                cy.createPolyline(createPolylineShape, { numberOfAutoborderPoints: 8 });
                cy.get('.cvat_canvas_autoborder_point').should('not.exist');

                // Collect the polyline points coordinates
                getShapeCoord('polyline', '#cvat_canvas_shape_3').then((polylinePoints) => {
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
            const createTrapeziumShape4Points = {
                pointsMap: [
                    { x: 400, y: 300 },
                    { x: 450, y: 300 },
                    { x: 600, y: 450 },
                    { x: 300, y: 450 },
                ],
                type: 'Shape',
                labelName,
            };
            const createPolylineShape = {
                pointsMap: [
                    defaultStartingPoint,
                    // diagonal
                    createTrapeziumShape4Points.pointsMap[1],
                    createTrapeziumShape4Points.pointsMap[3],
                ],
                type: 'Shape',
                labelName,
            };
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
                cy.createPolyline(createPolylineShape, { numberOfAutoborderPoints: 4 });
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
        let rectanglePointsGlobal;
        let regionOf;

        beforeEach(() => {
            cy.createRectangle(createRectangleShape2Points);
            getShapeCoord('rect', '#cvat_canvas_shape_1').then((pointsGlobal) => {
                rectanglePointsGlobal = pointsGlobal;
            });
            testCollectShapePointRadius('#cvat_canvas_shape_1').then((radius) => {
                const delta = Math.floor(radius * 1.3); // snapping is seen better
                regionOf = (point) => ({ x: point.x - delta, y: point.y - delta });
            });
            toggleSnapTool('point', true);
        });

        afterEach(() => {
            cy.removeAnnotations();
            toggleSnapTool('point', false);
            rectanglePointsGlobal = null;
        });

        it('Draw a polyline. Should snap to rect corners within radius', () => {
            const createRegionOfRectanglePolylineShape = {
                pointsMap: [
                    defaultStartingPoint,
                    // diagonal
                    ...rectToPoints(createRectangleShape2Points).map((regionOf)),
                ],
                type: 'Shape',
                labelName,
            };

            cy.createPolyline(createRegionOfRectanglePolylineShape);

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
            // on rotation, scrollBehavior=true obscures points from view
            allure.issue('https://github.com/cvat-ai/cvat/pull/10448', 'Snap to rotated boxes');

            const rectangleGlobal = coordsToRect(rectanglePointsGlobal);

            // Rotate rectangle, calculate expected point position
            const degrees = 15;
            const rotatedPoints = rectToPoints(createRectangleShape2Points)
                .map((p) => rotate(p, createRectangleShape2Points, degrees));
            const rotatedPointsGlobal = rectToPoints(rectangleGlobal)
                .map((p) => rotate(p, rectangleGlobal, degrees));
            cy.shapeRotate('#cvat_canvas_shape_1', degrees.toFixed(1), true);

            // Draw a polygon
            const createRotatedPolygonShape = {
                type: 'Shape',
                labelName,
                pointsMap: [
                    defaultStartingPoint,
                    regionOf(rotatedPoints[0]),
                    regionOf(rotatedPoints[1]),
                ],
            };
            cy.createPolygon(createRotatedPolygonShape, null, 'trigger');
            // TODO: cy.createPolygon 'click' approach, as used previously, doesn't work here
            // some snapped points are drawn twice and persist after test
            // cy.wait in loop doesn't work
            // not reproducible manually though, so not a user issue

            // Compare polygon's coords with rotated coords, should have 2 common
            getShapeCoord('polygon', '#cvat_canvas_shape_2').then((polygonPoints) => {
                const [, ...commonPoints] = polygonPoints;
                expect(commonPoints[0]).to.be
                    .equal(`${rotatedPointsGlobal[0].x},${rotatedPointsGlobal[0].y}`);
                expect(commonPoints[1]).to.be
                    .equal(`${rotatedPointsGlobal[1].x},${rotatedPointsGlobal[1].y}`);
            });
        });

        it('Snapping works when the first snapped point is on another shape', () => {
            allure.issue('https://github.com/cvat-ai/cvat/pull/10509', 'Snap to initial point');
            const rectCorners = getRectCorners(createRectangleShape2Points);
            const createPolygonShapeSnappedSide = {
                pointsMap: [
                    regionOf(rectCorners.tl),
                    regionOf(rectCorners.tr),
                    { x: rectCorners.tl.x + 50, y: rectCorners.tr.y - 100 },
                ],
                type: 'Shape',
                labelName,
            };
            cy.createPolygon(createPolygonShapeSnappedSide);
            getShapeCoord('polygon', '#cvat_canvas_shape_2').should(([firstPolygonPoint]) => {
                expect(firstPolygonPoint).to.equal(`${rectanglePointsGlobal[0]},${rectanglePointsGlobal[1]}`);
            });
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
            toggleSnapTool('contour', true);
        });
        after(() => {
            cy.realPress('Escape');
            cy.removeAnnotations();
            toggleSnapTool('contour', false);
        });
        it('Autoborder points are not visible for invisible shapes', () => {
            allure.issue('https://github.com/cvat-ai/cvat/pull/3931');

            cy.get('.cvat-objects-sidebar-state-item').find('[data-icon="eye"]').click();
            cy.get('.cvat_canvas_shape').should('be.hidden');

            cy.interactControlButton('draw-polygon');
            cy.get('.cvat-draw-polygon-popover').find('[type="button"]').contains('Shape').click();
            checkAutoborderPointsCount(0);
        });
    });
});

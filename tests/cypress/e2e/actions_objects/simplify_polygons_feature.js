// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import * as allure from 'allure-js-commons';
import { taskName, labelName } from '../../support/const';
import { getShapeCoord, toggleAutoSimplify } from '../../support/utils.cy';
import { translatePoint } from '../../support/utils';

context('Simplify polygons feature', { scrollBehavior: false }, () => {
    const polygonCenter = { x: 510, y: 324 };
    const detailedPolygonPoints = [
        // a jagged shape with redundant points
        { x: 340, y: 185 },
        { x: 360, y: 197.5 },
        { x: 380, y: 210 },
        { x: 400.5, y: 194 },
        { x: 421, y: 178 },
        { x: 438, y: 196 },
        { x: 455, y: 214 },
        { x: 476.5, y: 195 },
        { x: 498, y: 176 },
        { x: 518, y: 195.5 },
        { x: 538, y: 215 },
        { x: 558, y: 198.5 },
        { x: 578, y: 182 },
        { x: 595.5, y: 201 },
        { x: 613, y: 220 },
        { x: 634, y: 207.5 },
        { x: 655, y: 195 },
        { x: 645.5, y: 220 },
        { x: 636, y: 245 },
        { x: 668, y: 257.5 },
        { x: 700, y: 270 },
        { x: 667.5, y: 281 },
        { x: 635, y: 292 },
        { x: 665, y: 312 },
        { x: 695, y: 332 },
        { x: 663, y: 340 },
        { x: 631, y: 348 },
        { x: 652, y: 375 },
        { x: 673, y: 402 },
        { x: 642.5, y: 394 },
        { x: 612, y: 386 },
        { x: 599, y: 423 },
        { x: 586, y: 460 },
        { x: 567, y: 431 },
        { x: 548, y: 402 },
        { x: 526.5, y: 437 },
        { x: 505, y: 472 },
        { x: 487.5, y: 437 },
        { x: 470, y: 402 },
        { x: 447, y: 429 },
        { x: 424, y: 456 },
        { x: 413, y: 419 },
        { x: 402, y: 382 },
        { x: 372, y: 396 },
        { x: 342, y: 410 },
        { x: 362, y: 379 },
        { x: 382, y: 348 },
        { x: 351, y: 337 },
        { x: 320, y: 326 },
        { x: 352, y: 309 },
        { x: 384, y: 292 },
        { x: 353.5, y: 276 },
        { x: 323, y: 260 },
        { x: 356.5, y: 253 },
        { x: 390, y: 246 },
        { x: 375, y: 225.5 },
        { x: 360, y: 205 },
        { x: 343, y: 215 },
        { x: 326, y: 225 },
    ];
    const polygonPointsCount = detailedPolygonPoints.length;
    const createDetailedPolygon = {
        type: 'Shape',
        labelName,
        pointsMap: detailedPolygonPoints,
        numberOfPoints: null,
    };
    const referenceObjectId = 1;
    const firstSimplifiedObjectId = 2;
    const simplificationCases = [
        {
            accuracy: 0,
            message: 'Aggressively simplified polygon',
            shouldHaveLessPointsThanBaseline: true,
        },
        {
            accuracy: 2,
            message: 'Middle-accuracy simplified polygon',
            shouldHaveMorePointsThanPrevious: true,
        },
        {
            accuracy: 13,
            message: 'High-accuracy simplified polygon',
            shouldHaveAtLeastPreviousPoints: true,
            shouldHaveAtLeastOriginalPoints: true,
            shouldKeepBaselineArea: true,
        },
    ];
    const originalObjectId = 1;
    const copyIds = [2, 3, 4];
    const resultIds = [5, 6, 7];

    function parsePolygonPoints(rawPoints) {
        return rawPoints
            .filter(Boolean)
            .map((point) => point.split(',').map(Number));
    }

    function shoelaceArea(points) {
        // Gauss's shoelace formula to find area of a polygon by its points only

        if (points.length < 3) {
            return 0;
        }
        const signedArea = points.reduce((acc, point, index) => {
            const next = points[(index + 1) % points.length];
            return acc + point[0] * next[1] - next[0] * point[1];
        }, 0);
        return Math.abs(signedArea) / 2;
    }

    function getPolygonPoints(objectId) {
        return getShapeCoord('polygon', `#cvat_canvas_shape_${objectId}`).then(parsePolygonPoints);
    }

    function getPolygonStats(objectId) {
        return getPolygonPoints(objectId).then((points) => ({
            objectId,
            area: shoelaceArea(points),
            pointsCount: points.length,
        }));
    }

    function logPolygonMetrics(message, metrics) {
        const {
            pointsCount, area, objectId,
        } = metrics;
        const logEntry = {
            objectId,
            message,
            points: pointsCount,
            area: area.toFixed(1),
        };
        cy.task('log', logEntry);
    }

    function setSimplifyAccuracy(value) {
        const sliderSelector = '.cvat-approx-poly-threshold-wrapper [role="slider"]';

        cy.get(sliderSelector).click();
        cy.get(sliderSelector).type('{home}');

        if (value > 0) {
            cy.get(sliderSelector).type('{rightarrow}'.repeat(value));
        }

        cy.get(sliderSelector).should('have.attr', 'aria-valuenow', `${value}`);
    }

    function makeCopy(expectedObjectId, canvasPosition = polygonCenter) {
        cy.interactAnnotationObjectMenu('#cvat-objects-sidebar-state-item-1', 'Make a copy');
        cy.get('.cvat-canvas-container').click(canvasPosition.x, canvasPosition.y);
        cy.get(`#cvat_canvas_shape_${expectedObjectId}`).should('exist').and('be.visible');
        return cy.get(`#cvat-objects-sidebar-state-item-${expectedObjectId}`).should('exist').and('be.visible');
    }

    function simplifyPolygon({ objectId, accuracy }) {
        cy.interactAnnotationObjectMenu(`#cvat-objects-sidebar-state-item-${objectId}`, 'Simplify');
        setSimplifyAccuracy(accuracy);
        cy.get('.cvat-approx-poly-threshold-wrapper .ant-btn-primary').click({ force: true });
        cy.get('.cvat-approx-poly-threshold-wrapper').should('not.exist');
        return false;
    }

    function expectCopiedPolygonMetrics(metrics, baselineStats) {
        expect(metrics.pointsCount).to.be.equal(baselineStats.pointsCount);
        expect(metrics.area).to.be.closeTo(baselineStats.area, 1);
    }

    function runSimplificationCases(cases) {
        cases.forEach((simplificationCase, index) => {
            const objectId = firstSimplifiedObjectId + index;

            if (index > 0) {
                makeCopy(objectId);
            }

            const isNewShape = simplifyPolygon({ objectId, ...simplificationCase });
            getPolygonStats(objectId + +isNewShape).then((metrics) => {
                logPolygonMetrics(simplificationCase.message, metrics);
            });
        });
    }
    function runSimplifyAction(distance) {
        cy.selectAnnotationsAction('Simplify polygons and polylines');
        cy.setAnnotationActionParameter('Distance', 'input', distance);
        // Run action
        cy.get('.cvat-action-runner-run-btn').click();
        cy.get('.cvat-action-runner-run-btn.ant-btn-loading').should('exist');
    }
    function simplifyAction({ objectId, distance }) {
        cy.get(`#cvat-objects-sidebar-state-item-${objectId}`)
            .find('.cvat-object-item-menu-button').click();
        cy.get('.cvat-object-item-menu')
            .contains('button', 'Run annotation action').click();

        runSimplifyAction(distance);
        // Wait for modal to disappear
        cy.get('.cvat-action-runner-content').should('not.exist');
        return true;
    }
    function simplifyBulkAction(distance) {
        cy.openAnnotationsActionsModal();
        runSimplifyAction(distance);
        cy.closeAnnotationsActionsModal();
    }
    function approveSimplify() {
        cy.get('.cvat-approx-poly-threshold-wrapper').find('.anticon-check').click();
        cy.get('.cvat-approx-poly-threshold-wrapper').should('not.exist');
    }
    function checkLessPointsThan(objectId, refPoints) {
        cy.get(`#cvat_canvas_shape_${objectId}`)
            .should(($shape) => {
                // retry until works
                const pointsRaw = $shape.attr('points');
                const points = parsePolygonPoints([pointsRaw]);
                expect(points.length).to.be.lessThan(refPoints.length);
            });
    }

    before(() => {
        cy.prepareUserSession();
        cy.openTaskJob(taskName);
    });

    afterEach(() => {
        cy.removeAnnotations();
    });

    context('Simplify one polygon', () => {
        it("'Simplify' removes points, decreases areas. Higher accuracy restores shape", () => {
            cy.createPolygon(createDetailedPolygon, null, 'shiftHover');
            makeCopy(firstSimplifiedObjectId, polygonCenter);
            getPolygonStats(referenceObjectId).then((baselineStats) => {
                expect(baselineStats.pointsCount).to.be.at.least(polygonPointsCount);
                expect(baselineStats.area).to.be.greaterThan(0);

                getPolygonStats(firstSimplifiedObjectId).then((metrics) => {
                    logPolygonMetrics('Copied polygon', metrics);
                    expectCopiedPolygonMetrics(metrics, baselineStats);
                });

                runSimplificationCases(simplificationCases);

                getPolygonStats(referenceObjectId).then((originalStats) => {
                    expect(originalStats.pointsCount).to.equal(baselineStats.pointsCount);
                    expect(originalStats.area).to.be.closeTo(baselineStats.area, 1);
                });
            });
        });

        context('Auto-simplify', () => {
            before(() => {
                cy.interactControlButton('draw-polyline');
                toggleAutoSimplify(true, 'polyline');
                cy.interactControlButton('draw-polyline');
                cy.interactControlButton('draw-polygon');
                toggleAutoSimplify(true, 'polygon');
                cy.interactControlButton('draw-polygon');
            });
            after(() => {
                cy.interactControlButton('draw-polygon');
                toggleAutoSimplify(false, 'polygon');
                cy.interactControlButton('draw-polygon');
                cy.get('.cvat-polygon-popover').should('not.exist');
                cy.interactControlButton('draw-polyline');
                toggleAutoSimplify(false, 'polyline');
                cy.interactControlButton('draw-polyline');
                cy.get('.cvat-polyline-popover').should('not.exist');
            });

            it('Auto-simplify when drawing a polyline', () => {
                cy.createPolyline({ ...createDetailedPolygon }, null, 'shiftHover');
                checkLessPointsThan(referenceObjectId, detailedPolygonPoints);
                approveSimplify();
            });
            it('Auto-simplify when drawing a polygon', () => {
                allure.issue('https://github.com/cvat-ai/cvat/pull/10568', 'Auto simplify initialized on first use');
                cy.createPolygon({ ...createDetailedPolygon }, null, 'shiftHover');
                checkLessPointsThan(referenceObjectId, detailedPolygonPoints);
                approveSimplify();
            });
        });
    });

    context("'Simplify' can be invoked as annotations action", () => {
        const distances = [20, 40, 64];
        let originalArea;

        function checkAreaProgression(refObjectArea, refObjectId, [stats1, stats2, stats3]) {
            // Verify area progression: copy1Area < copy2Area < copy3Area
            expect(stats1.area).to.be.lessThan(stats2.area);
            expect(stats2.area).to.be.lessThan(stats3.area);

            // Verify original polygon unchanged
            return getPolygonStats(refObjectId).then((finalOriginalStats) => {
                expect(finalOriginalStats.area).to.be.closeTo(refObjectArea, 1);
            });
        }
        function checkAreasEqual(refObjectId, [stats1, stats2, stats3]) {
            expect(stats1.area).to.be.closeTo(stats2.area, 1, 'area 1 not close to area 2');
            expect(stats2.area).to.be.closeTo(stats3.area, 1, 'area 2 not close to area 3');
            expect(stats3.area).to.be.closeTo(stats1.area, 1, 'area 3 not close to area 1');

            return getPolygonStats(refObjectId).then((finalOriginalStats) => {
                expect(finalOriginalStats.area).to.be.closeTo(stats1.area, 1, 'ref object is different from the others');
            });
        }
        function logSimplifyStats(msg, stats, distance, objectId) {
            const entry = {
                objectId,
                message: `${msg} (distance=${distance})`,
                points: stats.pointsCount,
                area: stats.area.toFixed(1),
            };
            cy.task('log', entry);
        }

        beforeEach(() => {
            cy.createPolygon(createDetailedPolygon, null, 'shiftHover');
            // Make 3 copies, place them around cavnas for visual
            makeCopy(copyIds[0], translatePoint({ a: -200 }, polygonCenter));
            makeCopy(copyIds[1], translatePoint({ b: 200 }, polygonCenter));
            makeCopy(copyIds[2], translatePoint({ a: 200 }, polygonCenter));
        });

        it("Call 'simplify' on each object", () => {
            getPolygonStats(originalObjectId).then((originalStats) => {
                originalArea = originalStats.area;
                expect(originalStats.area).to.be.greaterThan(0);

                // Simplify each copy with different distance parameters
                copyIds.forEach((copyId, index) => {
                    simplifyAction({ objectId: copyId, distance: distances[index] });
                    cy.get(`#cvat_canvas_shape_${resultIds[index]}`).should('exist');
                });

                // Collect stats
                const allStats = [];
                cy.wrap(resultIds).each((id) => {
                    getPolygonStats(id).then((stats) => {
                        allStats.push(stats);
                    });
                });
                cy.then(() => {
                    const [stats1, stats2, stats3] = allStats;
                    logSimplifyStats('Aggressive simplification', stats1, distances[0]);
                    logSimplifyStats('Middle simplification', stats2, distances[1]);
                    logSimplifyStats('High-distance simplification', stats3, distances[2]);

                    return checkAreaProgression(originalArea, originalObjectId, allStats);
                });
            });
        });

        it("Call 'simplify' on all shapes as a bulk action", () => {
            const distance = distances[2];
            const allStats = [];

            getPolygonStats(originalObjectId).then((originalStats) => {
                originalArea = originalStats.area;
                expect(originalStats.area).to.be.greaterThan(0);
                simplifyBulkAction(distance);
                cy.wrap(resultIds).each((id) => {
                    getPolygonStats(id).then((stats) => {
                        allStats.push(stats);
                    });
                });
                cy.then(() => {
                    allStats.forEach((stats, objectId) => {
                        logSimplifyStats('Aggressive simplification', stats, distance, objectId);
                    });
                    return checkAreasEqual(resultIds[0], allStats);
                });
            });
        });
    });
});

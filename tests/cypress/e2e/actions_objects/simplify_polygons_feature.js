// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: LicenseRef-CVAT-AI-Commercial

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';
import { getShapeCoord } from '../../support/utils.cy';

context('Simplify polygons feature', { scrollBehavior: false }, () => {
    const polygonCenter = { x: 510, y: 324 };
    const detailedPolygonPoints = [
        { x: 340, y: 185 },
        { x: 380, y: 210 },
        { x: 421, y: 178 },
        { x: 455, y: 214 },
        { x: 498, y: 176 },
        { x: 538, y: 215 },
        { x: 578, y: 182 },
        { x: 613, y: 220 },
        { x: 655, y: 195 },
        { x: 636, y: 245 },
        { x: 700, y: 270 },
        { x: 635, y: 292 },
        { x: 695, y: 332 },
        { x: 631, y: 348 },
        { x: 673, y: 402 },
        { x: 612, y: 386 },
        { x: 586, y: 460 },
        { x: 548, y: 402 },
        { x: 505, y: 472 },
        { x: 470, y: 402 },
        { x: 424, y: 456 },
        { x: 402, y: 382 },
        { x: 342, y: 410 },
        { x: 382, y: 348 },
        { x: 320, y: 326 },
        { x: 384, y: 292 },
        { x: 323, y: 260 },
        { x: 390, y: 246 },
        { x: 360, y: 205 },
        { x: 326, y: 225 },
    ];
    const polygonPointsCount = detailedPolygonPoints.length;
    const createDetailedPolygon = {
        type: 'Shape',
        labelName,
        pointsMap: detailedPolygonPoints,
        numberOfPoints: null,
    };

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

    function getSampledIoU(firstPolygon, secondPolygon) {
        const getBoundingBox = (polygons) => {
            const points = polygons.flat();
            return {
                minX: Math.floor(Math.min(...points.map(([x]) => x))),
                maxX: Math.ceil(Math.max(...points.map(([x]) => x))),
                minY: Math.floor(Math.min(...points.map(([, y]) => y))),
                maxY: Math.ceil(Math.max(...points.map(([, y]) => y))),
            };
        };
        const isPointInsidePolygon = (point, polygon) => {
            // Solve a linear equation by casting a ray

            let inside = false;
            const { x, y } = point;
            for (let index = 0, previousIndex = polygon.length - 1; index < polygon.length; previousIndex = index++) {
                const [xi, yi] = polygon[index];
                const [xj, yj] = polygon[previousIndex];
                const intersects = (
                    ((yi > y) !== (yj > y)) &&
                    (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
                );
                if (intersects) {
                    inside = !inside;
                }
            }
            return inside;
        };

        const step = 2;
        const {
            minX, maxX, minY, maxY,
        } = getBoundingBox([firstPolygon, secondPolygon]);
        let intersectionCount = 0;
        let unionCount = 0;
        for (let y = minY; y <= maxY; y += step) {
            for (let x = minX; x <= maxX; x += step) {
                const point = { x: x + step / 2, y: y + step / 2 };
                const inFirst = isPointInsidePolygon(point, firstPolygon);
                const inSecond = isPointInsidePolygon(point, secondPolygon);
                if (inFirst || inSecond) {
                    unionCount++;
                }
                if (inFirst && inSecond) {
                    intersectionCount++;
                }
            }
        }
        return intersectionCount / unionCount;
    }

    function getPolygonPoints(objectId) {
        return getShapeCoord('polygon', `#cvat_canvas_shape_${objectId}`).then(parsePolygonPoints);
    }

    function getPolygonMetrics(referenceObjectId, simplifiedObjectId) {
        return getPolygonPoints(referenceObjectId).then((referencePoints) => (
            getPolygonPoints(simplifiedObjectId).then((simplifiedPoints) => {
                const referenceArea = shoelaceArea(referencePoints);
                const simplifiedArea = shoelaceArea(simplifiedPoints);
                const iou = getSampledIoU(referencePoints, simplifiedPoints);

                return {
                    referenceArea,
                    referencePointsCount: referencePoints.length,
                    simplifiedArea,
                    iou,
                    pointsCount: simplifiedPoints.length,
                };
            })
        ));
    }

    function getPolygonStats(objectId) {
        return getPolygonPoints(objectId).then((points) => ({
            area: shoelaceArea(points),
            pointsCount: points.length,
        }));
    }

    function logPolygonMetrics(message, metrics) {
        const {
            pointsCount, referenceArea, simplifiedArea, iou,
        } = metrics;
        const logEntry = {
            message,
            points: pointsCount,
            iou: iou.toFixed(4),
            referenceArea: referenceArea.toFixed(1),
            simplifiedArea: simplifiedArea.toFixed(1),
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

    function makeAlignedCopy(expectedObjectId) {
        cy.interactAnnotationObjectMenu('#cvat-objects-sidebar-state-item-1', 'Make a copy');
        cy.get('.cvat-canvas-container').click(polygonCenter.x, polygonCenter.y);
        cy.get(`#cvat_canvas_shape_${expectedObjectId}`).should('exist').and('be.visible');
    }

    function simplifyPolygon({ objectId, accuracy }) {
        cy.interactAnnotationObjectMenu(`#cvat-objects-sidebar-state-item-${objectId}`, 'Simplify');
        cy.get('.cvat-approx-poly-threshold-wrapper').should('exist').and('be.visible');
        setSimplifyAccuracy(accuracy);
        cy.get('.cvat-approx-poly-threshold-wrapper .ant-btn-primary').click({ force: true });
        cy.get('.cvat-approx-poly-threshold-wrapper').should('not.exist');
    }

    before(() => {
        cy.prepareUserSession();
        cy.openTaskJob(taskName);
        cy.createPolygon(createDetailedPolygon, null, 'shiftHover');
    });

    after(() => {
        cy.realPress('Escape');
        cy.removeAnnotations();
    });

    it("IoU grows as 'Simplify' preserves more polygon detail", () => {
        getPolygonStats(1).then((baselineStats) => {
            expect(baselineStats.pointsCount).to.be.at.least(polygonPointsCount);
            expect(baselineStats.area).to.be.greaterThan(0);

            makeAlignedCopy(2);

            getPolygonMetrics(1, 2).then((metrics) => {
                logPolygonMetrics('Copied polygon', metrics);
                expect(metrics.referencePointsCount).to.equal(baselineStats.pointsCount);
                expect(metrics.pointsCount).to.be.equal(baselineStats.pointsCount);
                expect(metrics.iou).to.be.greaterThan(0.99);
                expect(metrics.referenceArea).to.be.closeTo(baselineStats.area, 1);
                expect(metrics.simplifiedArea).to.be.closeTo(baselineStats.area, 1);
            });

            simplifyPolygon({ objectId: 2, accuracy: 0 });
            getPolygonMetrics(1, 2).then((aggressiveMetrics) => {
                logPolygonMetrics('Aggressively simplified polygon', aggressiveMetrics);
                expect(aggressiveMetrics.referencePointsCount).to.equal(baselineStats.pointsCount);
                expect(aggressiveMetrics.pointsCount).to.be.lessThan(baselineStats.pointsCount);
                expect(aggressiveMetrics.iou).to.be.lessThan(0.95);

                makeAlignedCopy(3);
                simplifyPolygon({ objectId: 3, accuracy: 13 });
                getPolygonMetrics(1, 3).then((accurateMetrics) => {
                    logPolygonMetrics('High-accuracy simplified polygon', accurateMetrics);
                    expect(accurateMetrics.referencePointsCount).to.equal(baselineStats.pointsCount);
                    expect(accurateMetrics.pointsCount).to.be.greaterThan(aggressiveMetrics.pointsCount);
                    expect(accurateMetrics.pointsCount).to.be.at.least(polygonPointsCount);
                    expect(accurateMetrics.iou).to.be.greaterThan(aggressiveMetrics.iou);
                    expect(accurateMetrics.iou).to.be.greaterThan(0.99);
                });
            });

            getPolygonStats(1).then((originalStats) => {
                expect(originalStats.pointsCount).to.equal(baselineStats.pointsCount);
                expect(originalStats.area).to.be.closeTo(baselineStats.area, 1);
            });
        });
    });
});

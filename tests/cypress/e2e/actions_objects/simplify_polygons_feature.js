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
            area: shoelaceArea(points),
            pointsCount: points.length,
        }));
    }

    function logPolygonMetrics(message, metrics) {
        const {
            pointsCount, area,
        } = metrics;
        const logEntry = {
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

    function expectCopiedPolygonMetrics(metrics, baselineStats) {
        expect(metrics.pointsCount).to.be.equal(baselineStats.pointsCount);
        expect(metrics.area).to.be.closeTo(baselineStats.area, 1);
    }

    function expectSimplificationMetrics(metrics, previousMetrics, baselineStats, {
        shouldHaveMorePointsThanPrevious = false,
        shouldHaveAtLeastPreviousPoints = false,
        shouldHaveLessPointsThanBaseline = false,
        shouldHaveAtLeastOriginalPoints = false,
        shouldKeepBaselineArea = false,
    }) {
        if (shouldHaveMorePointsThanPrevious) {
            expect(metrics.pointsCount).to.be.greaterThan(previousMetrics.pointsCount);
        }

        if (shouldHaveAtLeastPreviousPoints) {
            expect(metrics.pointsCount).to.be.at.least(previousMetrics.pointsCount);
        }

        if (shouldHaveLessPointsThanBaseline) {
            expect(metrics.pointsCount).to.be.lessThan(baselineStats.pointsCount);
        }

        if (shouldHaveAtLeastOriginalPoints) {
            expect(metrics.pointsCount).to.be.at.least(polygonPointsCount);
        }

        if (shouldKeepBaselineArea) {
            expect(metrics.area).to.be.closeTo(baselineStats.area, 1);
        } else {
            expect(metrics.area).to.be.greaterThan(0);
        }
    }

    function runSimplificationCases(baselineStats) {
        let previousMetrics = null;

        simplificationCases.forEach((simplificationCase, index) => {
            const objectId = firstSimplifiedObjectId + index;

            if (index > 0) {
                makeAlignedCopy(objectId);
            }

            simplifyPolygon({ objectId, accuracy: simplificationCase.accuracy });
            getPolygonStats(objectId).then((metrics) => {
                logPolygonMetrics(simplificationCase.message, metrics);
                expectSimplificationMetrics(metrics, previousMetrics, baselineStats, simplificationCase);
                previousMetrics = metrics;
            });
        });
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

    it("'Simplify' preserves polygon area while retaining more detail at higher accuracy", () => {
        getPolygonStats(referenceObjectId).then((baselineStats) => {
            expect(baselineStats.pointsCount).to.be.at.least(polygonPointsCount);
            expect(baselineStats.area).to.be.greaterThan(0);

            makeAlignedCopy(firstSimplifiedObjectId);

            getPolygonStats(firstSimplifiedObjectId).then((metrics) => {
                logPolygonMetrics('Copied polygon', metrics);
                expectCopiedPolygonMetrics(metrics, baselineStats);
            });

            runSimplificationCases(baselineStats);

            getPolygonStats(referenceObjectId).then((originalStats) => {
                expect(originalStats.pointsCount).to.equal(baselineStats.pointsCount);
                expect(originalStats.area).to.be.closeTo(baselineStats.area, 1);
            });
        });
    });
});

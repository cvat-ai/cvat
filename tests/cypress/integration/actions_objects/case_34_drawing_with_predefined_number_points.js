// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Drawing with predefined number of points.', () => {
    const caseId = '34';
    const countPointsPolygon = 3;
    const countPointsPolyline = 2;
    const countPointsPoint = 1;

    const createPolygonShape = {
        reDraw: false,
        type: 'Shape',
        labelName,
        pointsMap: [
            { x: 500, y: 100 },
            { x: 600, y: 100 },
            { x: 500, y: 200 },
        ],
        numberOfPoints: 3,
    };
    const createPolylinesShape = {
        type: 'Shape',
        labelName,
        pointsMap: [
            { x: 500, y: 250 },
            { x: 600, y: 250 },
        ],
        numberOfPoints: 2,
    };
    const createPointsShape = {
        type: 'Shape',
        labelName,
        pointsMap: [{ x: 500, y: 200 }],
        numberOfPoints: 1,
    };

    before(() => {
        cy.openTaskJob(taskName);
    });

    function tryDrawObjectPredefinedNumberPoints(object, pointsCount) {
        cy.get(`.cvat-draw-${object}-control`).click().wait(500);
        cy.get('.cvat-draw-shape-popover')
            .not('.ant-popover-hidden')
            .within(() => {
                cy.get('.cvat-draw-shape-popover-points-selector')
                    .type(`${pointsCount - 1}`)
                    .focused()
                    .blur();
                cy.get('[role="spinbutton"]').should('have.attr', 'aria-valuenow', pointsCount);
            });
    }

    function tryDeletePoint() {
        const svgJsCircleId = [];
        cy.get('#cvat_canvas_shape_1').trigger('mousemove', { force: true }).should('have.attr', 'fill-opacity', 0.3);
        cy.get('circle').then((circle) => {
            for (let i = 0; i < circle.length; i++) {
                if (circle[i].id.match(/^SvgjsCircle\d+$/)) {
                    svgJsCircleId.push(circle[i].id);
                }
            }
            cy.get(`#${svgJsCircleId[0]}`).click({ altKey: true });
        });
    }

    function checkNotificationAndClose() {
        cy.get('.cvat-notification-notice-update-annotations-failed')
            .should('exist')
            .within(() => {
                cy.get('[aria-label="close"]').click();
            });
    }

    describe(`Testing case "${caseId}"`, () => {
        it('Start drawing a polygon. Set "Number of points" less then 3 and press Tab. "Number of points" takes the value 3 automatically.', () => {
            tryDrawObjectPredefinedNumberPoints('polygon', countPointsPolygon);
        });

        it('Draw a polygon with 3 points. And try to delete one point. The error notification should appear.', () => {
            cy.createPolygon(createPolygonShape);
            tryDeletePoint();
            checkNotificationAndClose();
            cy.removeAnnotations(); // Removing the annotation for the convenience of further testing
        });

        it('Start drawing a polyline. Set "Number of points" less then 2 and press Tab. "Number of points" takes the value 2 automatically.', () => {
            tryDrawObjectPredefinedNumberPoints('polyline', countPointsPolyline);
        });

        it('Draw a polyline with 2 points. And try to delete one point. The error notification should appear.', () => {
            cy.createPolyline(createPolylinesShape);
            tryDeletePoint();
            checkNotificationAndClose();
            cy.removeAnnotations(); // Removing the annotation for the convenience of further testing
        });

        it('Start drawing a point. Set "Number of points" less then 1 and press Tab. "Number of points" takes the value 1 automatically.', () => {
            tryDrawObjectPredefinedNumberPoints('points', countPointsPoint);
        });

        it('Draw a point with 1 points. And try to delete one point. The error notification should appear.', () => {
            cy.createPoint(createPointsShape);
            tryDeletePoint();
            checkNotificationAndClose();
        });
    });
});

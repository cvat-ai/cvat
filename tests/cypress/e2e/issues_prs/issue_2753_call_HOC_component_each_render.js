// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Call HOC component each render.', () => {
    const issueId = '2753';
    const numberOfPointsPolygon = 4;
    const numberOfPointsPolyline = 5;
    const numberOfPointsPoint = 6;

    const createPolygonShapePoints = {
        reDraw: false,
        type: 'Shape',
        labelName,
        pointsMap: [
            { x: 200, y: 200 },
            { x: 250, y: 200 },
            { x: 250, y: 250 },
            { x: 200, y: 300 },
        ],
        numberOfPoints: numberOfPointsPolygon,
    };
    const createPolylinesTrackPoints = {
        type: 'Track',
        labelName,
        pointsMap: [
            { x: 300, y: 200 },
            { x: 350, y: 200 },
            { x: 350, y: 250 },
            { x: 300, y: 350 },
            { x: 270, y: 330 },
        ],
        numberOfPoints: numberOfPointsPolyline,
    };
    const createPointsShapePoints = {
        type: 'Shape',
        labelName,
        pointsMap: [
            { x: 400, y: 200 },
            { x: 450, y: 200 },
            { x: 450, y: 250 },
            { x: 450, y: 230 },
            { x: 430, y: 230 },
            { x: 400, y: 230 },
        ],
        numberOfPoints: numberOfPointsPoint,
    };

    function checkNumberOfPointsValue(objectType, numberOfPoints) {
        cy.interactControlButton(`draw-${objectType}`);
        cy.get(`.cvat-draw-${objectType}-popover`).within(() => {
            cy.get('.cvat-draw-shape-popover-points-selector')
                .find('input')
                .should('have.attr', 'value', numberOfPoints);
        });
        cy.get(`.cvat-draw-${objectType}-control`).trigger('mouseout');
    }

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing issue "${issueId}"`, () => {
        it('Draw polygon, polyline, points. After drawing "Number of points" popover value should the same.', () => {
            cy.createPolygon(createPolygonShapePoints);
            cy.createPolyline(createPolylinesTrackPoints);
            cy.createPoint(createPointsShapePoints);
            checkNumberOfPointsValue('polygon', numberOfPointsPolygon);
            checkNumberOfPointsValue('polyline', numberOfPointsPolyline);
            checkNumberOfPointsValue('points', numberOfPointsPoint);
        });
    });
});

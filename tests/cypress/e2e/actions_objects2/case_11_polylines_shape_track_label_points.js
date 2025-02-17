// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Actions on polylines.', () => {
    const caseId = '11';
    const newLabelName = `New label for case ${caseId}`;
    const createPolylinesShape = {
        type: 'Shape',
        labelName,
        pointsMap: [
            { x: 200, y: 200 },
            { x: 250, y: 200 },
            { x: 250, y: 250 },
        ],
    };
    const createPolylinesTrack = {
        type: 'Track',
        labelName,
        pointsMap: [
            { x: 300, y: 200 },
            { x: 350, y: 200 },
            { x: 350, y: 350 },
        ],
    };
    const createPolylinesShapePoints = {
        type: 'Shape',
        labelName,
        pointsMap: [
            { x: 400, y: 200 },
            { x: 450, y: 200 },
            { x: 450, y: 250 },
            { x: 400, y: 350 },
            { x: 380, y: 330 },
        ],
        numberOfPoints: 5,
    };
    const createPolylinesTrackPoints = {
        type: 'Track',
        labelName,
        pointsMap: [
            { x: 500, y: 200 },
            { x: 550, y: 200 },
            { x: 550, y: 250 },
            { x: 500, y: 350 },
            { x: 480, y: 330 },
        ],
        numberOfPoints: 5,
    };
    const createPolylinesShapeSwitchLabel = {
        type: 'Shape',
        labelName: newLabelName,
        pointsMap: [
            { x: 600, y: 200 },
            { x: 650, y: 200 },
            { x: 650, y: 250 },
        ],
        finishWithButton: true,
    };
    const createPolylinesTrackSwitchLabel = {
        type: 'Track',
        labelName: newLabelName,
        pointsMap: [
            { x: 700, y: 200 },
            { x: 750, y: 200 },
            { x: 750, y: 250 },
        ],
        finishWithButton: true,
    };

    before(() => {
        cy.openTask(taskName);
        cy.addNewLabel({ name: newLabelName });
        cy.openJob();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Draw a polylines shape, track.', () => {
            cy.createPolyline(createPolylinesShape);
            cy.createPolyline(createPolylinesTrack);
        });

        it('Draw a polylines shape, track with use parameter "number of points".', () => {
            cy.createPolyline(createPolylinesShapePoints);
            cy.createPolyline(createPolylinesTrackPoints);
        });

        it('Draw a polylines shape, track with second label and "Done" button.', () => {
            cy.createPolyline(createPolylinesShapeSwitchLabel);
            cy.createPolyline(createPolylinesTrackSwitchLabel);
        });

        it('Change direction.', () => {
            const firtsPointCoords = {
                x: 0,
                y: 0,
            };
            const lastPointCoords = {
                x: 0,
                y: 0,
            };
            cy.get('#cvat_canvas_shape_4').trigger('mousemove', { scrollBehavior: false });
            cy.get('#cvat_canvas_shape_4').trigger('mouseover', { scrollBehavior: false });
            cy.get('#cvat_canvas_shape_4').should('have.class', 'cvat_canvas_shape_activated');
            cy.get('.svg_select_points_point').first().then((firtsPoint) => {
                firtsPointCoords.x = firtsPoint.attr('cx');
                firtsPointCoords.y = firtsPoint.attr('cy');
                cy.get('.svg_select_points_point').last().then((lastPoint) => {
                    lastPointCoords.x = lastPoint.attr('cx');
                    lastPointCoords.y = lastPoint.attr('cy');
                    cy.get('.cvat_canvas_first_poly_point')
                        .should('have.attr', 'cx', firtsPointCoords.x)
                        .and('have.attr', 'cy', firtsPointCoords.y);
                    cy.get('.cvat_canvas_poly_direction').click({ scrollBehavior: false });
                    cy.get('.cvat_canvas_first_poly_point')
                        .should('have.attr', 'cx', lastPointCoords.x)
                        .and('have.attr', 'cy', lastPointCoords.y);
                });
            });
        });
    });
});

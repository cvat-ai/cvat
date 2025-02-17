// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('When delete a point, the required point is deleted.', () => {
    const issueId = '1391';
    const pointsCoordinatesBeforeDeletePoint = [];
    const pointsCoordinatesAfterDeletePoint = [];
    const createPolylinesShape = {
        type: 'Shape',
        labelName,
        pointsMap: [
            { x: 309, y: 250 },
            { x: 309, y: 350 },
            { x: 309, y: 450 },
        ],
        complete: true,
        numberOfPoints: null,
    };

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing issue "${issueId}"`, () => {
        it('Crearte polyline', () => {
            cy.createPolyline(createPolylinesShape);
            cy.get('#cvat-objects-sidebar-state-item-1').should('contain', '1').and('contain', 'POLYLINE SHAPE');
        });
        it('Get points coordinates from created polyline', () => {
            cy.get('#cvat_canvas_shape_1')
                .should('have.prop', 'animatedPoints')
                .then(($pointsCoordinates) => {
                    for (const i of $pointsCoordinates) {
                        pointsCoordinatesBeforeDeletePoint.push(`${i.x}, ${i.y}`);
                    }
                });
        });
        it('Remove the second point from created polyline', () => {
            cy.get('#cvat_canvas_shape_1').trigger('mousemove', { force: true });
            cy.get('#cvat_canvas_shape_1').trigger('mouseover', { force: true });
            cy.get('.svg_select_points').then((points) => {
                cy.get(points)
                    .eq(0)
                    .then((point1) => {
                        cy.get(point1).rightclick();
                    });
                cy.get(points)
                    .eq(1)
                    .then((point2) => {
                        cy.get(point2).rightclick({ force: true });
                    });
                cy.contains('Delete point').click();
            });
        });
        it('Get points coordinates from turned out polyline', () => {
            cy.get('#cvat_canvas_shape_1')
                .should('have.prop', 'animatedPoints')
                .then(($pointsCoordinates) => {
                    for (const i of $pointsCoordinates) {
                        pointsCoordinatesAfterDeletePoint.push(`${i.x}, ${i.y}`);
                    }
                });
        });
        it('Coordinate of second point before delete not in coordinates array after delete', () => {
            cy.get(pointsCoordinatesBeforeDeletePoint).then((point) => {
                cy.expect(pointsCoordinatesAfterDeletePoint).not.contain(point[1]);
            });
        });
    });
});

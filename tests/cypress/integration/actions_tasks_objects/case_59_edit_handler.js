// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Edit handler.', () => {
    const caseId = '59';
    const createPolygonShape = {
        redraw: false,
        type: 'Shape',
        labelName: labelName,
        pointsMap: [
            { x: 450, y: 350 },
            { x: 550, y: 350 },
            { x: 550, y: 450 },
        ],
        complete: true,
        numberOfPoints: null,
    };
    const createPolylinesShape = {
        type: 'Shape',
        labelName: labelName,
        pointsMap: [
            { x: 700, y: 350 },
            { x: 800, y: 350 },
            { x: 800, y: 450 },
        ],
        complete: true,
        numberOfPoints: null,
    };
    const createPointsShape = {
        type: 'Shape',
        labelName: labelName,
        pointsMap: [{ x: 200, y: 400 }],
        complete: true,
        numberOfPoints: null,
    };

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Start editing handler and cancel.', () => {
            cy.createPolygon(createPolygonShape);
            cy.get('.cvat-canvas-container').trigger('mousemove', 520, 400);
            cy.get('#cvat_canvas_shape_1').should('have.class', 'cvat_canvas_shape_activated');
            cy.get('.cvat-canvas-container').click(550, 350, { shiftKey: true });
            cy.get('.cvat_canvas_shape_drawing').should('exist');
            cy.get('.cvat-canvas-container').click(650, 300);
            cy.get('body').type('{Esc}');
            cy.get('.cvat_canvas_shape_drawing').should('not.exist');
        });

        it('Edit handler for the polygon.', () => {
            cy.get('.cvat-canvas-container').trigger('mousemove', 520, 400);
            cy.get('#cvat_canvas_shape_1')
                .should('have.class', 'cvat_canvas_shape_activated')
                .invoke('attr', 'points')
                .then(($points) => {
                    const pointsCountBefore = $points.split(' ').filter(function (el) {
                        return el.length != 0;
                    }).length;
                    cy.get('.cvat-canvas-container')
                        .click(550, 350, { shiftKey: true })
                        .then(() => {
                            //Click on the second polygon points to start of change
                            cy.get('.cvat_canvas_shape_drawing')
                                .should('exist')
                                .and('have.attr', 'data-origin-client-id', '1');
                        });
                    cy.get('.cvat-canvas-container').click(650, 300).click(550, 450); // Click on the third polygon points to finish the change
                    cy.get('.cvat_canvas_shape_drawing').should('not.exist');
                    cy.get('#cvat_canvas_shape_1')
                        .invoke('attr', 'points')
                        .then(($points) => {
                            const pointsCountAfter = $points.split(' ').filter(function (el) {
                                return el.length != 0;
                            }).length;
                            expect(pointsCountBefore).not.equal(pointsCountAfter); // expected 3 to not equal 4
                        });
                });
        });

        it('Edit handler for the polyline.', () => {
            cy.createPolyline(createPolylinesShape);
            cy.get('.cvat-canvas-container').trigger('mousemove', 800, 400);
            cy.get('#cvat_canvas_shape_2')
                .should('have.class', 'cvat_canvas_shape_activated')
                .invoke('attr', 'points')
                .then(($pointsCordsBefore) => {
                    cy.get('.cvat-canvas-container')
                        .click(800, 450, { shiftKey: true })
                        .then(() => {
                            // Click on the third polyline points to start of change
                            cy.get('.cvat_canvas_shape_drawing')
                                .should('exist')
                                .and('have.attr', 'data-origin-client-id', '2');
                        });
                    cy.get('.cvat-canvas-container').click(750, 500).click(700, 350); // Click on the first polyline points to finish the change
                    cy.get('.cvat_canvas_shape_drawing').should('not.exist');
                    cy.get('#cvat_canvas_shape_2')
                        .invoke('attr', 'points')
                        .then(($pointsCordsAfter) => {
                            // expected '10071.4287109375,9788.5712890625 ...' to not equal '10166.6669921875,9883.8095703125 ...'
                            expect($pointsCordsBefore).to.not.equal($pointsCordsAfter);
                        });
                });
        });

        it('Edit handler for the points.', () => {
            cy.createPoint(createPointsShape);
            cy.get('.cvat-canvas-container').trigger('mousemove', 200, 400).trigger('mouseenter', 200, 400);
            cy.get('.cvat-canvas-container')
                .click(200, 400, { shiftKey: true })
                .then(() => {
                    // Click on the point shape to start of change
                    cy.get('.cvat_canvas_selected_point').should('exist');
                    cy.get('.cvat_canvas_shape_drawing').should('exist').and('have.attr', 'data-origin-client-id', '3');
                });
            cy.get('.cvat-canvas-container')
                .click(200, 300)
                .find('circle')
                .then(($circleEditHanlerProgress) => {
                    // rightclick() on canvas to check canceling draw a additional point
                    cy.get('.cvat-canvas-container')
                        .rightclick()
                        .find('circle')
                        .then(($circleEditHanlerProgressCancelDrawPoint) => {
                            expect($circleEditHanlerProgress.length).not.equal(
                                $circleEditHanlerProgressCancelDrawPoint.length,
                            ); // expected 4 to not equal 3
                        });
                });
            cy.get('.cvat-canvas-container').click(200, 300).click(200, 400); // Click on the first points shape to finish the change
            cy.get('#cvat_canvas_shape_3')
                .find('circle')
                .then(($circleCountAfterHanlerEditing) => {
                    expect($circleCountAfterHanlerEditing.length).to.be.equal(2);
                });
        });
    });
});

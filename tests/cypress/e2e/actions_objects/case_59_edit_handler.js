// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Edit handler.', () => {
    const caseId = '59';
    const createPolygonShape = {
        redraw: false,
        type: 'Shape',
        labelName,
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
        labelName,
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
        labelName,
        pointsMap: [{ x: 200, y: 400 }],
        complete: true,
        numberOfPoints: null,
    };

    function testActivatingShape(x, y, expectedShape) {
        cy.get('.cvat-canvas-container').trigger('mousemove', x, y);
        cy.get(expectedShape).should('have.class', 'cvat_canvas_shape_activated');
    }

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Start editing handler and cancel.', () => {
            cy.createPolygon(createPolygonShape);
            testActivatingShape(520, 400, '#cvat_canvas_shape_1');
            cy.get('.cvat-canvas-container').click(550, 350, { shiftKey: true });
            cy.get('.cvat_canvas_shape_drawing').should('exist');
            cy.get('.cvat-canvas-container').click(650, 300);
            cy.get('body').type('{Esc}');
            cy.get('.cvat_canvas_shape_drawing').should('not.exist');
        });

        it('Edit handler for the polygon. Splitting.', () => {
            cy.get('.cvat-canvas-container').trigger('mousemove', 520, 400);
            cy.get('#cvat_canvas_shape_1')
                .should('have.class', 'cvat_canvas_shape_activated')
                .invoke('attr', 'points')
                .then(($pointsBefore) => {
                    const pointsCountBefore = $pointsBefore.split(' ').filter((el) => el.length !== 0).length;
                    cy.get('.cvat-canvas-container').click(550, 350, { shiftKey: true });
                    cy.get('.cvat-canvas-container').then(() => {
                        // Click on the second polygon points to start of change
                        cy.get('.cvat_canvas_shape_drawing')
                            .should('exist')
                            .and('have.attr', 'data-origin-client-id', '1');
                    });
                    cy.get('.cvat-canvas-container').click(650, 300);
                    cy.get('.cvat-canvas-container').click(550, 450); // Click on the third polygon points to finish the change
                    cy.get('.cvat_canvas_shape_drawing').should('not.exist');
                    cy.get('#cvat_canvas_shape_1')
                        .invoke('attr', 'points')
                        .then(($pointsAfter) => {
                            const pointsCountAfter = $pointsAfter.split(' ').filter((el) => el.length !== 0).length;
                            expect(pointsCountBefore).not.equal(pointsCountAfter); // expected 3 to not equal 4
                        });
                    // Splitting polygon
                    testActivatingShape(520, 400, '#cvat_canvas_shape_1');
                    cy.get('.cvat-canvas-container').click(650, 300, { shiftKey: true });
                    cy.get('.cvat-canvas-container').click(450, 350);
                    cy.get('.cvat-canvas-container').trigger('mouseenter', 530, 340);
                    cy.get('.cvat_canvas_shape_splitting').should('exist');
                    cy.get('.cvat-canvas-container').trigger('mouseleave', 530, 340);
                    cy.get('.cvat_canvas_shape_splitting').should('not.exist');
                    cy.get('.cvat-canvas-container').click(530, 340);
                    // Cancel changes, repeat edit handler and select an another shape
                    cy.get('body').type('{Ctrl}z');
                    testActivatingShape(520, 400, '#cvat_canvas_shape_1');
                    cy.get('.cvat-canvas-container').click(650, 300, { shiftKey: true });
                    cy.get('.cvat-canvas-container').click(450, 350);
                    cy.get('.cvat-canvas-container').click(530, 400);
                    // Cancel changes again, repeat edit handler dblclick to the last point
                    cy.get('body').type('{Ctrl}z');
                    testActivatingShape(520, 400, '#cvat_canvas_shape_1');
                    cy.get('.cvat-canvas-container').click(650, 300, { shiftKey: true });
                    cy.get('.cvat-canvas-container').click(630, 300);
                    cy.get('.cvat-canvas-container').click(530, 300);
                    cy.get('.cvat-canvas-container').click(450, 350);
                    cy.get('.cvat-canvas-container').click(530, 400);
                    cy.get('.cvat-canvas-container').click(450, 350);
                    cy.get('.cvat-canvas-container').dblclick(530, 400);
                    cy.get('#cvat_canvas_shape_1')
                        .invoke('attr', 'points')
                        .then(($pointsAfterSplitting) => {
                            const pointsCountAfterSplitting = $pointsAfterSplitting.split(' ').filter((el) => el.length !== 0).length;
                            expect(pointsCountAfterSplitting).to.be.equal(5); // expected 3 to equal 3
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
                    cy.get('.cvat-canvas-container').click(800, 450, { shiftKey: true });
                    cy.get('.cvat-canvas-container').then(() => {
                        // Click on the third polyline points to start of change
                        cy.get('.cvat_canvas_shape_drawing')
                            .should('exist')
                            .and('have.attr', 'data-origin-client-id', '2');
                        cy.get('body').type('{Ctrl}');
                        cy.get('.cvat_canvas_autoborder_point')
                            .should('exist')
                            .and('be.visible')
                            .then(($autoborderPoints) => {
                                expect($autoborderPoints.length).to.be.equal(5); // Autoborder points on the polygon
                            });
                    });
                    cy.get('.cvat-canvas-container').click(750, 500);
                    cy.get('.cvat-canvas-container').click(700, 350); // Click on the first polyline points to finish the change
                    cy.get('.cvat_canvas_shape_drawing').should('not.exist');
                    cy.get('#cvat_canvas_shape_2')
                        .invoke('attr', 'points')
                        .then(($pointsCordsAfter) => {
                            // expected '10071.4287109375,9788.5712890625 ...'
                            // to not equal '10166.6669921875,9883.8095703125 ...'
                            expect($pointsCordsBefore).to.not.equal($pointsCordsAfter);
                        });
                });
        });

        it('Edit handler for the points.', () => {
            cy.createPoint(createPointsShape);
            cy.get('.cvat-canvas-container').trigger('mousemove', 200, 400);
            cy.get('.cvat-canvas-container').trigger('mouseenter', 200, 400);
            cy.get('.cvat-canvas-container').click(200, 400, { shiftKey: true });
            cy.get('.cvat-canvas-container').then(() => {
                // Click on the point shape to start of change
                cy.get('.cvat_canvas_selected_point').should('exist');
                cy.get('.cvat_canvas_shape_drawing').should('exist').and('have.attr', 'data-origin-client-id', '3');
            });
            cy.get('.cvat-canvas-container').click(200, 300);
            cy.get('.cvat-canvas-container').find('circle')
                .then(($circleEditHanlerProgress) => {
                    // rightclick() on canvas to check canceling draw a additional point
                    cy.get('.cvat-canvas-container').rightclick();
                    cy.get('.cvat-canvas-container')
                        .find('circle')
                        .then(($circleEditHanlerProgressCancelDrawPoint) => {
                            expect($circleEditHanlerProgress.length).not.equal(
                                $circleEditHanlerProgressCancelDrawPoint.length,
                            ); // expected 4 to not equal 3
                        });
                });
            cy.get('.cvat-canvas-container').click(200, 300);
            cy.get('.cvat-canvas-container').click(200, 400); // Click on the first points shape to finish the change
            cy.get('#cvat_canvas_shape_3')
                .find('circle')
                .then(($circleCountAfterHanlerEditing) => {
                    expect($circleCountAfterHanlerEditing.length).to.be.equal(2);
                });
        });

        it('Combining polygon and points.', () => {
            testActivatingShape(520, 400, '#cvat_canvas_shape_1');

            // Draw line with shift key held down
            cy.get('.cvat-canvas-container').click(550, 450, { shiftKey: true });
            cy.get('.cvat-canvas-container').trigger('mousemove', 530, 450, { shiftKey: true });
            cy.get('.cvat-canvas-container').trigger('mousemove', 500, 450, { shiftKey: true });
            cy.get('.cvat-canvas-container').trigger('mousemove', 200, 400, { shiftKey: true });

            // Coverage "!pointsCriteria && !lengthCriteria"
            cy.get('.cvat-canvas-container').click(200, 400);
            cy.get('.cvat-canvas-container').click(200, 300);
            cy.get('.cvat_canvas_autoborder_point_direction').should('exist');
            cy.get('.cvat-canvas-container').dblclick(200, 300);
            cy.get('.cvat_canvas_autoborder_point_direction').should('not.exist');
            cy.get('.cvat-canvas-container').click(450, 350);
            cy.get('#cvat_canvas_shape_1')
                .invoke('attr', 'points')
                .then(($points) => {
                    expect(
                        $points.split(' ').filter((el) => el.length !== 0).length,
                    ).to.be.equal(11);
                });
            testActivatingShape(750, 500, '#cvat_canvas_shape_2');
            // Coverage "circle.on('mousedown', (e: MouseEvent): void => {"
            cy.get('.cvat-canvas-container').click(750, 500, { shiftKey: true });
            cy.get('.cvat-canvas-container').click(450, 350);
            cy.get('.cvat-canvas-container').trigger('mousemove', 450, 370);
            cy.get('.cvat-canvas-container').click(450, 350);
        });
    });
});

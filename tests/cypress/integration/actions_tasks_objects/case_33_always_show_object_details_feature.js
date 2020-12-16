// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Always show object details feature', () => {
    const caseId = '33';
    const firstRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName: labelName,
        firstX: 400,
        firstY: 100,
        secondX: 500,
        secondY: 200,
    };
    const createPolygonTrack = {
        reDraw: false,
        type: 'Track',
        labelName: labelName,
        pointsMap: [
            { x: 400, y: 300 },
            { x: 500, y: 300 },
            { x: 450, y: 350 },
        ],
        complete: true,
        numberOfPoints: null,
    };
    const createPolylinesShape = {
        type: 'Shape',
        labelName: labelName,
        pointsMap: [
            { x: 400, y: 400 },
            { x: 450, y: 450 },
            { x: 500, y: 500 },
        ],
        complete: true,
        numberOfPoints: null,
    };
    const createPointsShape = {
        type: 'Shape',
        labelName: labelName,
        pointsMap: [{ x: 400, y: 550 }],
        complete: true,
        numberOfPoints: null,
    };
    const createCuboidTrack2Points = {
        points: 'From rectangle',
        type: 'Track',
        labelName: labelName,
        firstX: 400,
        firstY: 650,
        secondX: 600,
        secondY: 750,
    };

    function checkShowDetails(...stateDetails) {
        cy.get('#cvat_canvas_text_content').within(() => {
            stateDetails.forEach(function (value, index) {
                cy.contains(`${labelName} ${index + 1}`).should(value);
            });
        });
    }

    before(() => {
        cy.openTaskJob(taskName);

        // create objects
        cy.createRectangle(firstRectangleShape2Points);
        cy.createPolygon(createPolygonTrack);
        cy.createPolyline(createPolylinesShape);
        cy.createPoint(createPointsShape);
        cy.createCuboid(createCuboidTrack2Points);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Show details only on activated object', () => {
            // deactivate objects
            cy.get('body').click();
            checkShowDetails('not.exist', 'not.exist', 'not.exist', 'not.exist', 'not.exist');

            // activate first object
            cy.get('#cvat_canvas_shape_1')
                .should('not.have.class', 'cvat_canvas_shape_activated')
                .trigger('mousemove')
                .should('have.class', 'cvat_canvas_shape_activated');
            checkShowDetails('be.visible', 'not.exist', 'not.exist', 'not.exist', 'not.exist');
        });

        it('Show details all object', () => {
            // deactivate objects
            cy.get('body').click();
            checkShowDetails('not.exist', 'not.exist', 'not.exist', 'not.exist', 'not.exist');

            // set checkbox show text always
            cy.openSettings();
            cy.get('.cvat-settings-modal').within(() => {
                cy.contains('Workspace').click();
                cy.get('.cvat-workspace-settings-show-text-always').within(() => {
                    cy.get('[type="checkbox"]').check();
                });
            });
            cy.closeSettings();
            checkShowDetails('be.visible', 'be.visible', 'be.visible', 'be.visible', 'be.visible');
        });
    });
});

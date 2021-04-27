// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Always show object details feature', () => {
    const caseId = '36';
    const rectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName: labelName,
        firstX: 400,
        firstY: 100,
        secondX: 500,
        secondY: 200,
    };
    const polygonTrack = {
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

    function checkShowDetails(stateFirstDetails, stateSecondDetails) {
        cy.get('#cvat_canvas_text_content').within(() => {
            cy.contains(`${labelName} 1`).should(stateFirstDetails);
            cy.contains(`${labelName} 2`).should(stateSecondDetails);
        });
    }

    before(() => {
        cy.openTaskJob(taskName);

        // create objects
        cy.createRectangle(rectangleShape2Points);
        cy.createPolygon(polygonTrack);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Show details only on activated object', () => {
            // deactivate objects
            cy.get('body').click();
            checkShowDetails('not.exist', 'not.exist');

            // activate first object
            cy.get('#cvat_canvas_shape_1')
                .should('not.have.class', 'cvat_canvas_shape_activated')
                .trigger('mousemove')
                .should('have.class', 'cvat_canvas_shape_activated');
            checkShowDetails('be.visible', 'not.exist');
        });

        it('Show details all object', () => {
            // deactivate objects
            cy.get('body').click();
            checkShowDetails('not.exist', 'not.exist');

            // set checkbox show text always
            cy.openSettings();
            cy.get('.cvat-settings-modal').within(() => {
                cy.contains('Workspace').click();
                cy.get('.cvat-workspace-settings-show-text-always').within(() => {
                    cy.get('[type="checkbox"]').check();
                });
            });
            cy.closeSettings();
            checkShowDetails('be.visible', 'be.visible');
        });
    });
});

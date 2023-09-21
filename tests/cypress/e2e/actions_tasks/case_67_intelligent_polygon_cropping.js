// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Settings "Intelligent polygon cropping".', () => {
    const caseId = '67';
    const createPolygonShape = {
        redraw: false,
        type: 'Shape',
        labelName,
        pointsMap: [
            { x: 450, y: 350 },
            { x: 550, y: 350 },
            { x: 550, y: 450 },
            { x: 500, y: 500 },
            { x: 300, y: 550 },
        ],
        complete: true,
        numberOfPoints: null,
    };

    function checkCountPoints(expectedCount) {
        cy.get('#cvat_canvas_shape_1')
            .invoke('attr', 'points')
            .then(($points) => {
                expect(
                    $points.split(' ').filter((el) => el.length !== 0).length,
                ).to.be.equal(expectedCount);
            });
    }

    function testSplitting() {
        cy.get('.cvat-canvas-container').click(450, 350, { shiftKey: true });
        cy.get('.cvat-canvas-container').click(550, 450);
    }

    function testCheckedIntelligentPolygonCropping(uncheck) {
        cy.openSettings();
        cy.contains('[role="tab"]', 'Workspace').click();
        if (uncheck) {
            cy.get('.cvat-workspace-settings-intelligent-polygon-cropping').find('[type="checkbox"]');
            cy.get('.cvat-workspace-settings-intelligent-polygon-cropping').find('[type="checkbox"]').uncheck();
            cy.get('.cvat-workspace-settings-intelligent-polygon-cropping').find('[type="checkbox"]').should('not.be.checked');
        } else {
            cy
                .get('.cvat-workspace-settings-intelligent-polygon-cropping')
                .find('[type="checkbox"]')
                .should('be.checked');
        }
        cy.closeSettings();
    }

    before(() => {
        cy.openTaskJob(taskName);
        cy.createPolygon(createPolygonShape);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Check settings "Intelligent polygon cropping".', () => {
            // Check settings "Intelligent polygon cropping". Should be checked by default
            testCheckedIntelligentPolygonCropping();
            cy.get('#cvat_canvas_shape_1').trigger('mousemove', { scrollBehavior: false });
            cy.get('#cvat_canvas_shape_1').should('have.class', 'cvat_canvas_shape_activated');
            testSplitting(); // Split the polygon into 2 parts. 1st part 3 points, 2nd part 4 points.
            checkCountPoints(4);
            cy.get('body').type('{Ctrl}z'); // Canceling the split
            testCheckedIntelligentPolygonCropping(true); // Uncheck "Intelligent polygon cropping"
            cy.get('#cvat_canvas_shape_1').trigger('mousemove', { scrollBehavior: false });
            cy.get('#cvat_canvas_shape_1').should('have.class', 'cvat_canvas_shape_activated');
            testSplitting(); // Split again
            cy.get('.cvat-canvas-container').trigger('mouseenter', 500, 370);
            cy.get('.cvat_canvas_shape_splitting').should('exist');
            cy.get('.cvat-canvas-container').click(500, 370); // Selecting a shape
            cy.get('.cvat_canvas_shape_splitting').should('not.exist');
            checkCountPoints(3);
        });
    });
});

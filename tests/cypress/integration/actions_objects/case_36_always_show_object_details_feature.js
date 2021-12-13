// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Always show object details feature. Text size/position.', () => {
    const caseId = '36';
    const rectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName,
        firstX: 400,
        firstY: 100,
        secondX: 500,
        secondY: 200,
    };
    const polygonTrack = {
        reDraw: false,
        type: 'Track',
        labelName,
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

        // Check text font size
        it('Text font size.', () => {
            cy.get('.cvat_canvas_text').should('have.attr', 'style', 'font-size: 14px;');
            cy.openSettings();
            cy.get('.cvat-workspace-settings-text-size')
                .find('input')
                .should('have.attr', 'value', '14')
                .clear()
                .type('16')
                .should('have.attr', 'value', '16');
            cy.closeSettings();
            cy.get('.cvat_canvas_text').should('have.attr', 'style', 'font-size: 16px;');
        });

        it('Text position.', () => {
            const rectTextCoords = [];
            const rectTextCoordsCenter = [];
            const polygonTextCoords = [];
            const polygonTextCoordsCenter = [];

            // rectangle
            cy.get('.cvat_canvas_text').first().then((rectText) => {
                rectTextCoords.push(rectText.attr('x'));
                rectTextCoords.push(rectText.attr('y'));
            });

            // polygon
            cy.get('.cvat_canvas_text').last().then((rectText) => {
                polygonTextCoords.push(rectText.attr('x'));
                polygonTextCoords.push(rectText.attr('y'));
            });

            cy.openSettings();
            cy.get('.cvat-workspace-settings-text-position')
                .find('[title="Auto"]')
                .click();
            cy.get('.ant-select-dropdown')
                .not('.ant-select-dropdown-hidden')
                .find('[title="Center"]')
                .click();
            cy.closeSettings();

            // rectangle
            cy.get('.cvat_canvas_text').first().then((rectText) => {
                rectTextCoordsCenter.push(rectText.attr('x'));
                rectTextCoordsCenter.push(rectText.attr('y'));
                expect(rectTextCoordsCenter).not.deep.equal(rectTextCoords);
            });

            // polygon
            cy.get('.cvat_canvas_text').last().then((rectText) => {
                polygonTextCoordsCenter.push(rectText.attr('x'));
                polygonTextCoordsCenter.push(rectText.attr('y'));
                expect(polygonTextCoordsCenter).not.deep.equal(polygonTextCoords);
            });
        });
    });
});

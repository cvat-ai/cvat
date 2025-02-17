// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { labelName, taskName } from '../../support/const';

context('Navigation to empty frames', () => {
    const issueId = '2485';
    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };

    before(() => {
        cy.openTaskJob(taskName);
        cy.goCheckFrameNumber(2);
        cy.createRectangle(createRectangleShape2Points);
        cy.goCheckFrameNumber(4);
        cy.createRectangle(createRectangleShape2Points);
        cy.addFiltersRule(0);
        cy.setFilter({
            groupIndex: 0,
            ruleIndex: 0,
            field: 'Shape',
            operator: '==',
            value: 'rectangle',
            submit: true,
        });
        cy.goCheckFrameNumber(3);
    });

    beforeEach(() => {
        cy.hideTooltips();
    });

    describe(`Testing issue "${issueId}"`, () => {
        it('Check navigation is corrent for filtered and empty frames', () => {
            // set mode to only filtered
            cy.get('.cvat-player-previous-button').rightclick();
            cy.get('.cvat-player-previous-filtered-inlined-button').click();

            // Press go previous with a filter. CVAT get 2nd frame. Press again. Frame wasn't changed
            for (let i = 1; i <= 2; i++) {
                cy.get('.cvat-player-previous-button-filtered').click({ force: true });
                cy.checkFrameNum(2);
                cy.get('#cvat_canvas_shape_1').should('exist');
            }

            // Press go next with a filter. CVAT get 4th frame. Press again. Frame wasn't changed
            for (let i = 1; i <= 2; i++) {
                cy.get('.cvat-player-next-button-filtered').click({ force: true });
                cy.checkFrameNum(4);
                cy.get('#cvat_canvas_shape_2').should('exist');
            }

            // set mode to only empty
            cy.get('.cvat-player-next-button-filtered').rightclick();
            cy.get('.cvat-player-next-empty-inlined-button').click();

            // Go previous to an empty frame. CVAT get 3rd frame
            cy.get('.cvat-player-previous-button-empty').click({ force: true });
            cy.checkFrameNum(3);
            cy.get('.cvat_canvas_shape').should('not.exist');

            // Go next to an empty frame. CVAT get 5th frame
            cy.get('.cvat-player-next-button-empty').click({ force: true });
            cy.checkFrameNum(5);
            cy.get('.cvat_canvas_shape').should('not.exist');
        });
    });
});

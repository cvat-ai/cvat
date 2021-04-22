// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { labelName, taskName } from '../../support/const';

context('Navigation to empty frames', () => {
    const issueId = '2485';
    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName: labelName,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing issue "${issueId}"`, () => {
        it('Go to 2nd frame. Create a shape.', () => {
            cy.goCheckFrameNumber(2);
            cy.createRectangle(createRectangleShape2Points);
        });

        it('Go to 4th frame. Create a shape.', () => {
            cy.goCheckFrameNumber(4);
            cy.createRectangle(createRectangleShape2Points);
        });

        it('Set a filter to see the created objects.', () => {
            cy.addFiltersRule(0);
            cy.setFilter({
                groupIndex: 0,
                ruleIndex: 0,
                field: 'Shape',
                operator: '==',
                value: 'rectangle',
                submit: true,
            });
            cy.get('#cvat_canvas_shape_2').should('exist');
        });

        it('Go to 3rd frame.', () => {
            cy.goCheckFrameNumber(3);
        });

        it('Right click to navigation buttons: Previous, Next. Switch their mode to: Go next/previous with a filter.', () => {
            cy.goCheckFrameNumber(3);
            for (const i of ['previous', 'next']) {
                cy.get(`.cvat-player-${i}-button`).rightclick();
                cy.get(`.cvat-player-${i}-filtered-inlined-button`).click();
            }
        });

        it("Press go previous with a filter. CVAT get 2nd frame. Press again. Frame wasn't changed.", () => {
            for (let i = 1; i <= 2; i++) {
                cy.get('.cvat-player-previous-button-filtered').click({ force: true });
                cy.checkFrameNum(2);
                cy.get('#cvat_canvas_shape_1').should('exist');
            }
        });

        it("Press go next with a filter. CVAT get 4th frame. Press again. Frame wasn't changed.", () => {
            for (let i = 1; i <= 2; i++) {
                cy.get('.cvat-player-next-button-filtered').click({ force: true });
                cy.checkFrameNum(4);
                cy.get('#cvat_canvas_shape_2').should('exist');
            }
        });

        it('Change navigation buttons mode to "Go next/previous to an empty frame".', () => {
            for (const i of ['previous', 'next']) {
                cy.get(`.cvat-player-${i}-button-filtered`).rightclick({ force: true });
                cy.get(`.cvat-player-${i}-empty-inlined-button`).click({ force: true });
            }
        });

        it('Go previous to an empty frame. CVAT get 3rd frame.', () => {
            cy.get('.cvat-player-previous-button-empty').click({ force: true });
            cy.checkFrameNum(3);
            cy.get('.cvat_canvas_shape').should('not.exist');
        });

        it('Go next to an empty frame. CVAT get 5th frame.', () => {
            cy.get('.cvat-player-next-button-empty').click({ force: true });
            cy.checkFrameNum(5);
            cy.get('.cvat_canvas_shape').should('not.exist');
        });
    });
});

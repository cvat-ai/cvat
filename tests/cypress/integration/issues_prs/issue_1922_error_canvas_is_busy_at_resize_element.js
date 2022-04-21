// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Check error canvas is busy at resize element', () => {
    const issueId = '1922';
    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName: labelName,
        firstX: 100,
        firstY: 100,
        secondX: 300,
        secondY: 300,
    };

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing issue "${issueId}"`, () => {
        it('Create an object in first frame', () => {
            cy.createRectangle(createRectangleShape2Points);
        });

        it('Go to next frame and create an object in second frame', () => {
            cy.get('.cvat-player-next-button').click();
            cy.createRectangle(createRectangleShape2Points);
        });

        it('Switching mode of button on "back with a filter"', () => {
            cy.get('.cvat-player-previous-button').rightclick();
            cy.get('.cvat-player-previous-filtered-inlined-button').click();
        });

        it('Resize element on second frame and go to previous frame at resizing element', () => {
            const secondX = createRectangleShape2Points.secondX;
            const secondY = createRectangleShape2Points.secondY;
            cy.get('.cvat-canvas-container')
                .trigger('mousemove', secondX - 10, secondY - 10) // activate second shape
                .trigger('mousedown', secondX, secondY, { button: 0 })
                .trigger('mousemove', secondX + 100, secondY + 100)
                .get('body')
                .type('d') // go to previous frame
                .trigger('mouseup');
        });

        it('Page with the error is missing', () => {
            cy.get('.cvat-global-boundary').should('not.exist');
        });
    });
});

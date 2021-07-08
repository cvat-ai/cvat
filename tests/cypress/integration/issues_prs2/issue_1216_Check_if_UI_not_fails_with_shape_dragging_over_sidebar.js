// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Check if UI not fails with shape dragging over sidebar', () => {
    const issueId = '1216';
    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName: labelName,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };
    const createRectangleShape2PointsSecond = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName: labelName,
        firstX: createRectangleShape2Points.firstX,
        firstY: createRectangleShape2Points.firstY - 150,
        secondX: createRectangleShape2Points.secondX,
        secondY: createRectangleShape2Points.secondY - 150,
    };

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing issue "${issueId}"`, () => {
        it('Create multiple objects', () => {
            /* The error was repeated when the number of
            objects was more than or equal to 2 */
            cy.createRectangle(createRectangleShape2Points);
            cy.createRectangle(createRectangleShape2PointsSecond);
        });
        it('Shape dragging over sidebar.', () => {
            /*To reproduce the error, move the any shape under any
            #cvat-objects-sidebar-state-item-*. */
            cy.get('#cvat_canvas_shape_2').trigger('mousemove').trigger('mouseover').trigger('mousedown', { which: 1 });
        });
        it('There is no error like "Canvas is busy. Action: drag" in the console', () => {
            cy.get('body')
                /*Since cy.click () contains events such as
            mousemove, mouseover, etc. Use it to reduce lines of code.*/
                .click(1299, 300);
        });
    });
});

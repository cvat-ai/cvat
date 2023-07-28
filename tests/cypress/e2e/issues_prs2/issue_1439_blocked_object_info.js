// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Information about a blocked object disappears if hover the cursor over another object', () => {
    const issueId = '1439';
    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };
    const createRectangleShape2PointsSecond = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName,
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
            cy.createRectangle(createRectangleShape2Points);
            cy.createRectangle(createRectangleShape2PointsSecond);
        });
        it('Lock all objects', () => {
            cy.get('.cvat-objects-sidebar-states-header').find('.anticon-unlock').click();
        });
        it('Mousemove to 1st object', () => {
            cy.get('#cvat_canvas_shape_1').trigger('mousemove');
        });
        it('Mousemove to 2nd object', () => {
            cy.get('#cvat_canvas_shape_2').trigger('mousemove');
        });
        it('Information about 1st object not exist', () => {
            cy.get('#cvat_canvas_text_content').contains(`${labelName} 1`).should('not.exist');
        });
    });
});

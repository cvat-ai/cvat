// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Check if the UI fails by moving to the next frame while dragging the object', () => {
    const prId = '1370';
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
    });

    describe(`Testing PR "${prId}"`, () => {
        it('Create object', () => {
            cy.createRectangle(createRectangleShape2Points);
        });
        it('Start object dragging and go to next frame (F).', () => {
            cy.get('#cvat_canvas_shape_1').trigger('mousemove');
            cy.get('#cvat_canvas_shape_1').trigger('mouseover');
            cy.get('#cvat_canvas_shape_1').trigger('mousedown', { which: 1 });
            cy.get('body').type('f');
        });
        it('Page with the error is missing', () => {
            cy.contains('Oops, something went wrong').should('not.exist');
        });
    });
});

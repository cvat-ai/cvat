// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { labelName, taskName } from '../../support/const';

context('Merge shapes on different frames.', () => {
    const caseId = '73';
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
        cy.createRectangle(createRectangleShape2Points);
        cy.goToNextFrame(1);
        cy.createRectangle(createRectangleShape2Points);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Merge shapes on the first and the second frames.', () => {
            cy.get('.cvat-merge-control').click();
            cy.get('#cvat_canvas_shape_2').click();
            cy.goToPreviousFrame(0);
            cy.get('#cvat_canvas_shape_1').click();
            cy.get('.cvat-merge-control').click();
        });

        it('Rectangle track appeared.', () => {
            cy.get('#cvat-objects-sidebar-state-item-3').should('exist');
            cy.get('.cvat-objects-sidebar-state-item-object-type-text').should('have.text', 'RECTANGLE TRACK');
            cy.goToNextFrame(1);
            cy.get('#cvat-objects-sidebar-state-item-3').should('exist');
            cy.get('.cvat-objects-sidebar-state-item-object-type-text').should('have.text', 'RECTANGLE TRACK');
        });
    });
});

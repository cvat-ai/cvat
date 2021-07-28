// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Create a link for shape, frame.', () => {
    const caseId = '101';
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
        cy.saveJob('PATCH', 200, `case${caseId}`);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Create a link for the shape.', () => {
            cy.get('#cvat_canvas_shape_1')
                .trigger('mousemove', {scrollBehavior: false})
                .trigger('mouseover', {scrollBehavior: false})
                .should('have.class', 'cvat_canvas_shape_activated')
            cy.get('#cvat-objects-sidebar-state-item-1').find('[aria-label="more"]').trigger('mouseover');
            cy.get('.cvat-object-item-menu').last().should('be.visible').contains('button', 'Create object URL').realClick();
            cy.task('getClipboard').then(($clipboard) => {
                const url = $clipboard;
                cy.log(url);
            });
        });
    });
});

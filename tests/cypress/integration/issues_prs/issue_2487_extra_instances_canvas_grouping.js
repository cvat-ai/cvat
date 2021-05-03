// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Extra instances on canvas when grouping.', () => {
    const issueId = '2487';

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing issue "${issueId}"`, () => {
        it('Go to grouping mode.', () => {
            cy.changeAppearance('Group');
        });

        it('Start drawing a group region and press "G". Group region not exist', () => {
            cy.get('.cvat-group-control').click();
            cy.get('.cvat-canvas-container')
                .trigger('mousedown', 250, 250, { button: 0 })
                .trigger('mousemove', 500, 500);
            cy.get('body').type('g');
            cy.get('.cvat_canvas_shape_grouping').should('not.exist');
        });
    });
});

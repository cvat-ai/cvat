// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
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
            cy.get('.cvat-canvas-container').trigger('mousedown', 250, 250, { button: 0 });
            cy.get('.cvat-canvas-container').trigger('mousemove', 500, 500);
            cy.get('body').type('g');
            cy.get('.cvat_canvas_shape_selection').should('not.exist');
        });
    });
});

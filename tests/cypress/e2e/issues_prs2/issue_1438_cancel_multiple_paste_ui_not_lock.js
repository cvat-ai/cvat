// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Cancel "multiple paste". UI is not locked.', () => {
    const issueId = '1438';
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

    describe(`Testing issue "${issueId}"`, () => {
        it('Copy, paste opject. Cancel pasting.', () => {
            cy.createRectangle(createRectangleShape2Points);
            cy.get('#cvat_canvas_shape_1').trigger('mousemove');
            cy.get('#cvat_canvas_shape_1').trigger('mouseover');
            cy.get('body').type('{ctrl}c');
            cy.get('body').type('{ctrl}v');
            cy.get('body').click({ ctrlKey: true });
            cy.get('body').type('{esc}');
        });
        it('UI is not locked.', () => {
            cy.get('.cvat-draw-rectangle-control').click();
            cy.get('.cvat-draw-shape-popover-content').should('be.visible');
        });
    });
});

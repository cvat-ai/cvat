// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Points track it is still invisible on next frames', () => {
    const issueId = '1368';
    const createPointsTrack = {
        type: 'Track',
        labelName: labelName,
        pointsMap: [{ x: 300, y: 410 }],
        complete: true,
        numberOfPoints: null,
    };

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing issue "${issueId}"`, () => {
        it('Create a points track', () => {
            cy.createPoint(createPointsTrack);
            cy.get('#cvat-objects-sidebar-state-item-1').should('contain', '1').and('contain', 'POINTS TRACK');
        });
        it('Switch outside property', () => {
            cy.get('#cvat_canvas_shape_1').trigger('mousemove').trigger('mouseover');
            cy.get('body').type('o');
            cy.get('#cvat_canvas_shape_1').should('be.hidden');
        });
        it('Point track on the next frame should not exist', () => {
            cy.get('.cvat-player-next-button').click();
            cy.get('#cvat_canvas_shape_1').should('not.exist');
        });
    });
});

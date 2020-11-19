// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, advancedConfigurationParams, labelName } from '../../support/const';

context('Check propagation work from the latest frame', () => {
    const issueId = '1785';
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
    });

    describe(`Testing issue "${issueId}"`, () => {
        it('Go to the last frame', () => {
            cy.get('.cvat-player-last-button').click();
            cy.get('.cvat-player-frame-selector').within(() => {
                cy.get('input[role="spinbutton"]').should('have.value', advancedConfigurationParams.segmentSize - 1);
            });
        });
        it('Create a rectangle shape', () => {
            cy.createRectangle(createRectangleShape2Points);
        });
        it('Try to propagate', () => {
            cy.get('#cvat_canvas_shape_1').trigger('mousemove');
            cy.get('body').type('{ctrl}b');
            cy.get('.ant-modal-content').find('.ant-btn-primary').click();
            cy.get('.ant-notification-notice').should('not.exist');
        });
    });
});

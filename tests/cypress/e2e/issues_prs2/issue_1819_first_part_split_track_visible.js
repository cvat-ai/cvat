// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, advancedConfigurationParams, labelName } from '../../support/const';

context('First part of a split track is visible', () => {
    const issueId = '1819';
    const createRectangleTrack2Points = {
        points: 'By 2 Points',
        type: 'Track',
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
        it('Create a rectangle track', () => {
            cy.createRectangle(createRectangleTrack2Points);
        });
        it('Go next with a step', () => {
            cy.get('.cvat-player-forward-button').click();
            cy.get('.cvat-player-frame-selector').within(() => {
                cy.get('input[role="spinbutton"]').should('have.value', advancedConfigurationParams.segmentSize - 1);
            });
        });
        it('Split track', () => {
            cy.get('body').type('{alt}m');
            cy.get('#cvat_canvas_shape_1').trigger('mousemove', { button: 0 });
            cy.get('#cvat_canvas_shape_1').trigger('click', { button: 0 });
        });
        it('Go to previous frame', () => {
            cy.get('.cvat-player-previous-button').click();
            cy.get('.cvat-player-frame-selector').within(() => {
                cy.get('input[role="spinbutton"]').should('have.value', advancedConfigurationParams.segmentSize - 2);
            });
        });
        it('First part of a split track is visible', () => {
            cy.get('#cvat_canvas_shape_2').should('be.visible');
        });
    });
});

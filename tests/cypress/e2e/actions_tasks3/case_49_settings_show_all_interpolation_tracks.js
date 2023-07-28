// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Settings. "Show all interpolation tracks" option.', () => {
    const caseId = '49';
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
        cy.createRectangle(createRectangleTrack2Points);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Switch outside property. The object is not visible. An object sidebar is visible.', () => {
            cy.get('#cvat-objects-sidebar-state-item-1').within(() => {
                cy.get('.cvat-object-item-button-outside').click();
                cy.get('.cvat-object-item-button-outside-enabled').should('exist');
            });
            cy.get('#cvat_canvas_shape_1').should('not.be.visible');
            cy.get('#cvat-objects-sidebar-state-item-1').should('be.visible');
        });

        it('On the next frame object and object sidebar does not exist.', () => {
            cy.goToNextFrame(1);
            cy.get('#cvat_canvas_shape_1').should('not.exist');
            cy.get('#cvat-objects-sidebar-state-item-1').should('not.exist');
        });

        it('Open settings. Set "Show all interpolation tracks".', () => {
            cy.openSettings();
            cy.contains('Workspace').click();
            cy.get('.cvat-workspace-settings-show-interpolated').within(() => {
                cy.get('[type="checkbox"]').check();
            });
            cy.closeSettings();
        });

        it('The object sidebar now visible on the current frame and outside property is active. The object not visible.', () => {
            cy.get('#cvat-objects-sidebar-state-item-1')
                .should('be.visible')
                .within(() => {
                    cy.get('.cvat-object-item-button-outside-enabled').should('exist');
                });
            cy.get('#cvat_canvas_shape_1').should('not.be.visible');
        });

        it('Open settings. Unset "Show all interpolation tracks". ', () => {
            cy.openSettings();
            cy.contains('Workspace').click();
            cy.get('.cvat-workspace-settings-show-interpolated').within(() => {
                cy.get('[type="checkbox"]').uncheck();
            });
            cy.closeSettings();
        });

        it('The object sidebar does not exist again. The object does not exist.', () => {
            cy.get('#cvat_canvas_shape_1').should('not.exist');
            cy.get('#cvat-objects-sidebar-state-item-1').should('not.exist');
        });
    });
});

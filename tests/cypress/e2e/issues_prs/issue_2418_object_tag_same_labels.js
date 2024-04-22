// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Check hide/unhide functionality from label tab for object and tag with a same label.', () => {
    const issueId = '2418';
    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName,
        firstX: 260,
        firstY: 200,
        secondX: 360,
        secondY: 250,
    };

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing issue "${issueId}"`, () => {
        it('Crearte an object. Create a tag.', () => {
            cy.createRectangle(createRectangleShape2Points);
            cy.createTag(labelName);
        });
        it('Go to "Labels" tab.', () => {
            cy.get('.cvat-objects-sidebar').within(() => {
                cy.contains('Labels').click();
            });
        });
        it('Hide object by label name.', () => {
            cy.get('.cvat-objects-sidebar-labels-list').within(() => {
                cy.contains(labelName)
                    .parents('.cvat-objects-sidebar-label-item')
                    .within(() => {
                        cy.get('.cvat-label-item-button-hidden').click();
                    });
            });
            cy.get('#cvat_canvas_shape_1').should('be.hidden');
        });
        it('Unhide object by label name.', () => {
            cy.get('.cvat-objects-sidebar-labels-list').within(() => {
                cy.contains(labelName)
                    .parents('.cvat-objects-sidebar-label-item')
                    .within(() => {
                        cy.get('.cvat-label-item-button-hidden').click();
                    });
            });
            cy.get('#cvat_canvas_shape_1').should('be.visible');
        });
    });
});

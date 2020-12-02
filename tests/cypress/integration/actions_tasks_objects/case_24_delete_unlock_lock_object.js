// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Delete unlock/lock object', () => {
    const caseId = '24';

    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName: labelName,
        firstX: 100,
        firstY: 100,
        secondX: 300,
        secondY: 300,
    };

    function lockObject() {
        cy.get('div.cvat-objects-sidebar-state-item').within(() => {
            cy.get('.cvat-object-item-button-lock').click();
        });
    };

    function deleteObjectViaShortcut(shortcut) {
        cy.get('.cvat-canvas-container')
            .trigger('mousemove', createRectangleShape2Points.secondX - 10, createRectangleShape2Points.secondY - 10) // activate shape
            .get('body')
            .type(shortcut);
    };

    function deleteObjectViaGUI() {
        cy.get('div.cvat-objects-sidebar-state-item').within(() => {
            cy.get('i.ant-dropdown-trigger').click();
        });
        cy.get('ul.cvat-object-item-menu').within(() => {
            cy.contains('Remove').click();
        });
    };

    function confirmationToDelete() {
        cy.get('.ant-modal-confirm').within(() => {
            cy.contains('OK').click();
        });
    };

    function checkExistObject() {
        cy.get('rect.cvat_canvas_shape').should('not.exist');
        cy.get('div.cvat-objects-sidebar-state-item').should('not.exist');
    };

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Create and delete object via "Delete" shortcut', () => {
            cy.createRectangle(createRectangleShape2Points);
            deleteObjectViaShortcut('{del}');
            checkExistObject();
        });

        it('Create and delete object via GUI', () => {
            cy.createRectangle(createRectangleShape2Points);
            deleteObjectViaGUI();
            checkExistObject();
        });

        it('Create, lock and delete object via "Shift+Delete" shortcuts', () => {
            cy.createRectangle(createRectangleShape2Points);
            lockObject();
            deleteObjectViaShortcut('{shift}{del}');
            checkExistObject();
        });

        it('Create, lock and delete object via GUI', () => {
            cy.createRectangle(createRectangleShape2Points);
            lockObject();
            deleteObjectViaGUI();
            confirmationToDelete();
            checkExistObject();
        });
    });
});

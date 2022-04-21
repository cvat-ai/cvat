// Copyright (C) 2020-2021 Intel Corporation
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
        cy.get('.cvat-objects-sidebar-state-item').within(() => {
            cy.get('.cvat-object-item-button-lock').click();
        });
    }

    function deleteObjectViaShortcut(shortcut, stateLockObject) {
        if (stateLockObject == 'unlock') {
            cy.get('.cvat-canvas-container').within(() => {
                cy.get('.cvat_canvas_shape').trigger('mousemove').should('have.class', 'cvat_canvas_shape_activated');
            });
        }
        cy.get('body').type(shortcut);
    }

    function clickRemoveOnDropdownMenu() {
        cy.get('.cvat-object-item-menu').contains(new RegExp('^Remove$', 'g')).click({ force: true });
    }

    function deleteObjectViaGUIFromSidebar() {
        cy.get('.cvat-objects-sidebar-states-list').within(() => {
            cy.get('.cvat-objects-sidebar-state-item').within(() => {
                cy.get('span[aria-label="more"]').click();
            });
        });
        clickRemoveOnDropdownMenu();
    }

    function deleteObjectViaGUIFromObject() {
        cy.get('.cvat-canvas-container').within(() => {
            cy.get('.cvat_canvas_shape').trigger('mousemove').rightclick();
        });
        cy.get('.cvat-canvas-context-menu').within(() => {
            cy.get('.cvat-objects-sidebar-state-item').within(() => {
                cy.get('span[aria-label="more"]').click();
            });
        });
        clickRemoveOnDropdownMenu();
    }

    function actionOnConfirmWindow(textBuntton) {
        cy.get('.cvat-modal-confirm').within(() => {
            cy.contains(new RegExp(`^${textBuntton}$`, 'g')).click();
        });
    }

    function checkFailDeleteLockObject(shortcut) {
        deleteObjectViaShortcut(shortcut, 'lock');
        checkExistObject('exist');
        cy.get('.cvat-notification-notice-remove-object-failed').should('exist');
    }

    function checkExistObject(state) {
        cy.get('.cvat_canvas_shape').should(state);
        cy.get('.cvat-objects-sidebar-state-item').should(state);
    }

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Create and delete object via "Delete" shortcut', () => {
            cy.createRectangle(createRectangleShape2Points);
            deleteObjectViaShortcut('{del}', 'unlock');
            checkExistObject('not.exist');
        });

        it('Create and delete object via GUI from sidebar', () => {
            cy.createRectangle(createRectangleShape2Points);
            deleteObjectViaGUIFromSidebar();
            checkExistObject('not.exist');
        });

        it('Create, lock and delete object via "Shift+Delete" shortcuts', () => {
            cy.createRectangle(createRectangleShape2Points);
            lockObject();
            checkFailDeleteLockObject('{del}');
            deleteObjectViaShortcut('{shift}{del}', 'lock');
            checkExistObject('not.exist');
        });

        it('Create, lock and delete object via GUI from sidebar', () => {
            cy.createRectangle(createRectangleShape2Points);
            lockObject();
            deleteObjectViaGUIFromSidebar();
            actionOnConfirmWindow('OK');
            checkExistObject('not.exist');
        });

        it('Create, lock and cancel delete object via GUI from object', () => {
            cy.createRectangle(createRectangleShape2Points);
            lockObject();
            deleteObjectViaGUIFromObject();
            actionOnConfirmWindow('Cancel');
            checkExistObject('exist');
        });
    });
});

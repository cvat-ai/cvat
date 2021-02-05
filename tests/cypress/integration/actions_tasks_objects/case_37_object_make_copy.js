// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Object make a copy.', () => {
    const caseId = '37';
    const rectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName: labelName,
        firstX: 400,
        firstY: 100,
        secondX: 500,
        secondY: 200,
    };

    function checkObjectArrSize(expectedValue) {
        cy.get('.cvat_canvas_shape').then(($cvatCanvasShape) => {
            cy.get('.cvat-objects-sidebar-state-item').then(($cvatObjectsSidebarStateItem) => {
                expect($cvatCanvasShape.length).be.equal(expectedValue);
                expect($cvatObjectsSidebarStateItem.length).be.equal(expectedValue);
            });
        });
    }

    function compareObjectsAttr(object1, object2) {
        cy.get(object1).then(($cvatCanvasShape1) => {
            cy.get(object2).then(($cvatCanvasShape2) => {
                expect($cvatCanvasShape1.attr('stroke')).be.eq($cvatCanvasShape2.attr('stroke'));
                expect($cvatCanvasShape1.attr('fill')).be.eq($cvatCanvasShape2.attr('fill'));
            });
        });
    }

    function compareObjectsSidebarAttr(objectSidebar1, objectSidebar2) {
        cy.get(objectSidebar1).then(($cvatObjectsSidebarStateItem1) => {
            cy.get(objectSidebar2).then(($cvatObjectsSidebarStateItem2) => {
                expect($cvatObjectsSidebarStateItem1.attr('style')).be.eq($cvatObjectsSidebarStateItem2.attr('style'));
            });
        });
    }

    before(() => {
        cy.openTaskJob(taskName);
        cy.createRectangle(rectangleShape2Points);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Make a copy via sidebar.', () => {
            cy.get('#cvat-objects-sidebar-state-item-1').within(() => {
                cy.get('[aria-label="more"]').trigger('mouseover');
            });
            cy.get('.cvat-object-item-menu').within(() => {
                cy.contains('button', 'Make a copy').click();
            });
            cy.get('.cvat-canvas-container').click();
        });

        it('Object attributes are the same.', () => {
            checkObjectArrSize(2);
            compareObjectsAttr('#cvat_canvas_shape_1', '#cvat_canvas_shape_2');
            compareObjectsSidebarAttr('#cvat-objects-sidebar-state-item-1', '#cvat-objects-sidebar-state-item-2');
        });

        it('Make a copy via object context menu.', () => {
            cy.get('#cvat_canvas_shape_1')
                .trigger('mousemove')
                .should('have.class', 'cvat_canvas_shape_activated')
                .rightclick();
            cy.get('.cvat-canvas-context-menu').within(() => {
                cy.get('[aria-label="more"]').trigger('mouseover');
            });
            cy.get('.cvat-object-item-menu').contains('button', 'Make a copy').click({ force: true });
            cy.get('.cvat-canvas-container').click(500, 500);
            cy.get('.cvat-canvas-container').click(300, 500); //deactivate all objects and hide context menu
        });

        it('Attributes of objects 1 and 3 are the same.', () => {
            checkObjectArrSize(3);
            compareObjectsAttr('#cvat_canvas_shape_1', '#cvat_canvas_shape_3');
            compareObjectsSidebarAttr('#cvat-objects-sidebar-state-item-1', '#cvat-objects-sidebar-state-item-3');
        });
    });
});

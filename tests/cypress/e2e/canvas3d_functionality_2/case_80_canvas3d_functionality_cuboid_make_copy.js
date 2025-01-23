// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const_canvas3d';

context('Canvas 3D functionality. Make a copy.', () => {
    const caseId = '80';
    const secondLabel = 'car';
    const cuboidCreationParams = {
        objectType: 'Shape',
        labelName,
        x: 480,
        y: 160,
    };

    before(() => {
        cy.openTask(taskName);
        cy.addNewLabel({ name: secondLabel });
        cy.openJob();
        cy.wait(1000); // Waiting for the point cloud to display
        cy.create3DCuboid(cuboidCreationParams);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Change a label and make a copy via sidebar.', () => {
            cy.get('#cvat-objects-sidebar-state-item-1')
                .find('.cvat-objects-sidebar-state-item-label-selector')
                .type(`${secondLabel}{Enter}`);
            cy.get('#cvat-objects-sidebar-state-item-1')
                .find('.cvat-objects-sidebar-state-item-label-selector')
                .trigger('mouseout');
            cy.interactAnnotationObjectMenu('#cvat-objects-sidebar-state-item-1', 'Make a copy');
            cy.get('.cvat-canvas3d-perspective').trigger('mousemove', 480, 270);
            cy.get('.cvat-canvas3d-perspective').dblclick(480, 270);
            cy.get('#cvat-objects-sidebar-state-item-1')
                .invoke('attr', 'style')
                .then((bgColor) => {
                    cy.get('#cvat-objects-sidebar-state-item-2').should('have.attr', 'style').and('equal', bgColor);
                });
        });

        it('Make a copy via hot keys.', () => {
            cy.get('.cvat-canvas3d-perspective').trigger('mousemove', 480, 270);
            cy.get('.cvat-canvas3d-perspective').trigger('mousemove', 480, 270);
            cy.get('body').type('{Ctrl}c');
            cy.get('body').type('{Ctrl}v');
            cy.get('.cvat-canvas3d-perspective').trigger('mousemove', 430, 220);
            cy.get('.cvat-canvas3d-perspective').dblclick(430, 220);
            cy.get('.cvat-objects-sidebar-state-item').then((sideBarItems) => {
                expect(sideBarItems.length).to.be.equal(3);
            });
            cy.get('#cvat-objects-sidebar-state-item-2')
                .invoke('attr', 'style')
                .then((bgColor) => {
                    cy.get('#cvat-objects-sidebar-state-item-3').should('have.attr', 'style').and('equal', bgColor);
                });
        });

        it('Copy a cuboid to an another frame.', () => {
            cy.get('.cvat-canvas3d-perspective').trigger('mousemove', 480, 270);
            cy.get('.cvat-canvas3d-perspective').trigger('mousemove', 480, 270);
            cy.get('#cvat-objects-sidebar-state-item-2').should('have.class', 'cvat-objects-sidebar-state-active-item');
            cy.get('body').type('{Ctrl}c');
            cy.get('.cvat-player-next-button').click();
            cy.wait(1000);
            cy.get('body').type('{Ctrl}v');
            cy.get('.cvat-canvas3d-perspective').trigger('mousemove', 480, 270);
            cy.get('.cvat-canvas3d-perspective').dblclick(480, 270);
            cy.get('.cvat-objects-sidebar-state-item').then((sideBarItems) => {
                expect(sideBarItems.length).to.be.equal(1);
            });
        });
    });
});

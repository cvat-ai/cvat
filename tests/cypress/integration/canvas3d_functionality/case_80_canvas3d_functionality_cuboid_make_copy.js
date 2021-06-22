// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const_canvas3d';

context('Canvas 3D functionality. Make a copy.', () => {
    const caseId = '80';
    const secondLabel = 'car';
    const cuboidCreationParams = {
        labelName: labelName,
    };
    const keyCodeV = 86;
    const keyCodeC = 67;

    before(() => {
        cy.openTask(taskName)
        cy.addNewLabel(secondLabel);
        cy.openJob();
        cy.wait(1000); // Waiting for the point cloud to display
        cy.create3DCuboid(cuboidCreationParams);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Change a label and make a copy via sidebar.', () => {
            cy.get('#cvat-objects-sidebar-state-item-1')
                .find('.cvat-objects-sidebar-state-item-label-selector')
                .type(`${secondLabel}{Enter}`)
                .trigger('mouseout');
            cy.get('#cvat-objects-sidebar-state-item-1')
                .find('[aria-label="more"]')
                .click();
            cy.get('.ant-dropdown-menu').not('.ant-dropdown-menu-hidden').find('[aria-label="copy"]').click();
            cy.get('.cvat-canvas3d-perspective').trigger('mousemove', 300, 200).dblclick(300, 200);
            cy.get('#cvat-objects-sidebar-state-item-1').invoke('attr', 'style').then((bgColor) => {
                cy.get('#cvat-objects-sidebar-state-item-2').should('have.attr', 'style').and('equal', bgColor);
            });
        });

        it('Make a copy via hot keys.', () => {
            cy.get('.cvat-canvas3d-perspective').trigger('mousemove', 100, 200).trigger('mousemove', 300, 200);
            cy.get('body').type('{Ctrl}c').type('{Ctrl}v');
            cy.get('.cvat-canvas3d-perspective').trigger('mousemove', 350, 200).dblclick(350, 200);
            cy.get('.cvat-objects-sidebar-state-item').then((sideBarItems) => {
                expect(sideBarItems.length).to.be.equal(3);
            });
            cy.get('#cvat-objects-sidebar-state-item-2').invoke('attr', 'style').then((bgColor) => {
                cy.get('#cvat-objects-sidebar-state-item-3').should('have.attr', 'style').and('equal', bgColor);
            });
        });

        it('Make a copy via hot keys with "ctrl" holding.', () => {
            cy.get('.cvat-canvas3d-perspective').trigger('mousemove', 100, 200).trigger('mousemove', 300, 200);
            cy.get('body').type('{ctrl}', {release: false}); // Hold ctrl
            cy.get('body').trigger('keydown', {keyCode: keyCodeC, ctrlKey: true}).trigger('keyup'); // Copy a shape
            cy.get('body').trigger('keydown', {keyCode: keyCodeV, ctrlKey: true}).trigger('keyup');
            cy.get('.cvat-canvas3d-perspective').trigger('mousemove', 400, 200).dblclick(400, 200); // Paste the shape
            cy.get('.cvat-canvas3d-perspective').trigger('mousemove', 400, 300).dblclick(400, 300); // The shape is expected to be pasted again
            cy.get('body').type('{ctrl}'); // Ctrl key up
            cy.get('.cvat-objects-sidebar-state-item').then((sideBarItems) => {
                expect(sideBarItems.length).to.be.equal(5);
            });
        });
    });
});

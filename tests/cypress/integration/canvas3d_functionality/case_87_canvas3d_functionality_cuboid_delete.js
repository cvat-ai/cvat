// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const_canvas3d';

context('Canvas 3D functionality. Delete a cuboid.', () => {
    const caseId = '87';
    const cuboidCreationParams = {
        labelName: labelName,
    };

    before(() => {
        cy.openTask(taskName)
        cy.openJob();
        cy.create3DCuboid(cuboidCreationParams);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Delete a cuboid.', () => {
            cy.get('.cvat-canvas3d-perspective').trigger('mousemove', 300, 200).click(300, 200); // Deactivate the cuboid
            cy.get('#cvat-objects-sidebar-state-item-1').should('not.have.class', 'cvat-objects-sidebar-state-active-item');
            cy.get('.cvat-canvas3d-perspective').trigger('mousemove');
            cy.get('#cvat-objects-sidebar-state-item-1').should('have.class', 'cvat-objects-sidebar-state-active-item');
            cy.get('body').type('{Del}');
            cy.get('#cvat-objects-sidebar-state-item-1').should('not.exist');
        });
    });
});

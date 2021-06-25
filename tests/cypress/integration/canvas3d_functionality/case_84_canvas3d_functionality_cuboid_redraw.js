// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const_canvas3d';

context('Canvas 3D functionality. Redraw.', () => {
    const caseId = '84';
    const cuboidCreationParams = {
        labelName: labelName,
    };

    before(() => {
        cy.openTask(taskName)
        cy.openJob();
        cy.create3DCuboid(cuboidCreationParams);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Redraw a cuboid.', () => {
            cy.get('.cvat-canvas3d-perspective').trigger('mousemove');
            cy.get('body').type('{Shift}n');
            cy.get('.cvat-canvas3d-perspective').trigger('mousemove', 450, 250).dblclick(450, 250);
            cy.get('.cvat-objects-sidebar-state-item').then((sidebarStateItems) => {
                expect(sidebarStateItems.length).to.be.equal(1);
            });
        });
    });
});

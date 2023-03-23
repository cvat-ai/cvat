// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const_canvas3d';

context('Canvas 3D functionality. Cuboid context menu.', () => {
    const caseId = '79';
    const cuboidCreationParams = {
        objectType: 'Shape',
        labelName,
        x: 480,
        y: 160,
    };

    before(() => {
        cy.openTask(taskName);
        cy.openJob();
        cy.wait(1000); // Waiting for the point cloud to display
        cy.create3DCuboid(cuboidCreationParams);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Right click on the cuboid. Context menu should exist.', () => {
            cy.get('.cvat-canvas3d-perspective canvas').trigger('mousemove', 340, 310);
            cy.get('.cvat-canvas3d-perspective').rightclick(340, 310);
            cy.get('.cvat-canvas-context-menu').should('exist');
        });

        it('Right click outside the cuboid. Context menu should not exist.', () => {
            cy.get('.cvat-canvas3d-perspective').click(100, 100);
            cy.get('.cvat-canvas-context-menu').should('not.exist');
        });
    });
});

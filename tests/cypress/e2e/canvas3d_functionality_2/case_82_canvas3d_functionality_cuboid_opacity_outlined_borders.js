// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/* eslint-disable cypress/no-unnecessary-waiting */

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const_canvas3d';

context('Canvas 3D functionality. Opacity. Outlined borders.', () => {
    const caseId = '82';
    const cuboidCreationParams = {
        objectType: 'Shape',
        labelName,
        x: 500,
        y: 250,
    };

    before(() => {
        cy.openTask(taskName);
        cy.openJob();
        cy.wait(2000); // Waiting for the point cloud to display
        cy.create3DCuboid(cuboidCreationParams);
        cy.get('.cvat-canvas3d-perspective').trigger('mousemove');
        cy.get('.cvat-canvas3d-perspective').click(); // Deactivate the cuboiud
    });

    const getScene = (el) => el.scene.children[0];
    const getFirstChild = (el) => getScene(el).children[0];
    const getWireframe = (el) => getFirstChild(el).children[0];

    describe(`Testing case "${caseId}"`, () => {
        it('Change opacity to 100. To 0.', () => {
            cy.get('.cvat-appearance-opacity-slider').click('right');
            cy.get('.cvat-appearance-opacity-slider').find('[role="slider"]').should('have.attr', 'aria-valuenow', 100);
            cy.get('.cvat-canvas3d-perspective canvas').then(([el]) => {
                expect(getFirstChild(el).material.opacity).to.equal(1);
            });

            cy.get('.cvat-appearance-opacity-slider').click('left');
            cy.get('.cvat-appearance-opacity-slider').find('[role="slider"]').should('have.attr', 'aria-valuenow', 0);
            cy.get('.cvat-canvas3d-perspective canvas').then(([el]) => {
                expect(getFirstChild(el).material.opacity).to.equal(0);
            });

            cy.get('body').click();
        });

        it('Change selected opacity to 100. To 0.', () => {
            cy.get('.cvat-appearance-selected-opacity-slider').click('right');
            cy.get('.cvat-appearance-selected-opacity-slider').find('[role="slider"]').should('have.attr', 'aria-valuenow', 100);
            cy.get('body').click();
            cy.get('.cvat-canvas3d-perspective').trigger('mousemove');
            cy.get('.cvat-canvas3d-perspective').trigger('mousemove', 500, 250);
            cy.wait(1000); // Waiting for the cuboid activation

            cy.get('.cvat-canvas3d-perspective canvas').then(([el]) => {
                expect(el.scene.children[0].children[0].material.opacity).to.equal(1);
            });

            cy.get('.cvat-appearance-selected-opacity-slider').click('left');
            cy.get('.cvat-appearance-selected-opacity-slider').find('[role="slider"]').should('have.attr', 'aria-valuenow', 0);

            cy.get('.cvat-canvas3d-perspective canvas').then(([el]) => {
                expect(getFirstChild(el).material.opacity).to.equal(0);
            });
        });

        it('Enable/disable outlined borders.', () => {
            cy.get('.cvat-appearance-outlinded-borders-checkbox').find('[type="checkbox"]').check();
            cy.get('.cvat-appearance-outlinded-borders-checkbox').find('[type="checkbox"]').should('be.checked');
            cy.get('.cvat-appearance-outlined-borders-button').click();
            cy.get('.cvat-label-color-picker').should('exist').and('be.visible').within(() => {
                cy.get('div[title="#ff007c"]').click();
                cy.contains('Ok').click();
            });
            cy.get('.cvat-canvas3d-perspective canvas').then(([el]) => {
                expect({ ...getWireframe(el).material.color }).to.deep.equal({
                    isColor: true, r: 1, g: 0, b: 0.20155625378383743,
                });
            });

            cy.get('.cvat-appearance-outlinded-borders-checkbox').find('[type="checkbox"]').uncheck();
            cy.get('.cvat-appearance-outlinded-borders-checkbox').find('[type="checkbox"]').should('not.be.checked');
            cy.get('.cvat-canvas3d-perspective canvas').then(([el]) => {
                expect({ ...getWireframe(el).material.color }).to.deep.equal({ ...getFirstChild(el).material.color });
            });
        });
    });
});

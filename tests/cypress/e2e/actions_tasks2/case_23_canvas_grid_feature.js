// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';
import { generateString } from '../../support/utils';

context('Canvas grid feature', () => {
    const caseId = '23';
    const settingsGridSize = 50;
    const gridColor = 'Black';
    const gridOpacity = 80;

    before(() => {
        cy.openTaskJob(taskName);
        cy.get('.cvat-canvas-image-setups-trigger').click();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Set "Show grid" to true.', () => {
            cy.get('.cvat-image-setups-grid').click();
        });
        it('Set "Grid size" to 50.', () => {
            cy.get('.cvat-image-setups-grid-size-input').within(() => {
                cy.get('[role="spinbutton"]').clear();
                cy.get('[role="spinbutton"]').type(settingsGridSize);
            });
        });
        it('Set "Grid color" to black.', () => {
            cy.get('.cvat-image-setups-grid-color-input').click();
            cy.get('.ant-select-dropdown')
                .not('.ant-select-dropdown-hidden')
                .within(() => {
                    cy.get(`.ant-select-item-option[title="${gridColor}"]`).click();
                });
        });
        it('Set "Grid opacity" to 80%.', () => {
            cy.get('.cvat-image-setups-grid-opacity-input').within(() => {
                cy.get('[role="slider"]').type(generateString(20, 'leftarrow')); // Moving the slider to the left up to 80.
                cy.get('[role="slider"]').should('have.attr', 'aria-valuenow', gridOpacity);
            });
        });
        it('Canvas has grid drawn, it is black, cells are 50x50px and it has 80% opacity.', () => {
            cy.get('#cvat_canvas_grid')
                .should('be.visible') // expected <svg#cvat_canvas_grid> to be visible
                .within(() => {
                    cy.get('#cvat_canvas_grid_pattern')
                        .and('have.attr', 'width', settingsGridSize) // expected to have attribute width with the value '50'
                        .and('have.attr', 'height', settingsGridSize) // expected to have attribute height with the value '50'
                        .and(
                            'have.attr',
                            'style',
                            `stroke: ${gridColor.toLowerCase()}; opacity: ${gridOpacity / 100};`,
                        ); // expected to have attribute style with the value stroke: black; opacity: 0.8;
                });
        });
    });
});

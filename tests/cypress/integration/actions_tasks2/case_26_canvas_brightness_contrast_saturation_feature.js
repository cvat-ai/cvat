// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';
import { generateString } from '../../support/utils';

context('Canvas brightness/contrast/saturation feature', () => {
    const caseId = '26';
    const countActionMoveSlider = 10;
    const defaultValueInSidebar = 100;
    const expectedResultInSetting = defaultValueInSidebar + countActionMoveSlider;
    const classNameSliders = [
        '.cvat-image-setups-brightness',
        '.cvat-image-setups-contrast',
        '.cvat-image-setups-saturation',
    ];

    function checkStateValuesInBackground(expectedValue) {
        cy.get('#cvat_canvas_background')
            .should('have.attr', 'style')
            .and(
                'contain',
                `filter: brightness(${expectedValue}) contrast(${expectedValue}) saturate(${expectedValue})`,
            );
    }

    before(() => {
        cy.openTaskJob(taskName);
        cy.get('.cvat-canvas-image-setups-trigger').click();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Check apply of settings', () => {
            let stringAction = generateString(countActionMoveSlider, 'rightarrow');
            cy.get('.cvat-canvas-image-setups-content').within(() => {
                cy.wrap(classNameSliders).each(($el) => {
                    cy.wrap($el)
                        .get($el)
                        .within(() => {
                            cy.get('[role=slider]')
                                .type(stringAction)
                                .should('have.attr', 'aria-valuenow', expectedResultInSetting);
                        });
                });
            });
            const expectedResultInBackground = (defaultValueInSidebar + countActionMoveSlider) / 100;
            checkStateValuesInBackground(expectedResultInBackground);
        });

        it('Check reset of settings', () => {
            cy.get('.cvat-image-setups-reset-color-settings').find('button').click();
            const expectedResultInBackground = defaultValueInSidebar / 100;
            checkStateValuesInBackground(expectedResultInBackground);
        });
    });
});

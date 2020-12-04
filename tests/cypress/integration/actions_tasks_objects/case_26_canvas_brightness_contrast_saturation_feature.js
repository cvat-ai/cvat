// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Canvas brightness/contrast/saturation feature', () => {
    const caseId = '26';

    let countActionMoveSlider = 10;
    let defaultValueInSidebar = 100;
    let expectedResultInSetting = defaultValueInSidebar + countActionMoveSlider;

    let classNameSliders = [
        '.cvat-player-settings-brightness',
        '.cvat-player-settings-contrast',
        '.cvat-player-settings-saturation',
    ];

    function generateStringCountAction(countAction) {
        let stringAction = '';
        for (let i = 0; i < countAction; i++) {
            stringAction += '{rightarrow}';
        };
        return stringAction;
    };

    function checkStateValuesInBackground(expectedValue) {
        cy.get('canvas#cvat_canvas_background')
            .should('have.attr', 'style')
            .and('contain', `filter: brightness(${expectedValue}) contrast(${expectedValue}) saturate(${expectedValue})`);
    };

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Check apply of settings', () => {
            let stringAction = generateStringCountAction(countActionMoveSlider);
            cy.openSettings();
            cy.get('.ant-modal-content').within(() => {
                cy.contains('Player').click();
                cy.wrap(classNameSliders).each(($el) => {
                    cy.wrap($el).get($el).within(() => {
                        cy.get('[role=slider]')
                            .type(stringAction)
                            .should('have.attr', 'aria-valuenow', expectedResultInSetting);
                    });
                });
            });
            let expectedResultInBackground = (defaultValueInSidebar + countActionMoveSlider) / 100;
            checkStateValuesInBackground(expectedResultInBackground);
        });

        it('Check reset of settings', () => {
            cy.get('.cvat-player-reset-color-settings').click();
            let expectedResultInBackground = defaultValueInSidebar / 100;
            checkStateValuesInBackground(expectedResultInBackground);
        });
    });
});

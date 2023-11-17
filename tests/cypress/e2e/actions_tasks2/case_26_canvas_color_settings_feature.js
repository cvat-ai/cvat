// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';
import { generateString } from '../../support/utils';

context('Canvas color settings feature', () => {
    const caseId = '26';
    const countActionMoveSlider = 10;
    const defaultValueInSidebar = 100;
    const defaultValueInSetting = [
        defaultValueInSidebar,
        defaultValueInSidebar,
        defaultValueInSidebar,
    ];
    const expectedResultInSetting = [
        defaultValueInSidebar + countActionMoveSlider,
        defaultValueInSidebar + countActionMoveSlider,
        defaultValueInSidebar + countActionMoveSlider,
    ];
    const classNameSliders = [
        '.cvat-image-setups-brightness',
        '.cvat-image-setups-contrast',
        '.cvat-image-setups-saturation',
    ];

    const countActionMoveFilterSlider = 30;
    const defaultValueInSettingFilters = [
        1.0,
    ];
    const expectedResultInSettingFilters = [
        1.3,
    ];
    const filterSlidersClassNames = [
        '.cvat-image-setups-gamma',
    ];

    function checkStateValuesInBackground(expectedValue) {
        cy.get('#cvat_canvas_background')
            .should('have.attr', 'style')
            .and(
                'contain',
                `filter: brightness(${expectedValue}) contrast(${expectedValue}) saturate(${expectedValue})`,
            );
    }

    function applyStringAction(wrapper, slidersClassNames, action) {
        cy.get(wrapper).within(() => {
            cy.wrap(slidersClassNames).each(($el) => {
                cy.wrap($el)
                    .get($el)
                    .within(() => {
                        cy.get('[role=slider]').type(action);
                    });
            });
        });
        cy.get('.ant-tooltip').invoke('hide');
    }

    function checkSlidersValue(wrapper, slidersClassNames, expectedResult) {
        cy.get(wrapper).within(() => {
            cy.wrap(slidersClassNames).each(($el, index) => {
                cy.wrap($el)
                    .get($el)
                    .within(() => {
                        cy.get('[role=slider]')
                            .should('have.attr', 'aria-valuenow', expectedResult[index]);
                    });
            });
        });
    }

    before(() => {
        cy.openTaskJob(taskName);
        cy.get('.cvat-canvas-image-setups-trigger').click();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Check application of CSS filters', () => {
            const stringAction = generateString(countActionMoveSlider, 'rightarrow');
            applyStringAction(
                '.cvat-canvas-image-setups-content', classNameSliders, stringAction,
            );
            checkSlidersValue(
                '.cvat-canvas-image-setups-content', classNameSliders, expectedResultInSetting,
            );
            const expectedResultInBackground = (defaultValueInSidebar + countActionMoveSlider) / 100;
            checkStateValuesInBackground(expectedResultInBackground);
        });

        it('Check application of image processing filters', () => {
            const stringAction = generateString(countActionMoveFilterSlider, 'rightarrow');
            applyStringAction(
                '.cvat-image-setups-filters', filterSlidersClassNames, stringAction,
            );
            checkSlidersValue(
                '.cvat-image-setups-filters', filterSlidersClassNames, expectedResultInSettingFilters,
            );
            cy.get('.cvat-notification-notice-image-processing-error').should('not.exist');
        });

        it('Check reset of settings', () => {
            cy.get('.cvat-image-setups-reset-color-settings').find('button').click();
            const expectedResultInBackground = defaultValueInSidebar / 100;
            checkStateValuesInBackground(expectedResultInBackground);
            checkSlidersValue(
                '.cvat-canvas-image-setups-content', classNameSliders, defaultValueInSetting,
            );
            checkSlidersValue(
                '.cvat-image-setups-filters', filterSlidersClassNames, defaultValueInSettingFilters,
            );
        });

        it('Check persisting image filters across jobs', () => {
            const sliderAction = generateString(countActionMoveSlider, 'rightarrow');
            const filterAction = generateString(countActionMoveFilterSlider, 'rightarrow');
            applyStringAction(
                '.cvat-canvas-image-setups-content', classNameSliders, sliderAction,
            );
            applyStringAction(
                '.cvat-image-setups-filters', filterSlidersClassNames, filterAction,
            );
            cy.interactMenu('Open the task');
            cy.openJob(1);
            cy.get('.cvat-canvas-image-setups-trigger').click();
            checkSlidersValue(
                '.cvat-canvas-image-setups-content', classNameSliders, expectedResultInSetting,
            );
            checkSlidersValue(
                '.cvat-image-setups-filters', filterSlidersClassNames, expectedResultInSettingFilters,
            );
            cy.get('.cvat-notification-notice-image-processing-error').should('not.exist');
        });
    });
});

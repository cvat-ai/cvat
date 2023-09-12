// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';
import { generateString } from '../../support/utils';

context('Settings. Default number of points in polygon approximation.', () => {
    const caseId = '100';

    function testOpenSettingsWorkspace() {
        cy.document().then((doc) => {
            const settingsModal = Array.from(doc.querySelectorAll('.cvat-settings-modal'));
            if (settingsModal.length === 0) {
                cy.openSettings();
                cy.contains('[role="tab"]', 'Workspace').click();
            }
        });
    }

    function testCheckSliderAttrValuenow(expectedValue) {
        testOpenSettingsWorkspace();
        cy.get('.cvat-workspace-settings-approx-poly-threshold').find('[role="slider"]').then((slider) => {
            expect(slider.attr('aria-valuenow')).to.be.equal(expectedValue);
        });
    }

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Change the setting value for "Default number of points in polygon approximation".', () => {
            testOpenSettingsWorkspace();
            cy.get('.cvat-workspace-settings-approx-poly-threshold')
                .find('[role="slider"]')
                .type(generateString(4, 'rightarrow'));
            cy.get('.cvat-workspace-settings-approx-poly-threshold')
                .find('[role="slider"]')
                .then((slider) => {
                    const sliderAttrValueNow = slider.attr('aria-valuenow');
                    const sliderAttrValuemin = slider.attr('aria-valuemin');
                    const sliderAttrValuemax = slider.attr('aria-valuemax');
                    cy.saveSettings();
                    cy.closeNotification('.cvat-notification-notice-save-settings-success');
                    cy.reload();
                    testCheckSliderAttrValuenow(sliderAttrValueNow);
                    cy.contains('strong', 'less').click();
                    testCheckSliderAttrValuenow(sliderAttrValuemin);
                    cy.contains('strong', 'more').click();
                    testCheckSliderAttrValuenow(sliderAttrValuemax);
                });
        });
    });
});

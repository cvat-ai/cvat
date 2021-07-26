// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Settings. Default polygon approximation accuracy level.', () => {
    const caseId = '100';
    let sliderValueNow;

    function testCheckValue(expectedValue) {
        cy.document().then((doc) => {
            const settingsModal = Array.from(doc.querySelectorAll('.cvat-settings-modal'));
            if (settingsModal.length === 0) {
                cy.openSettings();
                cy.contains('[role="tab"]', 'Workspace').click();
            }
        });
        cy.get('.cvat-workspace-settings-approx-poly-threshold').find('[role="slider"]').then((slider) => {
            expect(slider.attr('aria-valuenow')).to.be.equal(expectedValue);
        });
    }

    function generateString(countPointsToMove) {
        let action = '';
        for (let i = 0; i < countPointsToMove; i++) {
            action += '{rightarrow}';
        }
        return action;
    }

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Change the settingd value for "Default polygon approximation accuracy level".', () => {
            cy.openSettings();
            cy.contains('[role="tab"]', 'Workspace').click();
            cy.get('.cvat-workspace-settings-approx-poly-threshold')
                .find('[role="slider"]')
                .type(generateString(4))
                .then((slider) => {
                    sliderValueNow = slider.attr('aria-valuenow');
                    cy.saveSettings();
                    cy.closeNotification('.cvat-notification-notice-save-settings-success');
                    cy.closeSettings();
                    cy.reload();
                    cy.closeModalUnsupportedPlatform(); // If the Firefox browser closes the modal window after reload
                    testCheckValue(sliderValueNow);
                    cy.contains('strong', 'less').click();
                    testCheckValue(slider.attr('aria-valuemin'));
                    cy.contains('strong', 'more').click();
                    testCheckValue(slider.attr('aria-valuemax'));
                });
        });
    });
});

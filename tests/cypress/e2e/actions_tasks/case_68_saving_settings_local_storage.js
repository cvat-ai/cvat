// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';
import { generateString } from '../../support/utils';

context('Saving setting to local storage.', () => {
    const caseId = '68';
    const defaultGammaValue = 1;
    const nbumps = 5;
    const step = 0.01;
    function bumpGamma(nsteps) {
        const gammaFilterClass = '.cvat-image-setups-gamma';
        const wrapper = '.cvat-image-setups-filters';
        const action = generateString(nsteps, 'rightarrow');
        cy.applyActionToSliders(wrapper, [gammaFilterClass], action);
    }
    function setUpGamma(nsteps) {
        cy.get('.cvat-canvas-image-setups-trigger').click();
        cy.contains('Reset color settings').click();
        bumpGamma(nsteps);
        cy.get('.cvat-canvas-image-setups-trigger').click();
    }
    function resetColorSettings() {
        cy.get('.cvat-canvas-image-setups-trigger').click();
        cy.contains('Reset color settings').click();
        cy.get('.cvat-canvas-image-setups-trigger').click();
    }

    function setupAndSaveSettings(check) {
        cy.openSettings();
        const method = check ? 'check' : 'uncheck';
        cy.contains('[role="tab"]', 'Player').click();
        cy.get('.cvat-player-settings-reset-zoom').find('[type="checkbox"]')[method]();
        cy.contains('[role="tab"]', 'Workspace').click();
        cy.get('.cvat-workspace-settings-show-interpolated').find('[type="checkbox"]')[method]();
        cy.get('.cvat-workspace-settings-show-text-always').find('[type="checkbox"]')[method]();
        cy.get('.cvat-workspace-settings-autoborders').find('[type="checkbox"]')[method]();
        cy.closeSettings();
        cy.window().then((window) => {
            const { localStorage } = window;
            cy.wrap(localStorage.getItem('clientSettings')).should('exist').and('not.be.null');
        });
    }

    function testCheckedSettings(checked = false) {
        cy.openSettings();
        cy.contains('[role="tab"]', 'Player').click();
        for (const ws of [
            '.cvat-player-settings-reset-zoom',
        ]) {
            if (checked) {
                cy.get(ws).find('[type="checkbox"]').should('be.checked');
            } else {
                cy.get(ws).find('[type="checkbox"]').should('not.be.checked');
            }
        }

        cy.contains('[role="tab"]', 'Workspace').click();
        for (const ws of [
            '.cvat-workspace-settings-show-interpolated',
            '.cvat-workspace-settings-show-text-always',
            '.cvat-workspace-settings-autoborders',
        ]) {
            if (checked) {
                cy.get(ws).find('[type="checkbox"]').should('be.checked');
            } else {
                cy.get(ws).find('[type="checkbox"]').should('not.be.checked');
            }
        }

        cy.closeSettings();
    }
    function testGammaSetting() {
        const expValue = defaultGammaValue + nbumps * step;
        cy.get('.cvat-canvas-image-setups-trigger').click();
        cy.get('.cvat-image-setups-gamma').within(() => {
            cy.get('[role=slider]').should('have.attr', 'aria-valuenow', expValue);
        });
        cy.get('.cvat-canvas-image-setups-trigger').click();
    }

    before(() => {
        cy.prepareUserSession();
        cy.openTaskJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Check some settings. Reload a page. The settings are saved.', () => {
            setUpGamma(nbumps);
            setupAndSaveSettings(true);
            cy.reload();
            testCheckedSettings(true);
            testGammaSetting();
            resetColorSettings();

            setupAndSaveSettings(false);
            cy.reload();
            testCheckedSettings(false);
        });
    });
});

// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const_canvas3d';

context('Canvas 3D functionality. Control button. Mouse interaction.', () => {
    const caseId = '63';
    const screenshotsPath =
        'cypress/screenshots/canvas3d_functionality_2/case_63_canvas3d_functionality_control_button_mouse_interaction.js';

    function testPerspectiveChangeOnButtonClick(
        button,
        expectedTooltipText,
        screenshotNameBefore,
        screenshotNameAfter,
        arrow,
    ) {
        cy.customScreenshot('.cvat-canvas3d-perspective', screenshotNameBefore);
        cy.wait(300);
        if (arrow) {
            cy.get(button).trigger('mouseover');
            cy.get(button).click();
        } else {
            cy.contains('button', new RegExp(`^${button}$`)).trigger('mouseover');
            cy.contains('button', new RegExp(`^${button}$`)).click();
        }
        cy.contains(expectedTooltipText).should('exist').and('be.visible'); // Check tooltip
        if (arrow) {
            cy.get(button).should('exist').click();
        } else {
            cy.contains('button', new RegExp(`^${button}$`)).click({ force: true });
        }
        if (arrow) {
            cy.get(button).trigger('mouseout');
        } else {
            cy.contains('button', new RegExp(`^${button}$`)).trigger('mouseout');
        }

        cy.customScreenshot('.cvat-canvas3d-perspective', screenshotNameAfter);
        cy.compareImagesAndCheckResult(
            `${screenshotsPath}/${screenshotNameBefore}.png`,
            `${screenshotsPath}/${screenshotNameAfter}.png`,
        );
    }

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Testing perspective visual regressions by clicking on the buttons with the mouse.', () => {
            testPerspectiveChangeOnButtonClick(
                '[aria-label="arrow-up"]',
                'Arrow Up',
                'before_click_uparrow',
                'after_click_uparrow',
                true,
            );
            testPerspectiveChangeOnButtonClick(
                '[aria-label="arrow-down"]',
                'Arrow Down',
                'before_click_bottomarrow',
                'after_click_bottomarrow',
                true,
            );
            testPerspectiveChangeOnButtonClick(
                '[aria-label="arrow-left"]',
                'Arrow Left',
                'before_click_leftarrow',
                'after_click_leftarrow',
                true,
            );
            testPerspectiveChangeOnButtonClick(
                '[aria-label="arrow-right"]',
                'Arrow Right',
                'before_click_rightarrow',
                'after_click_rightarrow',
                true,
            );
            testPerspectiveChangeOnButtonClick('U', 'Alt+U', 'before_click_move_up', 'after_click_move_up');
            testPerspectiveChangeOnButtonClick('O', 'Alt+O', 'before_click_move_down', 'after_click_move_down');
            testPerspectiveChangeOnButtonClick('I', 'Alt+I', 'before_click_zoom_in', 'after_click_zoom_in');
            testPerspectiveChangeOnButtonClick('K', 'Alt+K', 'before_click_zoom_out', 'after_click_zoom_out');
            testPerspectiveChangeOnButtonClick('J', 'Alt+J', 'before_click_move_left', 'after_click_move_left');
            testPerspectiveChangeOnButtonClick('L', 'Alt+L', 'before_click_move_right', 'after_click_move_right');
        });
    });
});

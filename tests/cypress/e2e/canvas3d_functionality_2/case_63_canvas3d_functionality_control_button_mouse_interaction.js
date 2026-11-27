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
    ) {
        cy.customScreenshot('.cvat-canvas3d-perspective', screenshotNameBefore);

        cy.wait(300);
        cy.get(button).trigger('mouseover');
        cy.get(button).click();
        cy.contains(expectedTooltipText).should('exist').and('be.visible'); // Check tooltip
        cy.get(button).should('exist').click({ force: true });
        cy.get(button).trigger('mouseout');

        cy.customScreenshot('.cvat-canvas3d-perspective', screenshotNameAfter);
        cy.compareImagesAndCheckResult(
            `${screenshotsPath}/${screenshotNameBefore}.png`,
            `${screenshotsPath}/${screenshotNameAfter}.png`,
        );
    }

    before(() => {
        cy.prepareUserSession();
        cy.openTaskJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Testing perspective visual regressions by clicking on the buttons with the mouse.', () => {
            testPerspectiveChangeOnButtonClick(
                '.cvat-canvas3d-rotation-icon-vertical-up',
                'Rotate camera up',
                'before_click_uparrow',
                'after_click_uparrow',
            );
            testPerspectiveChangeOnButtonClick(
                '.cvat-canvas3d-rotation-icon-vertical-down',
                'Rotate camera down',
                'before_click_bottomarrow',
                'after_click_bottomarrow',
            );
            testPerspectiveChangeOnButtonClick(
                '.cvat-canvas3d-rotation-icon-horizontal-left',
                'Rotate camera left',
                'before_click_leftarrow',
                'after_click_leftarrow',
            );
            testPerspectiveChangeOnButtonClick(
                '.cvat-canvas3d-rotation-icon-horizontal-right',
                'Rotate camera right',
                'before_click_rightarrow',
                'after_click_rightarrow',
            );
            testPerspectiveChangeOnButtonClick(
                '.cvat-canvas3d-perspective-move-up',
                'Move camera up',
                'before_click_move_up',
                'after_click_move_up',
            );
            testPerspectiveChangeOnButtonClick(
                '.cvat-canvas3d-perspective-move-down',
                'Move camera down',
                'before_click_move_down',
                'after_click_move_down',
            );
            testPerspectiveChangeOnButtonClick(
                '.cvat-canvas3d-perspective-zoom-in',
                'Zoom camera in',
                'before_click_zoom_in',
                'after_click_zoom_in',
            );
            testPerspectiveChangeOnButtonClick(
                '.cvat-canvas3d-perspective-zoom-out',
                'Zoom camera out',
                'before_click_zoom_out',
                'after_click_zoom_out',
            );
            testPerspectiveChangeOnButtonClick(
                '.cvat-canvas3d-perspective-move-left',
                'Move camera left',
                'before_click_move_left',
                'after_click_move_left',
            );
            testPerspectiveChangeOnButtonClick(
                '.cvat-canvas3d-perspective-move-right',
                'Move camera right',
                'before_click_move_right',
                'after_click_move_right',
            );
        });
    });
});

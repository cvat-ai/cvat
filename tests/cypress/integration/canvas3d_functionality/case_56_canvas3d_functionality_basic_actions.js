// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const_canvas3d';

context('Canvas 3D functionality. Basic actions.', () => {
    const caseId = '56';
    const screenshotsPath =
        'cypress/screenshots/canvas3d_functionality/case_56_canvas3d_functionality_basic_actions.js';

    function compareImages(imgBefore, imgAfter) {
        cy.compareImages(`${screenshotsPath}/${imgBefore}`, `${screenshotsPath}/${imgAfter}`).then((diffPercent) => {
            expect(diffPercent).to.be.gt(0);
        });
    }

    function checkFilenameWrapperText(expectedText) {
        cy.get('.cvat-player-filename-wrapper').should('contain.text', expectedText);
    }

    function pressKeyPerspectiveDirections(key, screenshotNameBefore, screenshotNameAfter) {
        cy.get('.cvat-canvas3d-perspective').trigger('mouseover').screenshot(screenshotNameBefore);
        cy.get('body').type(`{alt}${key}`).wait(300); //Wait to change point cloud position
        cy.get('.cvat-canvas3d-perspective').screenshot(screenshotNameAfter);
        compareImages(`${screenshotNameBefore}.png`, `${screenshotNameAfter}.png`);
    }

    function pressKeyArrowDirections(key, screenshotNameBefore, screenshotNameAfter) {
        cy.get('.cvat-canvas3d-perspective').trigger('mouseover').screenshot(screenshotNameBefore);
        cy.get('body').type(key).wait(300); //Wait to change point cloud position
        cy.get('.cvat-canvas3d-perspective').screenshot(screenshotNameAfter);
        compareImages(`${screenshotNameBefore}.png`, `${screenshotNameAfter}.png`);
    }

    function wheelDirection(element, deltaY, screenshotNameBefore, screenshotNameAfter) {
        cy.get(element)
            .screenshot(screenshotNameBefore)
            .trigger('wheel', { deltaY: deltaY })
            .wait(300) // Wait change points cloud perspective
            .screenshot(screenshotNameAfter);
        compareImages(`${screenshotNameBefore}.png`, `${screenshotNameAfter}.png`);
    }

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Check existing of elements.', () => {
            cy.get('.cvat-canvas3d-perspective')
                .should('exist')
                .and('be.visible')
                .within(() => {
                    cy.get('.cvat-canvas3d-perspective-arrow-directions')
                        .should('exist')
                        .and('be.visible')
                        .within(() => {
                            cy.get('[aria-label="arrow-up"]').should('exist').and('be.visible');
                            cy.get('[aria-label="arrow-left"]').should('exist').and('be.visible');
                            cy.get('[aria-label="arrow-down"]').should('exist').and('be.visible');
                            cy.get('[aria-label="arrow-right"]').should('exist').and('be.visible');
                        });
                    cy.get('.cvat-canvas3d-perspective-directions')
                        .should('exist')
                        .and('be.visible')
                        .within(() => {
                            cy.contains('button', 'U').should('exist').and('be.visible');
                            cy.contains('button', 'I').should('exist').and('be.visible');
                            cy.contains('button', 'O').should('exist').and('be.visible');
                            cy.contains('button', 'J').should('exist').and('be.visible');
                            cy.contains('button', 'K').should('exist').and('be.visible');
                            cy.contains('button', 'L').should('exist').and('be.visible');
                        });
                });
            cy.get('.cvat-canvas3d-topview').should('exist').and('be.visible');
            cy.get('.cvat-canvas3d-sideview').should('exist').and('be.visible');
            cy.get('.cvat-canvas3d-frontview').should('exist').and('be.visible');
            cy.get('.cvat-canvas-controls-sidebar')
                .should('exist')
                .and('be.visible')
                .within(() => {
                    cy.get('.cvat-move-control').should('exist').and('be.visible');
                    cy.get('.cvat-cursor-control').should('exist').and('be.visible');
                    cy.get('.cvat-draw-cuboid-control').should('exist').and('be.visible');
                    cy.get('[aria-label="camera"]').should('exist').and('be.visible');
                });
        });

        it('Check workspace selector.', () => {
            cy.get('.cvat-workspace-selector').should('contain.text', 'Standard 3D').click();
            cy.get('.cvat-workspace-selector-dropdown')
                .not('.ant-select-dropdown-hidden')
                .within(() => {
                    cy.get('[title="Standard 3D"]').should('have.class', 'ant-select-item-option-active');
                    for (const dropdownItems of [
                        '[title="Attribute annotation"]',
                        '[title="Tag annotation"]',
                        '[title="Review"]',
                    ]) {
                        cy.get(dropdownItems).should('have.class', 'ant-select-item-option-disabled');
                    }
                });
        });

        it('Interaction with the frame change buttons.', () => {
            cy.get('.cvat-player-last-button').click();
            cy.checkFrameNum(2);
            checkFilenameWrapperText('generated_pcd_5000_points.pcd');
            cy.get('.cvat-player-first-button').click();
            cy.checkFrameNum(0);
            checkFilenameWrapperText('generated_pcd_10000_points.pcd');
            cy.get('.cvat-player-forward-button').click();
            cy.checkFrameNum(2);
            checkFilenameWrapperText('generated_pcd_5000_points.pcd');
            cy.get('.cvat-player-backward-button').click();
            cy.checkFrameNum(0);
            checkFilenameWrapperText('generated_pcd_10000_points.pcd');
            cy.get('.cvat-player-next-button').click();
            cy.checkFrameNum(1);
            checkFilenameWrapperText('generated_pcd_1000_points.pcd');
            cy.get('.cvat-player-previous-button').click();
            cy.checkFrameNum(0);
            checkFilenameWrapperText('generated_pcd_10000_points.pcd');
            cy.get('.cvat-player-play-button').click();
            cy.checkFrameNum(2);
            checkFilenameWrapperText('generated_pcd_5000_points.pcd');
            cy.get('.cvat-player-first-button').click(); // Return to first frame
        });

        it('Testing perspective visual regressions.', () => {
            wheelDirection('.cvat-canvas3d-perspective', -1000, 'perspective_before_wheel', 'perspective_after_wheel');
            pressKeyPerspectiveDirections('u', 'before_press_altU', 'after_press_altU');
            pressKeyPerspectiveDirections('o', 'before_press_altO', 'after_press_altO');
            pressKeyPerspectiveDirections('i', 'before_press_altI', 'after_press_altI');
            pressKeyPerspectiveDirections('k', 'before_press_altK', 'after_press_altK');
            pressKeyPerspectiveDirections('j', 'before_press_altJ', 'after_press_altJ');
            pressKeyPerspectiveDirections('l', 'before_press_altL', 'after_press_altL');
            pressKeyArrowDirections('{uparrow}', 'before_press_uparrow', 'after_press_uparrow');
            pressKeyArrowDirections('{downarrow}', 'before_press_downarrow', 'after_press_downarrow');
            pressKeyArrowDirections('{leftarrow}', 'before_press_leftarrow', 'after_press_leftarrow');
            pressKeyArrowDirections('{rightarrow}', 'before_press_rightarrow', 'after_press_rightarrow');
        });

        it('Testing top/side/front views visual regressions.', () => {
            wheelDirection('.cvat-canvas3d-topview', -1000, 'topview_before_wheel', 'topview_after_wheel');
            wheelDirection('.cvat-canvas3d-sideview', -1000, 'sideview_before_wheel', 'sideview_after_wheel');
            wheelDirection('.cvat-canvas3d-frontview', -1000, 'frontview_before_wheel', 'frontview_after_wheel');
        });
    });
});

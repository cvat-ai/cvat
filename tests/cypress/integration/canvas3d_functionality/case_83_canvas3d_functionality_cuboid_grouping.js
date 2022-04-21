// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const_canvas3d';

context('Canvas 3D functionality. Grouping.', () => {
    const caseId = '83';
    const screenshotsPath = 'cypress/screenshots/canvas3d_functionality/case_83_canvas3d_functionality_cuboid_grouping.js';
    const firstCuboidCreationParams = {
        labelName: labelName,
        x: 480,
        y: 160,
    };
    const secondCuboidCreationParams = {
        labelName: labelName,
        x: 480,
        y: 270,
    };
    const thirdCuboidCreationParams = {
        labelName: labelName,
        x: 430,
        y: 220,
    };
    const fourthCuboidCreationParams = {
        labelName: labelName,
        x: 530,
        y: 220,
    };
    const yellowHex = 'fcbe03';
    const yellowRgb = '252, 190, 3';
    const shapeSidebarItemArray = ['#cvat-objects-sidebar-state-item-2', '#cvat-objects-sidebar-state-item-3'];
    let bgColorItem;

    function changeGroupColor(object, color) {
        cy.get(object).within(() => {
            cy.get('[aria-label="more"]').click();
        });
        cy.wait(300);
        cy.get('.ant-dropdown')
            .not('.ant-dropdown-hidden')
            .within(() => {
                cy.contains('Change group color').click();
            });
        cy.changeColorViaBadge(color);
    }

    before(() => {
        cy.openTask(taskName)
        cy.openJob();
        cy.wait(1000); // Waiting for the point cloud to display
        cy.create3DCuboid(firstCuboidCreationParams);
        cy.create3DCuboid(secondCuboidCreationParams);
        cy.create3DCuboid(thirdCuboidCreationParams);
        cy.create3DCuboid(fourthCuboidCreationParams);
        cy.customScreenshot('.cvat-canvas3d-perspective', 'canvas3d_perspective_cuboid_creation');
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Grouping two cuboids.', () => {
            cy.get('.cvat-group-control').click();
            cy.get('.cvat-canvas3d-perspective').trigger('mousemove', 480, 270).click(480, 270);
            cy.get('.cvat-canvas3d-perspective').trigger('mousemove', 430, 220).click(430, 220);
            cy.get('.cvat-group-control').click();
            cy.changeAppearance('Group');
            cy.get('#cvat-objects-sidebar-state-item-1').invoke('attr', 'style').then((bgColorItem1) => {
                cy.get('#cvat-objects-sidebar-state-item-4').invoke('attr', 'style').then((bgColorItem4) => {
                    expect(bgColorItem1).to.be.equal(bgColorItem4);
                    bgColorItem = bgColorItem1;
                });
                cy.get('#cvat-objects-sidebar-state-item-2').invoke('attr', 'style').then((bgColorItem2) => {
                    expect(bgColorItem1).not.be.equal(bgColorItem2);
                });
                cy.get('#cvat-objects-sidebar-state-item-3').invoke('attr', 'style').then((bgColorItem3) => {
                    expect(bgColorItem1).not.be.equal(bgColorItem3);
                });
            });
            cy.customScreenshot('.cvat-canvas3d-perspective', 'canvas3d_perspective_cuboid_grouping');
            cy.compareImagesAndCheckResult(
                `${screenshotsPath}/canvas3d_perspective_cuboid_creation.png`,
                `${screenshotsPath}/canvas3d_perspective_cuboid_grouping.png`,
            );
        });

        it('Change group color.', () => {
            changeGroupColor('#cvat-objects-sidebar-state-item-2', yellowHex);
            cy.get('.cvat-label-color-picker').should('be.hidden');
            for (const groupedSidebarItemShape of shapeSidebarItemArray) {
                cy.get(groupedSidebarItemShape)
                    .should('have.attr', 'style')
                    .and('contain', `background-color: rgba(${yellowRgb}`);
            }
            cy.customScreenshot('.cvat-canvas3d-perspective', 'canvas3d_perspective_change_group_color');
            cy.compareImagesAndCheckResult(
                `${screenshotsPath}/canvas3d_perspective_cuboid_grouping.png`,
                `${screenshotsPath}/canvas3d_perspective_change_group_color.png`,
            );
        });

        it('Reset group.', () => {
            cy.customScreenshot('.cvat-canvas3d-perspective', 'canvas3d_perspective_before_reset_group');
            cy.get('.cvat-group-control').click();
            cy.get('.cvat-canvas3d-perspective').trigger('mousemove', 480, 270).click(480, 270);
            cy.get('.cvat-canvas3d-perspective').trigger('mousemove', 430, 220).click(430, 220);
            cy.get('body').type('{Shift}g');
            cy.get('#cvat-objects-sidebar-state-item-2').invoke('attr', 'style').then((bgColorItem2) => {
                expect(bgColorItem).to.be.equal(bgColorItem2);
            });
            cy.get('#cvat-objects-sidebar-state-item-3').invoke('attr', 'style').then((bgColorItem3) => {
                expect(bgColorItem).to.be.equal(bgColorItem3);
            });
            cy.customScreenshot('.cvat-canvas3d-perspective', 'canvas3d_perspective_after_reset_group');
            cy.compareImagesAndCheckResult(
                `${screenshotsPath}/canvas3d_perspective_before_reset_group.png`,
                `${screenshotsPath}/canvas3d_perspective_after_reset_group.png`,
            );
        });
    });
});

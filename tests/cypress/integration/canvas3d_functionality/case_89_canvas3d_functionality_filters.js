// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const_canvas3d';

context('Canvas 3D functionality. Filters.', () => {
    const caseId = '89';
    const secondLabel = 'car'
    const screenshotsPath = 'cypress/screenshots/canvas3d_functionality/case_89_canvas3d_functionality_filters.js';
    const firstCuboidCreationParams = {
        labelName: labelName,
        x: 350,
        y: 250,
    };
    const secondCuboidCreationParams = {
        labelName: secondLabel,
        x: 450,
        y: 250,
    };

    before(() => {
        cy.openTask(taskName)
        cy.addNewLabel(secondLabel);
        cy.openJob();
        cy.wait(1000); // Waiting for the point cloud to display
        cy.create3DCuboid(firstCuboidCreationParams);
        cy.create3DCuboid(secondCuboidCreationParams);
        cy.customScreenshot('.cvat-canvas3d-perspective', 'canvas3d_perspective_after_add_cuboids');
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Set filter "label=points cloud"', () => {
            cy.addFiltersRule(0);
            cy.setFilter({
                groupIndex: 0,
                ruleIndex: 0,
                field: 'Label',
                operator: '==',
                value: labelName,
                submit: true,
            });
            cy.get('#cvat-objects-sidebar-state-item-1').should('exist');
            cy.get('#cvat-objects-sidebar-state-item-2').should('not.exist');
            cy.customScreenshot('.cvat-canvas3d-perspective', 'canvas3d_perspective_set_filter_label');
            cy.compareImagesAndCheckResult(
                `${screenshotsPath}/canvas3d_perspective_after_add_cuboids.png`,
                `${screenshotsPath}/canvas3d_perspective_set_filter_label.png`,
            );
            cy.clearFilters();
        });

        it('Set filter "ObjectID=2"', () => {
            cy.addFiltersRule(0);
            cy.setFilter({
                groupIndex: 0,
                ruleIndex: 0,
                field: 'ObjectID',
                operator: '==',
                value: '2',
                submit: true,
            });
            cy.get('#cvat-objects-sidebar-state-item-1').should('not.exist');
            cy.get('#cvat-objects-sidebar-state-item-2').should('exist');
            cy.customScreenshot('.cvat-canvas3d-perspective', 'canvas3d_perspective_set_filter_objectid');
            cy.compareImagesAndCheckResult(
                `${screenshotsPath}/canvas3d_perspective_set_filter_objectid.png`,
                `${screenshotsPath}/canvas3d_perspective_set_filter_label.png`,
            );
            cy.clearFilters();
        });
    });
});

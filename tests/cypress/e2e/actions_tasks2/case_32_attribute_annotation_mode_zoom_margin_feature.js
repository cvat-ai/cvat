// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Attribute annotation mode (AAM) zoom margin feature', () => {
    const caseId = '32';
    const rectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName,
        firstX: 100,
        firstY: 100,
        secondX: 150,
        secondY: 150,
    };

    function changeSettingsZoomMargin(valueZoomMargin) {
        cy.openSettings();
        cy.get('.cvat-settings-modal').within(() => {
            cy.contains('Workspace').click();
            cy.get('.cvat-workspace-settings-aam-zoom-margin').within(() => {
                cy.get('[role="spinbutton"]').clear();
                cy.get('[role="spinbutton"]').type(valueZoomMargin);
            });
        });
        cy.closeSettings();
    }

    before(() => {
        cy.openTaskJob(taskName);

        // create object and tag
        cy.createRectangle(rectangleShape2Points);
        cy.createTag(labelName);

        // go to AAM workspace
        cy.changeWorkspace('Attribute annotation');
        cy.changeLabelAAM(labelName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Change AAM zoom margin on workspace with rectangle', () => {
            cy.get('.cvat-attribute-annotation-sidebar-object-switcher-right').click();
            cy.get('.cvat-attribute-annotation-sidebar-object-switcher-left').click();
            cy.get('.cvat-attribute-annotation-sidebar-object-switcher').should('contain', `${labelName} 1 [1/2]`);
            cy.getScaleValue().then((scaleBeforeChangeZoomMargin) => {
                changeSettingsZoomMargin(150);
                cy.getScaleValue().then((scaleAfterChangeZoomMargin) => {
                    expect(scaleBeforeChangeZoomMargin).to.be.greaterThan(scaleAfterChangeZoomMargin);
                });
            });
        });

        it('Change AAM zoom margin on workspace with tag', () => {
            cy.get('.cvat-attribute-annotation-sidebar-object-switcher-right').click();
            cy.get('.cvat-attribute-annotation-sidebar-object-switcher').should('contain', `${labelName} 2 [2/2]`);
            cy.getScaleValue().then((scaleBeforeChangeZoomMargin) => {
                changeSettingsZoomMargin(200);
                cy.getScaleValue().then((scaleAfterChangeZoomMargin) => {
                    expect(scaleBeforeChangeZoomMargin).to.be.eq(scaleAfterChangeZoomMargin);
                });
            });
        });
    });
});

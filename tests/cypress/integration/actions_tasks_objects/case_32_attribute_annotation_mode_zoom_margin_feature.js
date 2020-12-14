// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Attribute annotation mode (AAM) zoom margin feature', () => {
    const caseId = '32';
    let scaleDefaultInAAM;
    let scaleDefaultInTA;
    const rectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName: labelName,
        firstX: 100,
        firstY: 100,
        secondX: 150,
        secondY: 150,
    };

    function changeSettingZoomMargin(valueZoomMargin) {
        cy.openSettings();
        cy.get('.cvat-settings-modal').within(() => {
            cy.contains('Workspace').click();
            cy.get('.cvat-workspace-settings-aam-zoom-margin').within(() => {
                cy.get('[role="spinbutton"]').clear().type(valueZoomMargin);
            });
        });
        cy.closeSettings();
    }

    before(() => {
        cy.openTaskJob(taskName);

        // create object and tag
        cy.createRectangle(rectangleShape2Points);
        cy.createTag(labelName);

        // go to AAM workspace and get scale default value
        cy.changeWorkspace('Attribute annotation');
        cy.getScaleValue().then((value) => {
            scaleDefaultInAAM = value;
        });

        // go to TA workspace and get scale default value
        cy.changeWorkspace('Tag annotation');
        cy.getScaleValue().then((value) => {
            scaleDefaultInTA = value;
        });
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Change AAM zoom margin on "Attribute annotation" workspace', () => {
            cy.changeWorkspace('Attribute annotation');
            changeSettingZoomMargin(150);
            cy.getScaleValue().then((value) => {
                expect(scaleDefaultInAAM).to.be.greaterThan(value);
            });
        });

        it('Change AAM zoom margin on "Tag annotation" workspace', () => {
            cy.changeWorkspace('Tag annotation');
            changeSettingZoomMargin(200);
            cy.getScaleValue().then((value) => {
                expect(scaleDefaultInTA).to.be.eq(value);
            });
        });
    });
});

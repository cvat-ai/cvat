// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Canvas color feature', () => {
    const caseId = '21';

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Go to settings', () => {
            cy.openSettings();
        });
        it('Change canvas background color. Color has been changed', () => {
            cy.get('.cvat-player-settings-canvas-background').within(() => {
                cy.get('button').click();
            });
            cy.get('.canvas-background-color-picker-popover')
                .find('div[title]')
                .then((colorPicker) => {
                    for (let i = 0; i < colorPicker.length; i++) {
                        cy.get(colorPicker[i])
                            .click()
                            .should('have.css', 'background-color')
                            .then((colorPickerBgValue) => {
                                cy.get('.cvat-canvas-container')
                                    .should('have.css', 'background-color')
                                    .then((canvasBgColor) => {
                                        //For each color change, compare the value with the css value background-color of .cvat-canvas-container
                                        expect(colorPickerBgValue).to.be.equal(canvasBgColor);
                                    });
                            });
                    }
                });
        });
    });
});

// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Reset zoom in tag annotation', () => {
    const issueId = '2174';
    let scaleBefore = 0;
    let scaleAfter = 0;

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing issue "${issueId}"`, () => {
        it('Uncheck reset zoom', () => {
            cy.openSettings();
            cy.get('.ant-modal-content').within(() => {
                cy.contains('Player').click();
                cy.get('.cvat-player-settings-reset-zoom-checkbox').within(() => {
                    cy.get('[type="checkbox"]').uncheck();
                });
            });
            cy.closeSettings();
        });

        it('Go to tag annotation', () => {
            cy.changeWorkspace('Tag annotation', labelName);
        });

        it('Change size background', () => {
            cy.get('.cvat-canvas-container').trigger('wheel', { deltaY: 5 });
        });

        it('Get scale from background', () => {
            cy.get('#cvat_canvas_background')
                .should('have.attr', 'style')
                .then(($styles) => {
                    scaleBefore = Number($styles.match(/scale\((\d\.\d+)\)/m)[1]);
                });
        });

        it('Check scale background on next frame', () => {
            cy.get('.cvat-player-next-button').click();
            cy.get('#cvat_canvas_background')
                .should('have.attr', 'style')
                .then(($styles) => {
                    scaleAfter = Number($styles.match(/scale\((\d\.\d+)\)/m)[1]);
                    cy.expect(scaleBefore).to.equal(scaleAfter);
                });
        });
    });
});

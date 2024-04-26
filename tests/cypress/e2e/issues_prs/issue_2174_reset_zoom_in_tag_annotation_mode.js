// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Reset zoom in tag annotation', () => {
    const issueId = '2174';
    let scaleFirstFrame = 0;
    let scaleSecondFrame = 0;
    let scaleDefault = 0;

    function scaleFrame() {
        cy.get('.cvat-canvas-container').trigger('wheel', { deltaY: 5 });
    }

    function changeCheckboxResetZoom(value) {
        cy.openSettings();
        cy.get('.ant-modal-content').within(() => {
            cy.contains('Player').click();
            cy.get('.cvat-player-settings-reset-zoom-checkbox').within(() => {
                if (value === 'check') {
                    cy.get('[type="checkbox"]').check();
                } else if (value === 'uncheck') {
                    cy.get('[type="checkbox"]').uncheck();
                }
            });
        });
        cy.closeSettings();
    }

    function checkFrameNum(frameNum) {
        cy.get('.cvat-player-frame-selector').within(() => {
            cy.get('input[role="spinbutton"]').should('have.value', frameNum);
        });
    }

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing issue "${issueId}"`, () => {
        it('Set "reset zoom" to true', () => {
            changeCheckboxResetZoom('check');
        });

        it('Go to tag annotation', () => {
            cy.changeWorkspace('Tag annotation');
        });

        it('Scale frame', () => {
            cy.getScaleValue().then((value) => {
                scaleDefault = value;
            });
            scaleFrame();
            cy.getScaleValue().then((value) => {
                scaleFirstFrame = value;
            });
        });

        it('Go to next frame and check reset scale on second frame', () => {
            cy.get('.cvat-player-next-button').click();
            checkFrameNum(1);
            cy.getScaleValue().then((value) => {
                scaleSecondFrame = value;
                expect(scaleFirstFrame).to.not.equal(scaleSecondFrame);
                expect(scaleDefault).to.equal(scaleSecondFrame);
            });
        });

        it('Set "reset zoom" to false', () => {
            changeCheckboxResetZoom('uncheck');
        });

        it('Scale frame', () => {
            scaleFrame();
            cy.getScaleValue().then((value) => {
                scaleSecondFrame = value;
            });
        });

        it('Go to previous frame and check save scale on first frame', () => {
            cy.get('.cvat-player-previous-button').click();
            checkFrameNum(0);
            cy.getScaleValue().then((value) => {
                scaleFirstFrame = value;
                expect(scaleSecondFrame).to.equal(scaleFirstFrame);
            });
        });
    });
});

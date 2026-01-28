// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, ClipboardCtx } from '../../support/const';

context('Copy frame filename in job', () => {
    const clipboard = new ClipboardCtx('.cvat-player-copy-frame-name-icon');

    before(() => {
        cy.prepareUserSession();
        cy.openTaskJob(taskName);
    });
    beforeEach(() => {
        clipboard.init();
    });
    describe('Open job, trigger events that change clipboard content', () => {
        function scrapeFrameFilename() {
            return cy.get('.cvat-player-filename-wrapper').invoke('text');
        }

        it('Check that frame filename can be copied to clipboard', () => {
            scrapeFrameFilename().then((fileName) => {
                clipboard.copy().should('equal', fileName);
            });
        });

        it('Check clipboard after switching frames', () => {
            cy.goToNextFrame(1);
            scrapeFrameFilename().then((fileName) => {
                clipboard.copy().should('equal', fileName);
            });
        });
    });
});

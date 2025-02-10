// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

Cypress.automation('remote:debugger:protocol', {
    command: 'Browser.grantPermissions',
    params: {
        permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
        origin: window.location.origin,
    },
});

context('Copy frame filename in job', () => {
    before(() => {
        cy.visit('/auth/login');
        cy.login();
        cy.openTaskJob(taskName);
    });
    beforeEach(() => {
        cy.window()
            .its('navigator.clipboard')
            .then((clipboard) => {
                cy.spy(clipboard, 'writeText').as('copyTextToClipboard');
            });
    });
    describe('Open job, trigger events that change clipboard content', () => {
        function scrapeFrameFilename() {
            return cy.get('.cvat-player-filename-wrapper').invoke('text');
        }

        function clipboard() {
            cy.get('.cvat-player-copy-frame-name-icon').click();
            return cy.get('@copyTextToClipboard').should('be.called')
                .then((stub) => {
                    const last = stub.args.length - 1;
                    return cy.wrap(stub.args[last][0]);
                });
        }

        it('Check that frame filename can be copied to clipboard', () => {
            scrapeFrameFilename().then((fileName) => {
                clipboard().should('equal', fileName);
            });
        });

        it('Check clipboard after switching frames', () => {
            cy.goToNextFrame(1);
            scrapeFrameFilename().then((fileName) => {
                clipboard().should('equal', fileName);
            });
        });

        it('Check clipboard after deleting frame, after Undo', () => {
            let oldName = '';
            scrapeFrameFilename().then((fileName) => {
                clipboard().should('equal', fileName);
                oldName = fileName;
            });

            cy.deleteFrame();

            scrapeFrameFilename().then((newFrameName) => {
                clipboard().should('equal', newFrameName);
            });
            cy.contains('.cvat-annotation-header-button', 'Undo').click({ force: true });
            cy.then(() => {
                clipboard().should('equal', oldName);
            });
            cy.saveJob();
        });
        it('Check clipboard after deleting and restoring frame', () => {
            cy.checkDeletedFrameVisibility();
            let oldName = '';
            scrapeFrameFilename().then((fileName) => {
                clipboard().should('equal', fileName);
                oldName = fileName;
            });
            cy.deleteFrame();
            cy.then(() => {
                clipboard().should('equal', oldName);
            });
            cy.deleteFrame('restore');
            cy.then(() => {
                clipboard().should('equal', oldName);
            });
        });
    });
});

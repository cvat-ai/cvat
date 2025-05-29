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
        function copyToclipboard() {
            cy.get('.cvat-player-copy-frame-name-icon').click();
            return cy.get('@copyTextToClipboard').should('be.called')
                .then((stub) => {
                    const last = stub.args.length - 1;
                    return cy.wrap(stub.args[last][0]);
                });
        }

        it('Check that frame filename can be copied to clipboard', () => {
            cy.getFrameFilename().then((fileName) => {
                copyToclipboard().should('equal', fileName);
            });
        });

        it('Check clipboard after switching frames', () => {
            cy.goToNextFrame(1);
            cy.getFrameFilename().then((fileName) => {
                copyToclipboard().should('equal', fileName);
            });
        });
    });
});

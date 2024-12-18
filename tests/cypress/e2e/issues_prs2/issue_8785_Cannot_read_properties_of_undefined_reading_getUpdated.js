// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('When saving after deleting a frame, job metadata is inconsistent.', () => {
    const issueId = '8785';

    before(() => {
        cy.openTaskJob(taskName);
        cy.goToNextFrame(4);
    });

    describe(`Testing issue ${issueId}`, () => {
        it('Crash on Save job. Save again.', () => {
            // cy.deleteFrame(); // FIXME: does normal saving with 200, better to just push a button
            function clickDelete() {
                cy.get('.cvat-player-delete-frame').click();
                cy.get('.cvat-modal-delete-frame').within(() => {
                    cy.contains('button', 'Delete').click();
                });
            }
            function clickSave() {
                cy.get('button').contains('Save').click({ force: true });
                cy.get('button').contains('Save').trigger('mouseout');
            }
            function middleware() {
                let calls = 0;
                const badResponseStub = { statusCode: 502, body: 'Network error' };
                function handle(req, res) {
                    if (calls === 0) {
                        console.log(calls);
                        calls++;
                        res.send(badResponseStub);
                    } else {
                        console.log(calls);
                        req.continue({ statusCode: 200, body: 'OK' });
                    }
                }
                return handle;
            }
            cy.intercept('PATCH', '/api/jobs/**/data/meta**', middleware()).as('patchMeta');
            clickDelete();
            clickSave();
            cy.contains('button', 'Restore').should('be.visible');
            cy.wait('@patchMeta').its('response.body').should('eq', 502);
            cy.wait('@patchMeta').its('response.body').should('eq', 200);

            // TODO: refactor saveJob with necessary status

            // Check that frame is deleted

            /**
             * FIXME: this just asserts 502
             *
             * Here you have an example job endpoint response stubbing
             * Response is then intercepted and stubbed with 502 status code
             *
             * flow is like this: press a button directly + intercept
             *
             * Cypress works worse with double intercepts
             * Intercepting saveJob not gonna work
             * since it already does an intercept of the same request
             *
             * */

            // Send bad PATCH
            cy.saveJob('PATCH', 502);

            // Send again
            cy.saveJob('PATCH', 200);
        });
    });
});

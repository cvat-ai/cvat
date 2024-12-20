// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('When saving after deleting a frame, job metadata is inconsistent.', () => {
    const issueId = '8785';

    function checkDeletedFrameVisibility() {
        cy.openSettings();
        cy.get('.cvat-workspace-settings-show-deleted').within(() => {
            cy.get('[type="checkbox"]').should('not.be.checked').check();
        });
        cy.closeSettings();
    }
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

    before(() => {
        checkDeletedFrameVisibility();
        cy.openTaskJob(taskName);
        cy.goToNextFrame(1);
    });

    describe(`Testing issue ${issueId}`, () => {
        it('Crash on Save job. Save again.', () => {
            const badResponse = { statusCode: 502, body: 'A horrible network error' };

            cy.on('uncaught:exception', (err) => {
                expect(err.message).to.include(badResponse.body);
                expect(err.code).to.equal(badResponse.statusCode);
                return false;
            });

            function createHandler() {
                let calls = 0;
                function handle(req) {
                    if (calls === 0) {
                        calls++;
                        req.continue((res) => {
                            res.send(badResponse);
                        });
                    } else {
                        req.continue();
                    }
                }
                return handle;
            }

            const routeMatcher = {
                url: '/api/jobs/**/data/meta**',
                method: 'PATCH',
                times: 1, // cancels the intercept
            };
            const routeHandler = createHandler();

            cy.intercept(routeMatcher, routeHandler).as('patchError');

            clickDelete();
            cy.get('.cvat-player-restore-frame').should('be.visible');

            clickSave();
            cy.wait('@patchError').its('response.statusCode').should('eq', badResponse.statusCode);

            cy.saveJob();
        });
    });
});

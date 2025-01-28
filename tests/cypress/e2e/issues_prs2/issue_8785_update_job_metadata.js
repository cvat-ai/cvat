// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('The UI remains stable even when the metadata request fails.', () => {
    const issueId = '8785';

    before(() => {
        cy.checkDeletedFrameVisibility();
        cy.openTaskJob(taskName);
        cy.goToNextFrame(1);
    });

    describe(`Testing issue ${issueId}`, () => {
        it('Crash on Save job. Save again.', () => {
            const badResponse = { statusCode: 502, body: 'A horrible network error' };

            cy.on('uncaught:exception', (err) => {
                expect(err.code).to.equal(badResponse.statusCode);
                expect(err.message).to.include(badResponse.body);
                return false;
            });

            const routeMatcher = {
                url: '/api/jobs/**/data/meta**',
                method: 'PATCH',
                times: 1, // cancels the intercept without retries
            };

            cy.intercept(routeMatcher, badResponse).as('patchError');

            cy.clickDeleteFrameAnnotationView();
            cy.get('.cvat-player-restore-frame').should('be.visible');

            cy.clickSaveAnnotationView();
            cy.wait('@patchError').then((intercept) => {
                expect(intercept.response.body).to.equal(badResponse.body);
                expect(intercept.response.statusCode).to.equal(badResponse.statusCode);
            });

            cy.saveJob('PATCH', 200);
        });
    });
});

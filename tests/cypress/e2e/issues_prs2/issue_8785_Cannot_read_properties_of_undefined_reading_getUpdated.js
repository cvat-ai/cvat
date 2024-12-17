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
            cy.deleteFrame(); // FIXME: does normal saving with 200, better to just push a button

            // Check that frame is deleted
            cy.contains('button', 'Restore').should('be.visible');

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

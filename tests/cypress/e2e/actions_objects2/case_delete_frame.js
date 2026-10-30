// Copyright (C) 2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Delete frame from job.', () => {
    let frame = null;

    function checkLeavingWithUnsavedFrames() {
        cy.location('pathname').then((jobPath) => {
            cy.window().then(($win) => {
                cy.stub($win, 'confirm').returns(false).as('confirmLeave');
            });

            cy.get('a[value="tasks"]').click();
            cy.get('@confirmLeave').should(
                'have.been.calledOnceWithExactly',
                'You have unsaved changes, please confirm leaving this page.',
            );
            cy.location('pathname').should('equal', jobPath);

            cy.intercept('PATCH', '/api/jobs/**/data/meta**').as('patchMeta');
            cy.saveJob();
            cy.wait('@patchMeta').its('response.statusCode').should('equal', 200);

            cy.goToTaskList();
            cy.location('pathname').should('equal', '/tasks');
            cy.get('@confirmLeave').should('have.been.calledOnce');
            cy.openTaskJob(taskName);
        });
    }

    before(() => {
        cy.prepareUserSession();
        cy.openTaskJob(taskName);
    });

    describe('Tests on th feature with deleting frames.', () => {
        it('Warn before leaving with an unsaved frame deletion, then save.', () => {
            cy.get('.cvat-player-frame-selector').within(() => {
                cy.get('[role="spinbutton"]')
                    .should('have.attr', 'aria-valuenow')
                    .then((valueFrameNow) => {
                        frame = Number(valueFrameNow);
                    });
            });
            cy.clickDeleteFrameAnnotationView();
            checkLeavingWithUnsavedFrames();
        });

        it('Check frame changed.', () => {
            cy.checkFrameNum(frame + 1);
        });

        it('Check previous frame unavailable.', () => {
            cy.get('.cvat-player-previous-button').click();
            cy.checkFrameNum(frame + 1);
        });

        it('Check open from non-deleted frame', () => {
            cy.visit('/tasks');
            cy.openTaskJob(taskName);
            cy.checkFrameNum(frame + 1);
        });

        it('Change deleted frame visibility.', () => {
            cy.checkDeletedFrameVisibility();
        });

        it('Check previous frame available and deleted.', () => {
            cy.get('.cvat-player-previous-button').click();
            cy.checkFrameNum(frame);
            cy.get('.cvat-player-restore-frame').should('be.visible');
        });

        it('Check open from deleted frame', () => {
            cy.goToTaskList();
            cy.openTaskJob(taskName);
            cy.checkFrameNum(frame);
            cy.get('.cvat-player-restore-frame').should('be.visible');
        });

        it('Warn before leaving with an unsaved frame restoration, then save.', () => {
            cy.get('.cvat-player-restore-frame').click();
            checkLeavingWithUnsavedFrames();
            cy.checkFrameNum(frame);
            cy.get('.cvat-player-restore-frame').should('not.exist');
        });

        it('Do not warn after deleting and restoring a frame without saving.', () => {
            cy.window().then(($win) => {
                cy.stub($win, 'confirm').returns(false).as('confirmLeave');
            });

            cy.clickDeleteFrameAnnotationView();
            cy.goCheckFrameNumber(frame);
            cy.get('.cvat-player-restore-frame').click();
            cy.get('.cvat-player-restore-frame').should('not.exist');

            cy.goToTaskList();
            cy.location('pathname').should('equal', '/tasks');
            cy.get('@confirmLeave').should('not.have.been.called');
        });
    });
});

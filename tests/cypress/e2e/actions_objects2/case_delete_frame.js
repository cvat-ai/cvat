// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Delete frame from job.', () => {
    let frame;

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe('Tests on th feature with deleting frames.', () => {
        it('Delete frame.', () => {
            cy.get('.cvat-player-frame-selector').within(() => {
                cy.get('[role="spinbutton"]')
                    .should('have.attr', 'aria-valuenow')
                    .then((valueFrameNow) => {
                        frame = Number(valueFrameNow);
                    });
            });
            cy.deleteFrame();
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

        it('Restore frame.', () => {
            cy.deleteFrame('restore');
            cy.checkFrameNum(frame);
            cy.get('.cvat-player-restore-frame').should('not.exist');
        });
    });
});

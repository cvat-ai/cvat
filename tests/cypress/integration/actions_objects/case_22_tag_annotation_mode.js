// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Tag annotation mode.', () => {
    const caseId = '22';

    function checkCountFrameTags(countTags) {
        if (countTags == 0) {
            cy.get('span.cvat-tag-annotation-sidebar-frame-tag-label').should('not.exist');
        } else {
            cy.get('span.cvat-tag-annotation-sidebar-frame-tag-label').should('have.length', countTags);
        }
    }

    function checkPresenceFrameTags() {
        cy.get('.cvat-tag-annotation-sidebar-frame-tags').within(() => {
            cy.get('.cvat-tag-annotation-sidebar-frame-tag-label').should('exist');
        });
    }

    function addTag() {
        cy.get('.cvat-tag-annotation-sidebar-buttons').contains('Add tag').click();
    }

    function skipFrame() {
        cy.get('.cvat-tag-annotation-sidebar-buttons').contains('Skip frame').click();
    }

    function changeCheckboxAutomaticallyGoToNextFrame(value) {
        cy.get('.cvat-tag-annotation-sidebar-checkbox-skip-frame').within(() => {
            if (value == 'check') {
                cy.get('[type="checkbox"]').check();
            } else if (value == 'uncheck') {
                cy.get('[type="checkbox"]').uncheck();
            }
        });
    }

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Go to tag annotation', () => {
            cy.changeWorkspace('Tag annotation', labelName);
            checkCountFrameTags(0);
        });

        it('Skip frame', () => {
            skipFrame();
            cy.checkFrameNum(1);
            checkCountFrameTags(0);
            cy.goToPreviousFrame(0);
            checkCountFrameTags(0);
        });

        it('Add tag', () => {
            addTag();
            checkCountFrameTags(1);
            checkPresenceFrameTags();
        });

        it('Set "Automatically go to the next frame" to true and add tag', () => {
            cy.goToNextFrame(1);
            checkCountFrameTags(0);
            changeCheckboxAutomaticallyGoToNextFrame('check');
            addTag();
            cy.checkFrameNum(2);
            checkCountFrameTags(0);
            cy.goToPreviousFrame(1);
            checkCountFrameTags(1);
            checkPresenceFrameTags();
        });
    });
});

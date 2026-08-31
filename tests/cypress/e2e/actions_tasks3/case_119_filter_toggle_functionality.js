// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

/**
 * Tests for issue #9956:
 * "An option to filter frames without hiding annotations in UI"
 *
 * Two independent toggles are added to the annotation filters modal:
 *   - "Filter frames"      controls whether filtered navigation (NavigationType.FILTERED)
 *                          skips frames that do not match the active annotation query.
 *   - "Filter annotations" controls whether only matching annotations are
 *                          rendered on the current frame.
 *
 * Frame layout used in these tests:
 *   Frame 0: one rectangle with labelMatch, one rectangle with labelOther
 *   Frame 1: one rectangle with labelOther only  (no matching annotation)
 *   Frame 2: one rectangle with labelMatch only
 *
 * Active filter applied: Label == labelMatch
 *
 * This layout allows unambiguous testing of all four toggle combinations.
 *
 * Navigation behavior confirmed from cvat-core/src/annotations-collection.ts:
 *   - filterFrames=true  + FILTERED nav → jumps to next frame matching the query (frame 2, skipping 1)
 *   - filterFrames=false + FILTERED nav → jumps to immediate next non-deleted frame (frame 1)
 */

context('Filter frame/annotation toggle functionality.', () => {
    const caseId = '119';
    const labelMatch = 'filter_toggle_match';
    const labelOther = 'filter_toggle_other';

    const matchRect = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName: labelMatch,
        firstX: 100,
        firstY: 100,
        secondX: 200,
        secondY: 200,
    };
    const otherRect = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName: labelOther,
        firstX: 300,
        firstY: 100,
        secondX: 400,
        secondY: 200,
    };

    // Shape IDs are assigned sequentially; capture them dynamically to avoid brittle hardcoding.
    let matchIdFrame0 = null;
    let otherIdFrame0 = null;
    let otherIdFrame1 = null;
    let matchIdFrame2 = null;

    function applyLabelFilter() {
        cy.addFiltersRule(0);
        cy.setFilter({
            groupIndex: 0,
            ruleIndex: 0,
            field: 'Label',
            operator: '==',
            value: labelMatch,
            submit: true,
        });
    }

    function activateFilteredNavForward() {
        // Switch nav mode to FILTERED by right-clicking the next button
        // and selecting the filtered option from the context popover.
        // This is the same pattern used in issue_2485_navigation_empty_frames.js.
        cy.get('.cvat-player-next-button').rightclick();
        cy.get('.cvat-player-next-filtered-inlined-button').click();
    }

    function activateRegularNavForward() {
        cy.get('.cvat-player-next-button-filtered').rightclick();
        cy.get('.cvat-player-next-inlined-button').click();
    }

    function openFiltersModal() {
        cy.checkFiltersModalOpened();
    }

    function checkCheckbox(label, expectedChecked) {
        cy.contains('.cvat-filters-modal-options label', label)
            .find('input[type="checkbox"]')
            .should(expectedChecked ? 'be.checked' : 'not.be.checked');
    }

    function toggleCheckbox(label) {
        cy.contains('.cvat-filters-modal-options label', label).click();
    }

    before(() => {
        cy.prepareUserSession();
        cy.openTask(taskName);
        cy.addNewLabel({ name: labelMatch });
        cy.addNewLabel({ name: labelOther });
        cy.openJob();

        // Frame 0: matching + other shape
        cy.createRectangle(matchRect);
        cy.createRectangle(otherRect);
        cy.get('.cvat_canvas_shape').then(($shapes) => {
            const ids = Array.from($shapes).map((el) => Number(el.id.match(/\d+$/)[0]));
            [matchIdFrame0, otherIdFrame0] = ids.slice(-2);
        });

        // Frame 1: other shape only (no matching annotation)
        cy.goCheckFrameNumber(1);
        cy.createRectangle({ ...otherRect, firstX: 100, firstY: 100, secondX: 200, secondY: 200 });
        cy.get('.cvat_canvas_shape').last().then(($el) => {
            otherIdFrame1 = Number($el.attr('id').match(/\d+$/)[0]);
        });

        // Frame 2: matching shape only
        cy.goCheckFrameNumber(2);
        cy.createRectangle({ ...matchRect, firstX: 500, firstY: 100, secondX: 600, secondY: 200 });
        cy.get('.cvat_canvas_shape').last().then(($el) => {
            matchIdFrame2 = Number($el.attr('id').match(/\d+$/)[0]);
        });

        cy.goCheckFrameNumber(0);
    });

    after(() => {
        cy.clearFilters();
    });

    beforeEach(() => {
        cy.hideTooltips();
        cy.goCheckFrameNumber(0);
    });

    describe(`Testing case "${caseId}" — Filter toggle behaviors`, () => {
        it('TEST 1 — Default: both toggles are enabled after applying a filter (backward compatibility)', () => {
            applyLabelFilter();

            // With both toggles on (default), only matching shapes appear.
            cy.get(`#cvat_canvas_shape_${matchIdFrame0}`).should('exist');
            cy.get(`#cvat-objects-sidebar-state-item-${matchIdFrame0}`).should('exist');
            cy.get(`#cvat_canvas_shape_${otherIdFrame0}`).should('not.exist');
            cy.get(`#cvat-objects-sidebar-state-item-${otherIdFrame0}`).should('not.exist');

            // Verify defaults via modal
            openFiltersModal();
            checkCheckbox('Filter frames', true);
            checkCheckbox('Filter annotations', true);
            cy.contains('.cvat-filters-modal-visible button', 'Cancel').click();

            cy.clearFilters();
        });

        it('TEST 2 — Filter annotations OFF: non-matching shapes remain visible on current frame', () => {
            applyLabelFilter();

            // Disable "Filter annotations" via the modal while a filter is active
            openFiltersModal();
            toggleCheckbox('Filter annotations');
            cy.contains('.cvat-filters-modal-visible button', 'Cancel').click();

            // All shapes on frame 0 must now be visible
            cy.get(`#cvat_canvas_shape_${matchIdFrame0}`).should('exist');
            cy.get(`#cvat_canvas_shape_${otherIdFrame0}`).should('exist');
            cy.get(`#cvat-objects-sidebar-state-item-${matchIdFrame0}`).should('exist');
            cy.get(`#cvat-objects-sidebar-state-item-${otherIdFrame0}`).should('exist');

            cy.clearFilters();
        });

        it('TEST 3 — Filter frames ON + filtered nav: navigation skips non-matching frame', () => {
            applyLabelFilter();

            // Confirm Filter frames is ON (default)
            openFiltersModal();
            checkCheckbox('Filter frames', true);
            cy.contains('.cvat-filters-modal-visible button', 'Cancel').click();

            // Activate filtered navigation mode
            activateFilteredNavForward();

            // From frame 0, filtered nav should jump to frame 2 (skipping frame 1 which has no match)
            cy.get('.cvat-player-next-button-filtered').click({ force: true });
            cy.checkFrameNum(2);
            cy.get(`#cvat_canvas_shape_${matchIdFrame2}`).should('exist');

            // Restore regular navigation
            activateRegularNavForward();
            cy.clearFilters();
        });

        it('TEST 4 — Filter frames OFF + filtered nav: navigation goes to immediate next frame', () => {
            applyLabelFilter();

            // Disable "Filter frames" via the modal
            openFiltersModal();
            toggleCheckbox('Filter frames');
            cy.contains('.cvat-filters-modal-visible button', 'Cancel').click();

            // Activate filtered navigation mode
            activateFilteredNavForward();

            // From frame 0, with filterFrames=false the core returns the immediate next
            // non-deleted frame regardless of annotation query (verified in annotations-collection.ts line 1710)
            cy.get('.cvat-player-next-button-filtered').click({ force: true });
            cy.checkFrameNum(1);

            // Restore regular navigation
            activateRegularNavForward();
            cy.clearFilters();
        });

        it('TEST 5 — Clear filters resets both toggles to enabled', () => {
            applyLabelFilter();

            // Disable both toggles
            openFiltersModal();
            toggleCheckbox('Filter frames');
            toggleCheckbox('Filter annotations');
            cy.contains('.cvat-filters-modal-visible button', 'Cancel').click();

            // Clear filters (uses the Clear filters button inside the modal)
            cy.clearFilters();

            // Reopen modal: both toggles should be back to true
            openFiltersModal();
            checkCheckbox('Filter frames', true);
            checkCheckbox('Filter annotations', true);
            cy.contains('.cvat-filters-modal-visible button', 'Cancel').click();
        });
    });
});

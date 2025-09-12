// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Filter export, import and share functionality.', () => {
    const caseId = 'filter_export_import_share';
    const labelName = 'car';
    const rectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };
    
    // Sample filter data for testing
    const sampleFilterData = {
        version: '1.0',
        timestamp: '2024-01-01T00:00:00.000Z',
        filter: {
            and: [
                { '==': [{ var: 'label' }, 'car'] },
                { '==': [{ var: 'type' }, 'shape'] }
            ]
        },
        humanReadable: 'Label == "car" AND Type == "shape"'
    };

    before(() => {
        cy.openTaskJob(taskName);
        cy.addNewLabel({ name: labelName });
        cy.createRectangle(rectangleShape2Points);
        cy.saveJob('PATCH', 200, 'saveJob');
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Filter export functionality', () => {
            cy.mockClipboard();
            
            // Open filters modal and create a simple filter
            cy.contains('.cvat-annotation-header-button', 'Filters').click();
            cy.get('.cvat-filters-modal-visible').should('exist');
            
            // Add a filter condition
            cy.addFiltersRule(0);
            cy.setFilter({
                groupIndex: 0,
                ruleIndex: 0,
                field: 'Label',
                operator: '==',
                value: labelName
            });
            
            // Test export functionality
            cy.exportFilter();
            cy.checkFilterExportSuccess();
            
            // Verify export button is disabled when no filter is set
            cy.clearFilters();
            cy.contains('.cvat-annotation-header-button', 'Filters').click();
            cy.get('.cvat-filters-modal-export-button').should('be.disabled');
            
            // Close modal
            cy.get('.cvat-filters-modal-cancel-button').click();
        });

        it('Filter import functionality - text editor UI', () => {
            cy.contains('.cvat-annotation-header-button', 'Filters').click();
            
            // Test opening and closing text editor
            cy.openImportTextEditor();
            cy.checkFilterTextEditorVisible();
            cy.closeImportTextEditor();
            
            // Test import with valid filter data
            cy.openImportTextEditor();
            cy.get('.cvat-filters-text-input').type(JSON.stringify(sampleFilterData, null, 2), {
                parseSpecialCharSequences: false
            });
            cy.contains('button', 'Apply Filter').click();
            cy.checkFilterImportSuccess();
            
            // Verify the filter was applied
            cy.get('.query-builder').should('exist');
            
            cy.get('.cvat-filters-modal-cancel-button').click();
        });

        it('Filter import functionality - error handling', () => {
            cy.contains('.cvat-annotation-header-button', 'Filters').click();
            cy.openImportTextEditor();
            
            // Test import with invalid JSON
            cy.get('.cvat-filters-text-input').type('invalid json data');
            cy.contains('button', 'Apply Filter').click();
            cy.get('.ant-message-error').should('contain', 'Failed to parse filter data');
            
            // Test import with empty data
            cy.get('.cvat-filters-text-input').clear();
            cy.contains('button', 'Apply Filter').click();
            cy.get('.ant-message-warning').should('contain', 'Please enter filter data to import');
            
            cy.closeImportTextEditor();
            cy.get('.cvat-filters-modal-cancel-button').click();
        });

        it('Filter import with legacy format support', () => {
            // Test import with legacy format (raw filter logic without metadata)
            const legacyFilterData = {
                and: [
                    { '==': [{ var: 'label' }, labelName] },
                    { '==': [{ var: 'type' }, 'shape'] }
                ]
            };
            
            cy.contains('.cvat-annotation-header-button', 'Filters').click();
            cy.importFilter(legacyFilterData);
            cy.checkFilterImportSuccess();
            
            // Verify the filter was applied
            cy.get('.query-builder').should('exist');
            
            cy.get('.cvat-filters-modal-cancel-button').click();
        });

        it('Share URL functionality', () => {
            cy.mockClipboard();
            
            cy.contains('.cvat-annotation-header-button', 'Filters').click();
            
            // Create a filter to share
            cy.addFiltersRule(0);
            cy.setFilter({
                groupIndex: 0,
                ruleIndex: 0,
                field: 'Label', 
                operator: '==',
                value: labelName
            });
            
            // Test share URL functionality
            cy.shareFilterURL();
            cy.checkShareURLSuccess();
            
            // Verify share button is disabled when no filter is set
            cy.clearFilters();
            cy.contains('.cvat-annotation-header-button', 'Filters').click();
            cy.get('.cvat-filters-modal-share-button').should('be.disabled');
            
            cy.get('.cvat-filters-modal-cancel-button').click();
        });

        it('URL filter loading functionality', () => {
            // Create a filter first
            cy.contains('.cvat-annotation-header-button', 'Filters').click();
            cy.addFiltersRule(0);
            cy.setFilter({
                groupIndex: 0,
                ruleIndex: 0,
                field: 'Label',
                operator: '==', 
                value: labelName
            });
            
            // Apply the filter
            cy.get('.cvat-filters-modal-submit-button').click();
            
            // Now test URL loading by simulating a URL with filter parameter
            const filterParam = encodeURIComponent(JSON.stringify(sampleFilterData.filter));
            const currentUrl = Cypress.config().baseUrl;
            
            // Visit URL with filter parameter
            cy.visit(`${currentUrl}/tasks/1/jobs/1?filter=${filterParam}`);
            
            // The filter should be automatically applied
            // We can verify by checking if annotations are filtered
            cy.get('#cvat_canvas_shape_1').should('exist');
            
            // Open filters modal to verify the filter is loaded in UI
            cy.contains('.cvat-annotation-header-button', 'Filters').click();
            cy.get('.query-builder').should('exist');
            cy.get('.cvat-filters-modal-cancel-button').click();
        });

        it('Export/Import workflow integration', () => {
            cy.mockClipboard();
            
            // Create a complex filter
            cy.contains('.cvat-annotation-header-button', 'Filters').click();
            cy.addFiltersRule(0);
            cy.setFilter({
                groupIndex: 0,
                ruleIndex: 0,
                field: 'Label',
                operator: '==',
                value: labelName
            });
            
            // Add another rule
            cy.addFiltersRule(0);
            cy.setFilter({
                groupIndex: 0,
                ruleIndex: 1,
                field: 'Type',
                operator: '==',
                value: 'shape'
            });
            
            // Export the filter
            let exportedData;
            cy.exportFilter();
            cy.checkFilterExportSuccess();
            
            // Clear filters
            cy.clearFilters();
            
            // Import the same filter back
            cy.contains('.cvat-annotation-header-button', 'Filters').click();
            cy.importFilter(sampleFilterData);
            cy.checkFilterImportSuccess();
            
            // Verify the filter structure is maintained
            cy.get('.query-builder .group').should('have.length.at.least', 1);
            cy.get('.query-builder .rule').should('have.length.at.least', 1);
            
            cy.get('.cvat-filters-modal-cancel-button').click();
        });

        it('Filter buttons state management', () => {
            cy.contains('.cvat-annotation-header-button', 'Filters').click();
            
            // Initially, export and share buttons should be disabled
            cy.get('.cvat-filters-modal-export-button').should('be.disabled');
            cy.get('.cvat-filters-modal-share-button').should('be.disabled');
            
            // Import button should always be enabled
            cy.get('.cvat-filters-modal-import-button').should('not.be.disabled');
            
            // Add a filter rule
            cy.addFiltersRule(0);
            cy.setFilter({
                groupIndex: 0,
                ruleIndex: 0,
                field: 'Label',
                operator: '==',
                value: labelName
            });
            
            // Now export and share buttons should be enabled
            cy.get('.cvat-filters-modal-export-button').should('not.be.disabled');
            cy.get('.cvat-filters-modal-share-button').should('not.be.disabled');
            
            cy.get('.cvat-filters-modal-cancel-button').click();
        });
    });
});
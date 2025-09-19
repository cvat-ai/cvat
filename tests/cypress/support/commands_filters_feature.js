// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

Cypress.Commands.add('checkFiltersModalOpened', () => {
    cy.document().then((doc) => {
        const filterModal = Array.from(doc.querySelectorAll('.cvat-filters-modal-visible'));
        if (filterModal.length === 0) {
            cy.contains('.cvat-annotation-header-button', 'Filters').click();
        }
    });
});

Cypress.Commands.add('collectGroupID', () => {
    const groupDataID = [];
    cy.get('.group').then(($group) => {
        for (let i = 0; i < $group.length; i++) {
            groupDataID.push($group[i].dataset.id);
        }
        return groupDataID;
    });
});

Cypress.Commands.add('collectRuleID', () => {
    const ruleDataID = [];
    cy.get('.rule').then(($rule) => {
        for (let i = 0; i < $rule.length; i++) {
            ruleDataID.push($rule[i].dataset.id);
        }
        return ruleDataID;
    });
});

Cypress.Commands.add('clearFilters', () => {
    cy.checkFiltersModalOpened();
    cy.contains('button', 'Clear filters').click();
    cy.get('.cvat-filters-modal-visible').should('not.exist');
    cy.get('.cvat-filters-modal').should('not.exist');
});

Cypress.Commands.add('addFiltersGroup', (groupIndex) => {
    cy.checkFiltersModalOpened();
    cy.collectGroupID().then((groupIdIndex) => {
        cy.get(`[data-id="${groupIdIndex[groupIndex]}"]`).contains('button', 'Add group').first().click();
    });
});

// Filter export/import/share functionality commands
Cypress.Commands.add('exportFilter', () => {
    cy.checkFiltersModalOpened();
    cy.get('.cvat-filters-modal-export-button').should('be.visible').click();
});

Cypress.Commands.add('importFilter', (filterData) => {
    cy.checkFiltersModalOpened();
    cy.get('.cvat-filters-modal-import-button').should('be.visible').click();
    cy.get('.cvat-filters-text-input').should('be.visible').type(JSON.stringify(filterData), { parseSpecialCharSequences: false });
    cy.contains('button', 'Apply Filter').click();
});

Cypress.Commands.add('shareFilterURL', () => {
    cy.checkFiltersModalOpened();
    cy.get('.cvat-filters-modal-share-button').should('be.visible').click();
});

Cypress.Commands.add('checkFilterExportSuccess', () => {
    cy.get('.ant-message-success').should('contain', 'Filter exported to clipboard');
});

Cypress.Commands.add('checkFilterImportSuccess', () => {
    cy.get('.ant-message-success').should('contain', 'Filter imported successfully');
});

Cypress.Commands.add('checkShareURLSuccess', () => {
    cy.get('.ant-message-success').should('contain', 'Shareable URL copied to clipboard');
});

Cypress.Commands.add('openImportTextEditor', () => {
    cy.checkFiltersModalOpened();
    cy.get('.cvat-filters-modal-import-button').click();
    cy.get('.cvat-filters-text-editor').should('be.visible');
});

Cypress.Commands.add('closeImportTextEditor', () => {
    cy.get('.cvat-filters-text-editor').within(() => {
        cy.contains('button', 'Cancel').click();
    });
    cy.get('.cvat-filters-text-editor').should('not.exist');
});

Cypress.Commands.add('checkFilterTextEditorVisible', () => {
    cy.get('.cvat-filters-text-editor').should('be.visible');
    cy.get('.cvat-filters-text-input').should('be.visible');
});

// Mock clipboard operations for testing
Cypress.Commands.add('mockClipboard', () => {
    cy.window().then((win) => {
        win.navigator.clipboard = {
            writeText: cy.stub().resolves(),
            readText: cy.stub().resolves('mocked clipboard content')
        };
    });
});

Cypress.Commands.add('addFiltersRule', (groupIndex) => {
    cy.checkFiltersModalOpened();
    cy.collectGroupID().then((groupIdIndex) => {
        cy.get(`[data-id="${groupIdIndex[groupIndex]}"]`).contains('button', 'Add rule').click();
    });
});

Cypress.Commands.add('setGroupCondition', (groupIndex, condition) => {
    cy.checkFiltersModalOpened();
    cy.collectGroupID().then((groupIdIndex) => {
        cy.get(`[data-id="${groupIdIndex[groupIndex]}"]`).first().within(() => {
            cy.get('.group--header').first().trigger('mouseover');
            cy.contains('button', condition).click({ force: true });
        });
    });
});

Cypress.Commands.add(
    'setFilter',
    ({
        groupIndex, ruleIndex, field, operator, valueSource, value, label, labelAttr, submit,
    }) => {
        cy.checkFiltersModalOpened();
        cy.collectGroupID().then((groupIdIndex) => {
            cy.collectRuleID().then((ruleIdIndex) => {
                cy.get(`[data-id="${groupIdIndex[groupIndex]}"]`)
                    .find(`[data-id="${ruleIdIndex[ruleIndex]}"]`)
                    .first()
                    .within(() => {
                        cy.contains('button', 'Select field').click();
                    });
                if (field === 'Attributes') {
                    cy.get('.ant-dropdown')
                        .not('.ant-dropdown-hidden')
                        .contains('[role="menuitem"]', field)
                        .trigger('mouseover');
                    cy.get('.ant-dropdown-menu-sub').should('be.visible').contains(label).trigger('mouseover');
                    cy.contains('.ant-dropdown-menu-item-only-child', labelAttr).should('be.visible').click();
                } else {
                    cy.get('.ant-dropdown').not('.ant-dropdown-hidden').contains('[role="menuitem"]', field).click();
                }
                cy.get(`[data-id="${groupIdIndex[groupIndex]}"]`)
                    .find(`[data-id="${ruleIdIndex[ruleIndex]}"]`)
                    .first()
                    .within(() => {
                        cy.get('[type="search"]').first().click({ force: true });
                    });
                cy.get(`[label="${operator}"]`).last().click();
                if (valueSource) {
                    cy.get(`[data-id="${groupIdIndex[groupIndex]}"]`)
                        .find(`[data-id="${ruleIdIndex[ruleIndex]}"]`)
                        .first()
                        .within(() => {
                            cy.get('[aria-label="ellipsis"]').trigger('mouseover');
                        });
                    cy.contains('Select value source').parents('[role="tooltip"]').contains(valueSource).click();
                }
                cy.get(`[data-id="${groupIdIndex[groupIndex]}"]`)
                    .find(`[data-id="${ruleIdIndex[ruleIndex]}"]`)
                    .first()
                    .within(() => {
                        if (field === 'Attributes') {
                            cy.get('[placeholder="Enter string"]').last().type(`${value}{Enter}`);
                        } else if (!valueSource) {
                            if (field === 'ObjectID' || field === 'Width' || field === 'Height') {
                                cy.get('[placeholder="Enter number"]').type(`${value}{Enter}`);
                            } else {
                                cy.get('[type="search"]').last().type(`${value}{Enter}`);
                            }
                        } else {
                            cy.contains('[type="button"]', 'Select field ').click();
                        }
                    });
                if (valueSource) {
                    cy.get('.ant-dropdown').not('.ant-dropdown-hidden').contains('[role="menuitem"]', value).click();
                }
                if (submit) {
                    cy.get('.cvat-filters-modal-visible').first().within(() => {
                        cy.contains('button', 'Submit').click();
                    });
                    cy.get('.cvat-filters-modal-visible').should('not.exist');
                    cy.get('.cvat-filters-modal').should('not.exist');
                }
            });
        });
    },
);

Cypress.Commands.add('selectFilterValue', (filterValue) => {
    cy.checkFiltersModalOpened();
    cy.get('.cvat-recently-used-filters-wrapper').click();
    cy.get('.cvat-recently-used-filters-dropdown').should('exist').and('be.visible').within(() => {
        cy.get('li').contains(filterValue).click();
    });
    cy.get('.cvat-filters-modal-visible').within(() => {
        cy.contains('button', 'Submit').click();
    });
    cy.get('.cvat-filters-modal-visible').should('not.exist');
    cy.get('.cvat-filters-modal').should('not.exist');
});

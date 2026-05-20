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

function getFilterBuilder(target = 'objects') {
    return cy.get('.cvat-filters-modal-visible .query-builder-container')
        .eq(target === 'elements' ? 1 : 0);
}

function getFilterGroup(groupId, target = 'objects') {
    return getFilterBuilder(target).find(`.group[data-id="${groupId}"]`).first();
}

Cypress.Commands.add('collectGroupId', (target = 'objects') => {
    const groupDataId = [];
    getFilterBuilder(target).find('.group').then(($group) => {
        for (let i = 0; i < $group.length; i++) {
            groupDataId.push($group[i].dataset.id);
        }
        return groupDataId;
    });
});

Cypress.Commands.add('collectRuleId', (target = 'objects') => {
    const ruleDataId = [];
    getFilterBuilder(target).find('.rule').then(($rule) => {
        for (let i = 0; i < $rule.length; i++) {
            ruleDataId.push($rule[i].dataset.id);
        }
        return ruleDataId;
    });
});

Cypress.Commands.add('clearFilters', () => {
    cy.checkFiltersModalOpened();
    cy.contains('button', 'Clear filters').click();
    cy.get('.cvat-filters-modal-visible').should('not.exist');
    cy.get('.cvat-filters-modal').should('not.exist');
});

Cypress.Commands.add('addFiltersGroup', (groupIndex, target = 'objects') => {
    cy.checkFiltersModalOpened();
    cy.collectGroupId(target).then((groupIdIndex) => {
        getFilterGroup(groupIdIndex[groupIndex], target)
            .contains('button', 'Add group')
            .first()
            .click();
    });
});

Cypress.Commands.add('addFiltersRule', (groupIndex, target = 'objects') => {
    cy.checkFiltersModalOpened();
    cy.collectGroupId(target).then((groupIdIndex) => {
        getFilterGroup(groupIdIndex[groupIndex], target).then(($group) => {
            const addRuleButton = Array.from($group[0].querySelectorAll('button'))
                .find((button) => ['Add rule', 'Add sub rule'].includes(button.textContent.trim()));
            cy.wrap(addRuleButton).click();
        });
    });
});

Cypress.Commands.add('setGroupCondition', (groupIndex, condition, target = 'objects') => {
    cy.checkFiltersModalOpened();
    cy.collectGroupId(target).then((groupIdIndex) => {
        getFilterGroup(groupIdIndex[groupIndex], target).within(() => {
            cy.get('.group--header').first().trigger('mouseover');
            cy.contains('button', condition).click({ force: true });
        });
    });
});

Cypress.Commands.add(
    'setFilter',
    ({
        groupIndex, ruleIndex, field, operator, valueSource, value, label, labelAttr, submit, target = 'objects',
    }) => {
        cy.checkFiltersModalOpened();
        cy.collectGroupId(target).then((groupIdIndex) => {
            cy.collectRuleId(target).then((ruleIdIndex) => {
                const getRule = () => {
                    const group = getFilterGroup(groupIdIndex[groupIndex], target);
                    return target === 'elements' ?
                        group.find('.rule').eq(ruleIndex) :
                        group.find(`[data-id="${ruleIdIndex[ruleIndex]}"]`).first();
                };

                getRule().within(() => {
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
                if (field === 'Elements') {
                    return;
                }
                getRule().within(() => {
                    cy.get('[type="search"]').first().click({ force: true });
                });
                cy.get(`[label="${operator}"]`).last().click();
                if (valueSource) {
                    getRule().within(() => {
                        cy.get('[aria-label="ellipsis"]').trigger('mouseover');
                    });
                    cy.contains('Select value source').parents('[role="tooltip"]').contains(valueSource).click();
                }
                getRule().within(() => {
                    if (field === 'Attributes') {
                        cy.get('[placeholder="Enter string"]').last().type(`${value}{Enter}`);
                    } else if (!valueSource) {
                        if (field === 'ObjectID' || field === 'Width' || field === 'Height' || field === 'Rotation') {
                            cy.get('[placeholder="Enter number"]').type(`${value}{Enter}`);
                        } else if (field === 'Occluded' && value === 'true') {
                            cy.get('.ant-switch').click();
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

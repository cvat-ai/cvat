// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

Cypress.Commands.add('assignTaskToUser', (user) => {
    cy.get('.cvat-task-details-user-block').within(() => {
        user !== ''
            ? cy.get('.cvat-user-search-field').find('[type="search"]').type(`${user}{Enter}`)
            : cy.get('.cvat-user-search-field').find('[type="search"]').clear().type('{Enter}');
    });
});

Cypress.Commands.add('assignJobToUser', (jobID, user) => {
    cy.getJobNum(jobID).then(($job) => {
        cy.get('.cvat-task-jobs-table')
            .contains('a', `Job #${$job}`)
            .parents('.cvat-task-jobs-table-row')
            .find('.cvat-job-assignee-selector')
            .click();
    });
    cy.get('.ant-select-dropdown')
        .not('.ant-select-dropdown-hidden')
        .contains(new RegExp(`^${user}$`, 'g'))
        .click();
});

Cypress.Commands.add('reviewJobToUser', (jobID, user) => {
    cy.getJobNum(jobID).then(($job) => {
        cy.get('.cvat-task-jobs-table')
            .contains('a', `Job #${$job}`)
            .parents('.cvat-task-jobs-table-row')
            .find('.cvat-job-reviewer-selector')
            .find('[type="search"]')
            .clear()
            .type(`${user}{Enter}`);
    });
});

Cypress.Commands.add('checkJobStatus', (jobID, status, assignee, reviewer) => {
    cy.getJobNum(jobID).then(($job) => {
        cy.get('.cvat-task-jobs-table')
            .contains('a', `Job #${$job}`)
            .parents('.cvat-task-jobs-table-row')
            .within(() => {
                cy.get('.cvat-job-item-status').should('have.text', status);
                cy.get('.cvat-job-assignee-selector').within(() => {
                    cy.get('input[type="search"]').should('have.value', assignee);
                });
                cy.get('.cvat-job-reviewer-selector').within(() => {
                    cy.get('input[type="search"]').should('have.value', reviewer);
                });
            });
    });
});

Cypress.Commands.add('collectIssueLabel', () => {
    cy.document().then((doc) => {
        return Array.from(doc.querySelectorAll('.cvat-hidden-issue-label'));
    });
});

Cypress.Commands.add('checkIssueLabel', (issueDescription, status = 'unsolved') => {
    cy.collectIssueLabel().then((issueLabelList) => {
        for (let i = 0; i < issueLabelList.length; i++) {
            cy.get(issueLabelList[i])
                .invoke('text')
                .then((issueText) => {
                    if (issueText === issueDescription) {
                        cy.get(issueLabelList[i])
                            .should('exist')
                            .and('have.text', issueDescription)
                            .within(() => {
                                cy.get(`.cvat-hidden-issue-${status}-indicator`).should('exist'); // "unsolved" or "resolved" only.
                            });
                    }
                });
        }
    });
});

Cypress.Commands.add('collectIssueRegionId', () => {
    let issueRegionIdList = [];
    cy.document().then((doc) => {
        const issueRegionList = Array.from(doc.querySelectorAll('.cvat_canvas_issue_region'));
        for (let i = 0; i < issueRegionList.length; i++) {
            issueRegionIdList.push(Number(issueRegionList[i].id.match(/-?\d+$/)));
        }
        return issueRegionIdList;
    });
});

Cypress.Commands.add('checkIssueRegion', () => {
    const sccSelectorIssueRegionId = '#cvat_canvas_issue_region_';
    cy.collectIssueRegionId().then((issueRegionIdList) => {
        const maxId = Math.max(...issueRegionIdList);
        cy.get(`${sccSelectorIssueRegionId}${maxId}`).trigger('mousemove').should('exist').and('be.visible');
    });
});

Cypress.Commands.add('createIssueFromObject', (object, issueType, customeIssueDescription) => {
    cy.get(object).trigger('mousemove').rightclick();
    cy.get('.cvat-canvas-context-menu').within(() => {
        cy.contains('.cvat-context-menu-item', new RegExp(`^${issueType}$`, 'g')).click();
    });
    if (issueType === 'Open an issue ...') {
        cy.get('.cvat-create-issue-dialog').within(() => {
            cy.get('#issue_description').type(customeIssueDescription);
            cy.get('[type="submit"]').click();
        });
    } else if (issueType === 'Quick issue ...') {
        cy.get('[id="quick_issue_from_latest$Menu"]')
            .should('be.visible')
            .contains('.cvat-context-menu-item', new RegExp(`^${customeIssueDescription}$`, 'g'))
            .click();
    }
    cy.checkIssueRegion();
});

Cypress.Commands.add('createIssueFromControlButton', (createIssueParams) => {
    cy.get('.cvat-issue-control').click();
    if (createIssueParams.type === 'rectangle') {
        cy.get('.cvat-canvas-container')
            .trigger('mousedown', createIssueParams.firstX, createIssueParams.firstY, { button: 0 })
            .trigger('mousemove', createIssueParams.secondX, createIssueParams.secondY)
            .trigger('mouseup');
    } else if (createIssueParams.type === 'point') {
        cy.get('.cvat-canvas-container')
            .trigger('mousedown', createIssueParams.firstX, createIssueParams.firstY, { button: 0 })
            .trigger('mouseup');
    }
    cy.get('.cvat-create-issue-dialog').within(() => {
        cy.get('#issue_description').type(createIssueParams.description);
        cy.get('[type="submit"]').click();
    });
    cy.checkIssueRegion();
});

Cypress.Commands.add('resolveIssue', (issueLabel, resolveText) => {
    cy.get(issueLabel).click();
    cy.get('.cvat-issue-dialog-input').type(resolveText);
    cy.get('.cvat-issue-dialog-footer').within(() => {
        cy.contains('button', 'Comment').click();
        cy.contains('button', 'Resolve').click();
    });
});

Cypress.Commands.add('submitReview', (decision, user) => {
    cy.get('.cvat-submit-review-dialog').within(() => {
        cy.contains(new RegExp(`^${decision}$`, 'g')).click();
        if (decision === 'Review next') {
            cy.intercept('GET', `/api/v1/users?search=${user}&limit=10`).as('searchUsers');
            cy.get('.cvat-user-search-field').within(() => {
                cy.get('input[type="search"]').clear().type(`${user}`);
                cy.wait('@searchUsers').its('response.statusCode').should('equal', 200);
                cy.get('input[type="search"]').type('{Enter}');
            });
        }
        cy.contains('button', 'Submit').click();
    });
});

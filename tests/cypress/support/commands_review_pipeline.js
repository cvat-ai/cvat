// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

Cypress.Commands.add('assignTaskToUser', (user) => {
    cy.get('.cvat-task-details-user-block').within(() => {
        cy.get('.cvat-user-search-field').click();
    });
    cy.get('.ant-select-dropdown')
        .not('.ant-select-dropdown-hidden')
        .contains(new RegExp(`^${user}$`, 'g'))
        .click();
});

Cypress.Commands.add('assignJobToUser', (jobNumber, user) => {
    cy.getJobNum(jobNumber).then(($job) => {
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

Cypress.Commands.add('checkJobStatus', (jobNumber, status, assignee, reviewer) => {
    cy.getJobNum(jobNumber).then(($job) => {
        cy.get('.cvat-task-jobs-table')
            .contains('a', `Job #${$job}`)
            .parents('.cvat-task-jobs-table-row')
            .within(() => {
                cy.get('.cvat-job-item-status').should('have.text', status);
                cy.get('.cvat-job-assignee-selector').within(() => {
                    cy.get('input[type="text"]').should('have.value', assignee);
                });
                cy.get('.cvat-job-reviewer-selector').within(() => {
                    cy.get('input[type="text"]').should('have.value', reviewer);
                });
            });
    });
});

Cypress.Commands.add('checkIssue', (issueDescription, status = 'unsolved') => {
    cy.document().then((doc) => {
        const issueLabelList = Array.from(doc.querySelectorAll('.cvat-hidden-issue-label'));
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

Cypress.Commands.add('checkIssueRegion', () => {
    let issueRegionIdList = [];
    cy.document().then((doc) => {
        const issueRegionList = Array.from(doc.querySelectorAll('.cvat-hidden-issue-label'));
        for (let i = 0; i < issueRegionList.length; i++) {
            issueRegionIdList.push(Number(issueRegionList[i].id.match(/\d+$/)));
        }
        const maxId = Math.max(...issueRegionIdList);
        cy.get(`#cvat_canvas_issue_region_-${maxId}`).trigger('mousemove').should('exist').and('be.visible');
    });
});

Cypress.Commands.add('createIssueFromObject', (object, issueType, customeIssueDescription) => {
    cy.get(object).trigger('mousemove', { force: true }).rightclick({ force: true });
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
        cy.get('.cvat-canvas-container').click(createIssueParams.firstX, createIssueParams.firstY);
    }
    cy.get('.cvat-create-issue-dialog').within(() => {
        cy.get('#issue_description').type(createIssueParams.description);
        cy.get('[type="submit"]').click();
    });
    cy.checkIssueRegion();
});

Cypress.Commands.add('submitReview', (decision) => {
    cy.server().route('POST', '/api/v1/reviews').as('changeReviewStatus');
    cy.get('.cvat-submit-review-dialog').within(() => {
        cy.contains(new RegExp(`^${decision}$`, 'g')).click();
        cy.contains('button', 'Submit').click();
    });
    cy.wait('@changeReviewStatus').its('status').should('equal', 201);
});

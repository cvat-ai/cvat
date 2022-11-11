// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

Cypress.Commands.add('assignTaskToUser', (user) => {
    cy.get('.cvat-task-details-user-block').within(() => {
        if (user !== '') {
            cy.get('.cvat-user-search-field').find('input').type(`${user}{Enter}`);
        } else {
            cy.get('.cvat-user-search-field').find('input').clear().type('{Enter}');
        }
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

    cy.intercept('PATCH', '/api/jobs/**').as('patchJobAssignee');
    cy.get('.ant-select-dropdown')
        .should('be.visible')
        .not('.ant-select-dropdown-hidden')
        .contains(new RegExp(`^${user}$`, 'g'))
        .click();

    cy.wait('@patchJobAssignee').its('response.statusCode').should('equal', 200);
    cy.get('.cvat-spinner').should('not.exist');
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
    cy.document().then((doc) => Array.from(doc.querySelectorAll('.cvat-hidden-issue-label')));
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
    const issueRegionIdList = [];
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
        cy.get(`${sccSelectorIssueRegionId}${maxId}`)
            .trigger('mousemove')
            .should('be.visible');
    });
});

Cypress.Commands.add('createIssueFromObject', (object, issueType, customeIssueDescription) => {
    cy.get(object).then(($object) => {
        const objectFillOpacity = $object.attr('fill-opacity');
        cy.get($object)
            .trigger('mousemove')
            .trigger('mouseover')
            .should('have.attr', 'fill-opacity', Number(objectFillOpacity) * 10)
            .rightclick();
    });
    cy.get('.cvat-canvas-context-menu').should('be.visible').within(() => {
        cy.contains('.cvat-context-menu-item', new RegExp(`^${issueType}$`)).click();
    });
    if (issueType === 'Open an issue ...') {
        cy.get('.cvat-create-issue-dialog').should('be.visible').within(() => {
            cy.get('#issue_description').type(customeIssueDescription);
            cy.get('[type="submit"]').click();
        });
    } else if (issueType === 'Quick issue ...') {
        cy.get('.cvat-quick-issue-from-latest-item')
            .should('be.visible')
            .contains('.cvat-context-menu-item', new RegExp(`^${customeIssueDescription}$`))
            .click();
    }
    cy.get('.cvat-canvas-context-menu').should('not.exist');
    cy.checkIssueRegion();
});

Cypress.Commands.add('createIssueFromControlButton', (createIssueParams) => {
    cy.get('.cvat-issue-control').click().should('have.class', 'cvat-active-canvas-control');
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
    cy.intercept('POST', '/api/issues?*').as('issues');
    cy.get('.cvat-create-issue-dialog').within(() => {
        cy.get('#issue_description').type(createIssueParams.description);
        cy.get('[type="submit"]').click();
    });
    cy.wait('@issues').its('response.statusCode').should('equal', 201);
    cy.checkIssueRegion();
});

Cypress.Commands.add('resolveReopenIssue', (issueLabel, resolveText, reopen) => {
    cy.get(issueLabel).click();
    cy.intercept('POST', '/api/comments').as('postComment');
    cy.intercept('PATCH', '/api/issues/**').as('resolveReopenIssue');
    cy.get('.cvat-issue-dialog-input').type(resolveText);
    cy.get('.cvat-issue-dialog-footer').within(() => {
        cy.contains('button', 'Comment').click();
        if (reopen) {
            cy.contains('button', 'Reopen').click();
        } else {
            cy.contains('button', 'Resolve').click();
        }
    });
    if (reopen) cy.get('.cvat-issue-dialog-header').find('[aria-label="close"]').click();
    cy.wait('@postComment').its('response.statusCode').should('equal', 201);
    cy.wait('@resolveReopenIssue').its('response.statusCode').should('equal', 200);
});

Cypress.Commands.add('removeIssue', (issueLabel, submitRemove) => {
    cy.get(issueLabel).click();
    cy.intercept('DELETE', '/api/issues/**').as('removeIssue');
    cy.get('.cvat-issue-dialog-footer').within(() => {
        cy.contains('button', 'Remove').click();
    });
    cy.get('.cvat-modal-confirm-remove-issue').within(() => {
        if (submitRemove) {
            cy.contains('button', 'Delete').click();
            cy.wait('@removeIssue').its('response.statusCode').should('equal', 204);
        } else {
            cy.contains('button', 'Cancel').click();
        }
    });
    cy.get('.cvat-modal-confirm-remove-issue').should('not.exist');
});

Cypress.Commands.add('submitReview', (decision, user) => {
    cy.get('.cvat-submit-review-dialog').within(() => {
        cy.contains(new RegExp(`^${decision}$`, 'g')).click();
        if (decision === 'Review next') {
            cy.intercept('GET', `/api/users?search=${user}&limit=10&is_active=true`).as('searchUsers');
            cy.get('.cvat-user-search-field').within(() => {
                cy.get('input[type="search"]').clear().type(`${user}`);
                cy.wait('@searchUsers').its('response.statusCode').should('equal', 200);
                cy.get('input[type="search"]').type('{Enter}');
            });
        }
        cy.contains('button', 'Submit').click();
    });
});

// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

Cypress.Commands.add('assignTaskToUser', (user) => {
    cy.get('.cvat-task-details-user-block').within(() => {
        if (user !== '') {
            cy.intercept('GET', `/api/users?**search=${user}**`).as('searchUsers');
            cy.get('.cvat-user-search-field').find('input').type(`${user}{Enter}`);
            cy.wait('@searchUsers').its('response.statusCode').should('equal', 200);
        } else {
            cy.get('.cvat-user-search-field').find('input').clear();
            cy.get('.cvat-user-search-field').find('input').type('{Enter}');
        }
    });

    cy.get('.cvat-spinner').should('not.exist');
});

Cypress.Commands.add('assignJobToUser', (jobID, user) => {
    cy.get(`.cvat-job-item[data-row-id="${jobID}"]`).find('.cvat-job-assignee-selector input').click();
    cy.get(`.cvat-job-item[data-row-id="${jobID}"]`).find('.cvat-job-assignee-selector input').clear();

    cy.intercept('PATCH', `/api/jobs/${jobID}`).as('patchJobAssignee');
    if (user) {
        cy.intercept('GET', `/api/users?**search=${user}**`).as('searchUsers');
        cy.get(`.cvat-job-item[data-row-id="${jobID}"]`).find('.cvat-job-assignee-selector input').type(user);
        cy.wait('@searchUsers').its('response.statusCode').should('equal', 200);
        cy.get('.cvat-user-search-dropdown')
            .should('be.visible')
            .not('.ant-select-dropdown-hidden')
            .contains(new RegExp(`^${user}$`, 'g'))
            .click();
    } else {
        cy.get('body').type('{Enter}');
    }

    cy.wait('@patchJobAssignee').its('response.statusCode').should('equal', 200);
    cy.get('.cvat-spinner').should('not.exist');
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

Cypress.Commands.add('collectIssueRegionIDs', () => {
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
    cy.collectIssueRegionIDs().then((issueRegionIdList) => {
        const maxId = Math.max(...issueRegionIdList);
        cy.get(`${sccSelectorIssueRegionId}${maxId}`).should('be.visible');
    });
});

Cypress.Commands.add('createIssueFromObject', (clientID, issueType, customIssueDescription) => {
    cy.get(`#cvat_canvas_shape_${clientID}`).trigger('mouseover');
    cy.get(`#cvat_canvas_shape_${clientID}`).trigger('mousemove');
    cy.get(`#cvat_canvas_shape_${clientID}`).rightclick();

    cy.get('.cvat-canvas-context-menu').should('be.visible').within(() => {
        cy.contains('.cvat-context-menu-item', issueType).click();
    });
    if (issueType === 'Open an issue ...') {
        cy.get('.cvat-create-issue-dialog').should('be.visible').within(() => {
            cy.get('#issue_description').type(customIssueDescription);
            cy.get('[type="submit"]').click();
        });
    } else if (issueType === 'Quick issue ...') {
        cy.get('.cvat-quick-issue-from-latest-item')
            .should('be.visible')
            .contains('.cvat-context-menu-item', customIssueDescription)
            .click();
    }
    cy.get('.cvat-canvas-context-menu').should('not.exist');
    cy.checkIssueRegion();
});

Cypress.Commands.add('createIssueFromControlButton', (createIssueParams) => {
    cy.get('.cvat-issue-control').click();
    cy.get('.cvat-issue-control').should('have.class', 'cvat-active-canvas-control');
    if (createIssueParams.type === 'rectangle') {
        cy.get('.cvat-canvas-container')
            .trigger('mousedown', createIssueParams.firstX, createIssueParams.firstY, { button: 0 });
        cy.get('.cvat-canvas-container')
            .trigger('mousemove', createIssueParams.secondX, createIssueParams.secondY);
        cy.get('.cvat-canvas-container').trigger('mouseup');
    } else if (createIssueParams.type === 'point') {
        cy.get('.cvat-canvas-container')
            .trigger('mousedown', createIssueParams.firstX, createIssueParams.firstY, { button: 0 });
        cy.get('.cvat-canvas-container').trigger('mouseup');
    }
    cy.intercept('POST', '/api/issues?*').as('issues');
    cy.get('.cvat-create-issue-dialog').within(() => {
        cy.get('#issue_description').type(createIssueParams.description);
        cy.get('[type="submit"]').click();
    });
    cy.wait('@issues').its('response.statusCode').should('equal', 201);
    cy.get('.cvat-create-issue-dialog').should('not.exist');
    cy.checkIssueRegion();
});

Cypress.Commands.add('resolveIssue', (issueLabel, resolveText) => {
    cy.get(issueLabel).click();
    cy.get('.cvat-issue-dialog-input').type(resolveText);
    cy.get('.cvat-issue-dialog-footer').within(() => {
        if (resolveText) {
            cy.intercept('POST', '/api/comments**').as('postComment');
            cy.contains('button', 'Comment').click();
            cy.wait('@postComment').its('response.statusCode').should('equal', 201);
        }

        cy.intercept('PATCH', '/api/issues/*').as('resolveIssue');
        cy.contains('button', 'Resolve').click();
        cy.wait('@resolveIssue').its('response.statusCode').should('equal', 200);
    });
});

Cypress.Commands.add('reopenIssue', (issueLabel) => {
    cy.get(issueLabel).click();
    cy.get('.cvat-issue-dialog-footer').within(() => {
        cy.intercept('PATCH', '/api/issues/*').as('reopenIssue');
        cy.contains('button', 'Reopen').click();
        cy.wait('@reopenIssue').its('response.statusCode').should('equal', 200);
    });
    cy.get('.cvat-issue-dialog-header').within(() => {
        cy.get('.anticon-close').click();
    });
});

Cypress.Commands.add('removeIssue', (issueLabel) => {
    cy.get(issueLabel).click();
    cy.intercept('DELETE', '/api/issues/**').as('removeIssue');
    cy.get('.cvat-issue-dialog-footer').within(() => {
        cy.contains('button', 'Remove').click();
    });
    cy.get('.cvat-modal-confirm-remove-issue').within(() => {
        cy.contains('button', 'Delete').click();
        cy.wait('@removeIssue').its('response.statusCode').should('equal', 204);
    });
    cy.get('.cvat-modal-confirm-remove-issue').should('not.exist');
});

Cypress.Commands.add('submitReview', (decision, user) => {
    cy.get('.cvat-submit-review-dialog').within(() => {
        cy.contains(new RegExp(`^${decision}$`, 'g')).click();
        if (decision === 'Review next') {
            cy.intercept('GET', `/api/users?search=${user}&limit=10&is_active=true`).as('searchUsers');
            cy.get('.cvat-user-search-field').within(() => {
                cy.get('input[type="search"]').clear();
                cy.get('input[type="search"]').type(`${user}`);
                cy.wait('@searchUsers').its('response.statusCode').should('equal', 200);
                cy.get('input[type="search"]').type('{Enter}');
            });
        }
        cy.contains('button', 'Submit').click();
    });
});

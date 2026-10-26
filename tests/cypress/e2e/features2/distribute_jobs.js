// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { defaultTaskSpec } from '../../support/default-specs';
import { fullMatch } from '../../support/utils';
import { getBulkActionsMenu, selectAll } from '../../support/utils.cy';

context('Distribute jobs among users', () => {
    const suffix = Date.now();
    // organization slugs are limited to 16 characters
    const orgSlug = `dist${suffix.toString(36)}`;
    const usernames = [1, 2, 3, 4].map((idx) => `distribute-user${idx}-${suffix}`);
    // 12 frames by 4 frames per job
    const jobsCount = 3;
    const { taskSpec, dataSpec, extras } = defaultTaskSpec({
        serverFiles: ['archive.zip'], labelName: 'car', taskName: 'Distribute jobs', segmentSize: 4,
    });
    // 12 frames by 6 frames per job
    const sandboxJobsCount = 2;
    const sandboxTask = defaultTaskSpec({
        serverFiles: ['archive.zip'], labelName: 'car', taskName: 'Distribute jobs in sandbox', segmentSize: 6,
    });
    const createdUsernames = [];
    let orgId = null;
    let taskId = null;
    let sandboxTaskId = null;

    function getListedJobIds() {
        return cy.get('.cvat-job-item').then((items) => (
            [...items].map((item) => +item.getAttribute('data-row-id'))
        ));
    }

    function openDistributeModal() {
        selectAll();
        getBulkActionsMenu().within(() => {
            cy.contains('[role="menuitem"]', `Distribute among users (${jobsCount})`).click();
        });
        cy.get('.cvat-modal-distribute-jobs').should('be.visible')
            .and('contain', `Distribute ${jobsCount} jobs`);
    }

    function dropCSV(contents) {
        cy.get('.cvat-modal-distribute-jobs .cvat-distribute-jobs-csv input[type="file"]').selectFile({
            contents: Cypress.Buffer.from(contents),
            fileName: 'usernames.csv',
        }, { action: 'drag-drop', force: true });
    }

    function distributeJobs(pickedUsernames, { paste = false, requestsCount }) {
        if (requestsCount === undefined) {
            throw new Error('requestsCount is required');
        }
        if (paste && pickedUsernames.length < 2) {
            throw new Error('a single pasted username is searched, not added');
        }

        const assignments = [];
        cy.intercept('PATCH', '/api/jobs/**').as('assignJob');
        openDistributeModal();
        if (paste) {
            cy.get('.cvat-modal-distribute-jobs .cvat-distribute-jobs-users input')
                .pasteText(pickedUsernames.join('\n'));
        } else {
            pickedUsernames.forEach((username) => {
                cy.intercept('GET', `/api/users?**search=${username}**`).as('searchUsers');
                cy.get('.cvat-modal-distribute-jobs .cvat-distribute-jobs-users input').type(username);
                cy.wait('@searchUsers');
                cy.get('.cvat-distribute-jobs-users-dropdown')
                    .not('.ant-select-dropdown-hidden')
                    .contains('.ant-select-item-option', fullMatch(username))
                    .click();
            });
        }
        cy.get('.cvat-modal-distribute-jobs').within(() => {
            cy.get('.cvat-distribute-jobs-users .ant-select-selection-item')
                .should('have.length', pickedUsernames.length);
            cy.contains('button', 'Distribute').click();
        });

        for (let i = 0; i < requestsCount; i++) {
            cy.wait('@assignJob').then(({ response }) => {
                expect(response.statusCode).to.equal(200);
                assignments.push([response.body.id, response.body.assignee.username]);
            });
        }
        cy.get('.cvat-bulk-progress-wrapper').should('not.exist');

        return cy.wrap(assignments);
    }

    // the header lists only organizations fetched on page load, so cy.activateOrganization can't be used
    function switchWorkspace(slug = null) {
        if (slug) {
            cy.window().then(($win) => $win.localStorage.setItem('currentOrganization', slug));
        } else {
            cy.clearLocalStorage('currentOrganization');
        }
        cy.visit('/tasks');
        cy.get('.cvat-header-menu-user-dropdown-user').should('be.visible');
        if (slug) {
            cy.get('.cvat-header-menu-user-dropdown-organization').should('have.text', slug);
        } else {
            cy.get('.cvat-header-menu-user-dropdown-organization').should('not.exist');
        }
    }

    function checkListedAssignees(expectedAssignments) {
        expectedAssignments.forEach(([jobId, username]) => {
            cy.get(`.cvat-job-item[data-row-id="${jobId}"] .cvat-job-assignee-selector`)
                .find(`[value="${username}"]`).should('exist');
        });
    }

    before(() => {
        cy.headlessLogout();
        cy.visit('/auth/login');
        usernames.forEach((username) => {
            cy.headlessCreateUser({
                username,
                password: 'Fv5Df3#f55g',
                firstName: 'Distribute',
                lastName: 'User',
                email: `${username}@local.local`,
            }).then(() => createdUsernames.push(username));
        });
        cy.headlessLogin({ nextURL: '/tasks' });
        cy.headlessCreateTask(sandboxTask.taskSpec, sandboxTask.dataSpec, sandboxTask.extras).then((result) => {
            sandboxTaskId = result.taskId;
        });
        cy.headlessCreateOrganization({ slug: orgSlug, name: orgSlug }).then((organization) => {
            orgId = organization.id;
        });
        // invitations take the organization from the request context
        switchWorkspace(orgSlug);
        cy.window().then(async ($win) => {
            const [organization] = await $win.cvat.organizations.get({
                filter: JSON.stringify({ '==': [{ var: 'id' }, orgId] }),
            });
            await Promise.all(usernames.map((username) => (
                organization.invite(`${username}@local.local`, 'worker')
            )));
        });
        cy.headlessCreateTask(taskSpec, dataSpec, extras).then((result) => {
            taskId = result.taskId;
        });
    });

    after(() => {
        // getting a task from another workspace reloads the app, so each task is deleted in its own one
        if (taskId !== null) {
            switchWorkspace(orgSlug);
            cy.headlessDeleteTask(taskId);
        }
        switchWorkspace();
        if (sandboxTaskId !== null) {
            cy.headlessDeleteTask(sandboxTaskId);
        }
        if (orgId !== null) {
            cy.headlessDeleteOrganization(orgId);
        }
        createdUsernames.forEach((username) => {
            cy.headlessDeleteUserByUsername(username);
        });
    });

    describe('In an organization', () => {
        beforeEach(() => {
            cy.openTaskById(taskId);
            // a visit that only drops the query returns before the old page unloads
            cy.location('search').should('be.empty');
            cy.get('.cvat-job-item').should('have.length', jobsCount);
        });

        it('The action is not offered for a single job', () => {
            cy.get('.cvat-job-item').first().find('.cvat-job-item-more-button').click();
            cy.get('.ant-dropdown').not('.ant-dropdown-hidden').within(() => {
                cy.contains('[role="menuitem"]', 'Assignee').should('exist');
                cy.contains('[role="menuitem"]', 'Distribute among users').should('not.exist');
            });
        });

        it('Pasted unknown and duplicated usernames are skipped, extra users get no job', () => {
            openDistributeModal();
            cy.get('.cvat-modal-distribute-jobs').within(() => {
                cy.get('.cvat-distribute-jobs-users input')
                    .pasteText(`${usernames.join('\r\n')}\r\nunknown-${suffix}\r\n${usernames[0]}`);
                cy.get('.cvat-distribute-jobs-users .ant-select-selection-item')
                    .should('have.length', usernames.length);
                cy.get('.cvat-distribute-jobs-summary')
                    .should('contain', `${usernames.length} users`)
                    .and('contain', `${jobsCount} jobs`);
                cy.get('.cvat-distribute-jobs-preview a').should('have.length', jobsCount);
                cy.get('.cvat-distribute-jobs-preview').should('not.contain', usernames[jobsCount]);
            });
        });

        it('Usernames are added from a dropped CSV file with a single column', () => {
            openDistributeModal();
            dropCSV(`username\r\n${usernames.slice(0, 2).join('\r\n')}\r\n`);
            cy.get('.cvat-modal-distribute-jobs .cvat-distribute-jobs-users .ant-select-selection-item')
                .should('have.length', 2);
        });

        it('A dropped CSV file with several columns is rejected', () => {
            openDistributeModal();
            dropCSV(`username,email\r\n${usernames[0]},${usernames[0]}@local.local\r\n`);
            cy.get('.cvat-notification-notice-distribute-jobs-invalid-csv').should('exist');
        });

        it('Users are assigned round robin in the listed order', () => {
            const pickedUsernames = usernames.slice(0, 2);

            // the server returns jobs by descending id, so this order differs from the selection one;
            // both orders give the same mapping (u1, u2, u1), only the order of the requests tells them apart
            cy.visit(`/tasks/${taskId}?sort=id`);
            cy.get('.cvat-job-item').should(($items) => {
                const jobIds = [...$items].map((item) => +item.getAttribute('data-row-id'));
                expect(jobIds).to.have.length(jobsCount);
                expect(jobIds).to.deep.equal([...jobIds].sort((a, b) => a - b));
            });
            getListedJobIds().then((jobIds) => {
                const expectedAssignments = jobIds.map((jobId, idx) => (
                    [jobId, pickedUsernames[idx % pickedUsernames.length]]
                ));
                distributeJobs(pickedUsernames, { paste: true, requestsCount: jobsCount })
                    .should('deep.equal', expectedAssignments);
                checkListedAssignees(expectedAssignments);
            });
        });

        it('Jobs that already have the planned assignee are skipped', () => {
            const username = usernames[2];

            getListedJobIds().then((jobIds) => {
                cy.headlessGetUserId(username).then((userId) => {
                    cy.window().then(($win) => $win.cvat.server.request(`/api/jobs/${jobIds[0]}`, {
                        method: 'PATCH', data: { assignee: userId },
                    }));
                });
                cy.openTaskById(taskId);
                checkListedAssignees([[jobIds[0], username]]);

                const expectedAssignments = jobIds.slice(1).map((jobId) => [jobId, username]);
                distributeJobs([username], { requestsCount: jobsCount - 1 })
                    .should('deep.equal', expectedAssignments);
                checkListedAssignees(jobIds.map((jobId) => [jobId, username]));
            });
        });
    });

    describe('Outside an organization', () => {
        it('The action is not offered in the personal workspace', () => {
            switchWorkspace();
            cy.openTaskById(sandboxTaskId);
            cy.get('.cvat-job-item').should('have.length', sandboxJobsCount);
            selectAll();
            getBulkActionsMenu().within(() => {
                cy.contains('[role="menuitem"]', `Assignee (${sandboxJobsCount})`).should('exist');
                cy.contains('[role="menuitem"]', 'Distribute among users').should('not.exist');
            });
        });
    });
});

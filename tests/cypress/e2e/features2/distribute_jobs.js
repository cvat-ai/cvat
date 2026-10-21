// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { defaultTaskSpec } from '../../support/default-specs';
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
    let orgId = null;
    let taskId = null;

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

    before(() => {
        cy.visit('auth/login');
        cy.login();
        usernames.forEach((username) => {
            cy.headlessCreateUser({
                username,
                password: 'Distribute1!',
                firstName: 'Distribute',
                lastName: 'User',
                email: `${username}@local.local`,
            });
        });
        cy.headlessCreateOrganization({ slug: orgSlug, name: orgSlug }).then((organization) => {
            orgId = organization.id;
            usernames.forEach((username) => {
                cy.wrap(organization.invite(`${username}@local.local`, 'worker'));
            });
        });
        cy.activateOrganization(orgSlug);
        cy.headlessCreateTask(taskSpec, dataSpec, extras).then((result) => {
            taskId = result.taskId;
        });
    });

    after(() => {
        // a failed test may leave a modal open over the header
        cy.visit('/tasks');
        if (taskId !== null) {
            cy.headlessDeleteTask(taskId);
        }
        if (orgId !== null) {
            cy.deactivateOrganization();
            cy.headlessDeleteOrganization(orgId);
        }
        usernames.forEach((username) => {
            cy.headlessDeleteUserByUsername(username);
        });
    });

    beforeEach(() => {
        cy.openTaskById(taskId);
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
        cy.get('.cvat-modal-distribute-jobs').within(() => {
            cy.get('.cvat-distribute-jobs-csv').selectFile({
                contents: Cypress.Buffer.from(`username\r\n${usernames.slice(0, 2).join('\r\n')}\r\n`),
                fileName: 'usernames.csv',
            }, { action: 'drag-drop' });
            cy.get('.cvat-distribute-jobs-users .ant-select-selection-item').should('have.length', 2);
        });
    });

    it('A dropped CSV file with several columns is rejected', () => {
        openDistributeModal();
        cy.get('.cvat-modal-distribute-jobs').within(() => {
            cy.get('.cvat-distribute-jobs-csv').selectFile({
                contents: Cypress.Buffer.from(`username,email\r\n${usernames[0]},${usernames[0]}@local.local\r\n`),
                fileName: 'usernames.csv',
            }, { action: 'drag-drop' });
        });
        // notifications are rendered outside the modal
        cy.get('.ant-notification-notice-error').should('contain', 'only one column');
        cy.get('.cvat-modal-distribute-jobs .cvat-distribute-jobs-users .ant-select-selection-item')
            .should('not.exist');
    });

    it('Users are assigned round robin in the listed order', () => {
        const pickedUsernames = usernames.slice(0, 2);

        getListedJobIds().then((jobIds) => {
            openDistributeModal();
            cy.distributeJobs(pickedUsernames, { paste: true, requestsCount: jobsCount })
                .then((assignments) => {
                    expect(assignments).to.deep.equal(
                        jobIds.map((jobId, idx) => [jobId, pickedUsernames[idx % pickedUsernames.length]]),
                    );
                });
        });
        cy.get('.cvat-bulk-progress-wrapper').should('not.exist');
        cy.get('.ant-notification-notice-error').should('not.exist');
    });

    it('Jobs that already have the planned assignee are skipped', () => {
        const username = usernames[2];

        getListedJobIds().then((jobIds) => {
            cy.assignJobToUser(jobIds[0], username);
            openDistributeModal();
            cy.distributeJobs([username], { requestsCount: jobsCount - 1 })
                .then((assignments) => {
                    expect(assignments).to.deep.equal(
                        jobIds.slice(1).map((jobId) => [jobId, username]),
                    );
                });
        });
        cy.get('.ant-notification-notice-error').should('not.exist');
    });
});

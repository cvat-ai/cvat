// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { translatePoints } from '../../support/utils';
import { defaultTaskSpec } from '../../support/default-specs';
import { selectAll } from '../../support/utils.cy';

context('Basic manipulations with consensus job replicas', () => {
    const labelName = 'Consensus';
    const taskName = 'Test consensus';
    const serverFiles = ['archive.zip'];
    const initialReplicas = 4;
    const { taskSpec, dataSpec, extras } = defaultTaskSpec({
        serverFiles, labelName, taskName, initialReplicas,
    });

    before(() => {
        cy.visit('auth/login');
        cy.login();
    });

    describe('Consensus job creation', () => {
        let consensusTaskId = null;
        before(() => {
            cy.headlessCreateTask(taskSpec, dataSpec, extras).then(({ taskId }) => {
                consensusTaskId = taskId;
            });
        });
        it('Check new consensus task has correct tags and replicas', () => {
            cy.openTaskById(consensusTaskId);
            cy.get('.cvat-task-details-wrapper').should('be.visible');
            cy.get('.ant-notification-notice-error').should('not.exist');
            cy.get('.cvat-tag-parent').then((tags) => {
                expect(tags.length).to.equal(1);
                cy.wrap(tags).each(($el) => {
                    cy.wrap($el).should('have.text', 'Parent');
                });
            });
            // Replicas are hidden by default
            cy.get('.cvat-tag-replica').should('not.exist');

            cy.get('.cvat-clear-filters-button').click();
            cy.get('.cvat-tag-replica').then((tags) => {
                expect(tags.length).to.equal(4);
                cy.wrap(tags).each(($el) => {
                    cy.wrap($el).should('have.text', 'Replica');
                });
            });
        });
        after(() => {
            cy.headlessDeleteTask(consensusTaskId);
        });
    });

    describe('Replica job deletion', () => {
        let consensusTaskId = null;
        before(() => {
            cy.headlessCreateTask(taskSpec, dataSpec, extras).then(({ taskId }) => {
                consensusTaskId = taskId;
            });
        });
        it('Delete a replica job, the parent job stays untouched', () => {
            cy.openTaskById(consensusTaskId);
            cy.get('.cvat-clear-filters-button').click();

            cy.get('.cvat-job-item:has(.cvat-tag-replica)').first()
                .invoke('attr', 'data-row-id').then((replicaId) => {
                    cy.deleteJob(replicaId);

                    // the job list is not refetched after a delete: reload to see what the server kept
                    cy.openTaskById(consensusTaskId);
                    cy.get('.cvat-clear-filters-button').click();
                    cy.get('.cvat-job-item:has(.cvat-tag-replica)').should('have.length', initialReplicas - 1);
                    cy.get('.cvat-job-item:has(.cvat-tag-parent)').should('have.length', 1);
                    cy.get(`.cvat-job-item[data-row-id="${replicaId}"]`).should('not.exist');
                });

            // the parent job can't be deleted
            cy.get('.cvat-job-item:has(.cvat-tag-parent) .cvat-job-item-more-button').click();
            cy.get('.ant-dropdown').not('.ant-dropdown-hidden').within(() => {
                cy.contains('[role="menuitem"]', 'Export annotations').should('be.visible'); // menu is rendered
                cy.contains('[role="menuitem"]', 'Delete').should('not.exist');
            });
            cy.get('body').type('{esc}');
            cy.get('.cvat-job-item-menu').should('not.exist');
        });
        after(() => {
            if (consensusTaskId !== null) cy.headlessDeleteTask(consensusTaskId);
        });
    });

    describe('Replica job addition', () => {
        let singleJobTaskId = null;
        let bulkTaskId = null;
        let bulkJobIds = [];
        const bulkReplicasToAdd = 2;
        const bulkJobsCount = 2;

        before(() => {
            cy.headlessCreateTask(taskSpec, dataSpec, extras).then(({ taskId }) => {
                singleJobTaskId = taskId;
            });

            const bulkSpec = defaultTaskSpec({
                serverFiles: ['smallArchive.zip'], labelName, taskName, segmentSize: 1,
            });
            cy.headlessCreateTask(bulkSpec.taskSpec, bulkSpec.dataSpec, bulkSpec.extras)
                .then(({ taskId, jobIds }) => {
                    bulkTaskId = taskId;
                    bulkJobIds = jobIds;
                });
        });

        it('Add a replica to a single job', () => {
            cy.openTaskById(singleJobTaskId);
            cy.get('.cvat-clear-filters-button').click();
            cy.get('.cvat-job-item:has(.cvat-tag-replica)').should('have.length', initialReplicas);

            cy.get('.cvat-job-item:has(.cvat-tag-parent)')
                .invoke('attr', 'data-row-id').then((parentId) => {
                    cy.addReplicas(1, [parentId]);
                });
            cy.get('.cvat-job-item:has(.cvat-tag-replica)').should('have.length', initialReplicas + 1);

            // a replica can't get replicas
            cy.get('.cvat-job-item:has(.cvat-tag-replica) .cvat-job-item-more-button').first().click();
            cy.get('.ant-dropdown').not('.ant-dropdown-hidden').within(() => {
                cy.contains('[role="menuitem"]', 'Export annotations').should('be.visible'); // menu is rendered
                cy.contains('[role="menuitem"]', 'Add replicas').should('not.exist');
            });
            cy.get('body').type('{esc}');
            cy.get('.cvat-job-item-menu').should('not.exist');
        });

        it('Add replicas to the selected jobs', () => {
            cy.openTaskById(bulkTaskId);
            cy.get('.cvat-job-item').should('have.length', bulkJobsCount);

            selectAll();
            cy.addReplicas(bulkReplicasToAdd, bulkJobIds);

            cy.get('.cvat-clear-filters-button').click();
            cy.get('.cvat-job-item:has(.cvat-tag-replica)')
                .should('have.length', bulkJobsCount * bulkReplicasToAdd);
            cy.get('.cvat-job-item:has(.cvat-tag-parent)').should('have.length', bulkJobsCount);
        });

        after(() => {
            if (singleJobTaskId !== null) cy.headlessDeleteTask(singleJobTaskId);
            if (bulkTaskId !== null) cy.headlessDeleteTask(bulkTaskId);
        });
    });

    describe('Frame deletion in replica jobs', () => {
        let consensusTaskId = null;
        let parentJobId = null;
        let replicaJobId = null;

        function openJob(jobId, query = '') {
            cy.visit(`/tasks/${consensusTaskId}/jobs/${jobId}${query}`);
            cy.get('.cvat-canvas-container').should('be.visible');
        }

        before(() => {
            cy.headlessCreateTask(taskSpec, dataSpec, extras).then(({ taskId }) => {
                consensusTaskId = taskId;
            });
            cy.window().then(async ($win) => {
                const getJob = async (type) => (await $win.cvat.jobs.get({ taskID: consensusTaskId, type }))[0];
                parentJobId = (await getJob('annotation')).id;
                replicaJobId = (await getJob('replica')).id;
            });
        });

        it('Frames can be deleted in the parent job, but not deleted or restored in its replicas', () => {
            openJob(parentJobId);
            cy.deleteFrame(); // deletes frame 0, saves, asserts PATCH data/meta 200
            cy.checkFrameNum(1);

            // deleted frames belong to the task, so frame 0 is deleted in the replica too
            openJob(replicaJobId, '?frame=0');
            cy.get('#cvat_canvas_background').should('have.class', 'cvat_canvas_removed_image');
            cy.get('.cvat-player-restore-frame').should('not.exist');

            cy.goToNextFrame(1);
            cy.get('.cvat-player-delete-frame').should('not.exist');
            cy.get('body').type('{alt}{del}');
            cy.get('.cvat-replica-frame-deletion-warning')
                .should('be.visible')
                .and('contain.text', 'Frames cannot be deleted in replica jobs');
        });

        after(() => {
            if (consensusTaskId !== null) cy.headlessDeleteTask(consensusTaskId);
        });
    });

    describe('Consensus jobs merging', () => {
        let consensusTaskId = null;
        const baseShape = {
            objectType: 'shape',
            labelName,
            frame: 0,
            type: 'rectangle',
            points: [250, 64, 491, 228],
            occluded: false,
        };
        const jobIds = [];

        before(() => {
            cy.headlessCreateTask(taskSpec, dataSpec, extras).then(({ taskId }) => {
                consensusTaskId = taskId;
                cy.openTaskById(consensusTaskId);
            });
            cy.get('.cvat-clear-filters-button').click();
        });

        it("Check new merge buttons exist and are visible. Trying to merge 'new' jobs should trigger errors", () => {
            function parseJobId(jobItem) {
                const jobItemText = jobItem.innerText;
                const [start, stop] = [0, jobItemText.indexOf('\n')];
                return +(jobItemText.substring(start, stop).split('#')[1]);
            }
            cy.get('.cvat-job-item').then(($items) => {
                $items.each((_, el) => jobIds.push(parseJobId(el)));
                jobIds.sort((a, b) => a - b);
            });

            // Merge one consensus job
            cy.then(() => {
                cy.mergeConsensusJob(jobIds[0], 400);
            });
            cy.get('.cvat-notification-notice-consensus-merge-task-failed')
                .should('be.visible')
                .invoke('text').should('include', 'Could not merge the job');
            cy.closeNotification('.cvat-notification-notice-consensus-merge-task-failed');

            // Merge all consensus jobs in task
            cy.mergeConsensusTask(400);
            cy.get('.cvat-notification-notice-consensus-merge-task-failed')
                .should('be.visible')
                .invoke('text')
                .should('include', 'Could not merge the task');
            cy.closeNotification('.cvat-notification-notice-consensus-merge-task-failed');
        });

        it('Check consensus management page', () => {
            const defaultIoU = 40;
            cy.contains('button', 'Actions').click();
            cy.contains('Consensus management').should('be.visible').click();
            cy.get('.cvat-consensus-management-inner').should('be.visible');
            // Save settings, confirm request is sent
            cy.intercept('PATCH', 'api/consensus/settings/**').as('settingsMeta');
            cy.contains('button', 'Save').click();
            cy.wait('@settingsMeta');
            cy.get('.ant-notification-notice-message')
                .should('be.visible')
                .invoke('text')
                .should('eq', 'Settings have been updated');
            cy.closeNotification('.ant-notification-notice-closable');

            // Forms and invalid saving
            function checkFieldValue(selector, value) {
                return cy.get(selector).then(([$el]) => {
                    cy.wrap($el).invoke('val').should('eq', `${value}`);
                    return cy.wrap($el);
                });
            }
            function attemptInvalidSaving(errorsCount) {
                cy.get('.ant-form-item-explain-error').should('be.visible')
                    .should('have.length', errorsCount)
                    .each(($el) => {
                        cy.wrap($el).should('have.text', 'This field is required');
                    });
                cy.contains('button', 'Save').click();
                cy.closeNotification('.cvat-notification-save-consensus-settings-failed');
            }
            checkFieldValue('#iouThreshold', defaultIoU).clear();
            attemptInvalidSaving(1);
            cy.get('.ant-notification-notice').should('not.exist');

            // Go back to task page
            cy.get('.cvat-back-btn').should('be.visible').click();
            cy.get('.cvat-clear-filters-button').click();
        });

        it('Create annotations and check that job replicas merge correctly', () => {
            // Create annotations for job replicas
            const delta = 50;
            const [consensusJobID, ...replicaJobIds] = jobIds;
            for (let i = 0, shape = baseShape; i < initialReplicas; i++) {
                cy.headlessCreateObjects([shape], jobIds[i]); // only 'in progress' jobs can be merged
                cy.headlessUpdateJob(replicaJobIds[i], { state: 'in progress' });
                const points = translatePoints(shape.points, delta, 'x');
                shape = { ...shape, points };
            }
            // Merging of consensus job should go without errors in network and UI
            cy.mergeConsensusJob(consensusJobID);
            cy.get('.cvat-notification-notice-consensus-merge-job-failed').should('not.exist');
            cy.get('.ant-notification-notice-message')
                .should('be.visible')
                .invoke('text')
                .should('eq', `Consensus job #${consensusJobID} has been merged`);
            cy.closeNotification('.ant-notification-notice-closable');

            // Shapes in consensus job and a job replica in the middle should be equal
            const middle = Math.floor(jobIds.length / 2);
            const consensusRect = {};
            cy.openJob(0, false).then(() => {
                cy.get('.cvat_canvas_shape').trigger('mousemove');
                cy.get('.cvat_canvas_shape').then(($el) => {
                    consensusRect.x = $el.attr('x');
                    consensusRect.y = $el.attr('y');
                    consensusRect.width = $el.attr('width');
                    consensusRect.height = $el.attr('height');
                });
                cy.get('#cvat_canvas_text_content').should('be.visible')
                    .invoke('text')
                    .should('include', `${labelName}`)
                    .and('include', 'consensus');
            });
            cy.go('back'); // go to previous page
            // After returning to task page, consensus job should be 'completed'
            cy.get('.cvat-job-item').last()
                .find('.cvat-job-item-state').first()
                .invoke('text')
                .should('eq', 'completed');
            cy.contains('.cvat-job-item', `Job #${jobIds[middle]}`).scrollIntoView();
            cy.openJob(middle, false).then(() => {
                cy.get('.cvat_canvas_shape').then(($el) => {
                    expect($el.attr('x')).to.equal(consensusRect.x);
                    expect($el.attr('y')).to.equal(consensusRect.y);
                    expect($el.attr('width')).to.equal(consensusRect.width);
                    expect($el.attr('height')).to.equal(consensusRect.height);
                });
            });
        });
        after(() => {
            cy.headlessDeleteTask(consensusTaskId);
        });
    });
});

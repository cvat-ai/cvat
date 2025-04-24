// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { translatePoints } from '../../support/utils';

context('Basic manipulations with consensus job replicas', () => {
    const labelName = 'Consensus';
    const taskName = 'Test consensus';
    const serverFiles = ['archive.zip'];
    const replicas = 4;
    const taskSpec = {
        name: taskName,
        labels: [{
            name: labelName,
            attributes: [],
            type: 'any',
        }],
    };
    const dataSpec = {
        server_files: serverFiles,
        image_quality: 70,
    };
    const extras = { consensus_replicas: replicas };

    before(() => {
        cy.visit('auth/login');
        cy.login();
    });

    describe('Consensus job creation', () => {
        const maxReplicas = 10;
        let consensusTaskID = null;
        before(() => {
            cy.headlessCreateTask(taskSpec, dataSpec, extras).then(({ taskID }) => {
                consensusTaskID = taskID;
            });
            cy.get('.cvat-create-task-dropdown').click();
            cy.get('.cvat-create-task-button').should('be.visible').click();
        });
        it('Check allowed number of replicas', () => {
            cy.contains('Advanced configuration').click();
            // 'Consensus Replicas' field cannot equal to 1
            cy.get('#consensusReplicas').type(`{backspace}${1}`);
            cy.get('.ant-form-item-has-error')
                .should('be.visible')
                .should('include.text', 'Value can not be equal to 1');
            cy.contains('button', 'Submit & Continue').click();
            cy.get('.ant-notification-notice-error').should('exist').and('be.visible');
            cy.closeNotification('.ant-notification-notice-error');

            // 'Consensus Replicas' field cannot be > 10
            cy.get('#consensusReplicas').clear();
            cy.get('.ant-form-item-has-error').should('not.exist');
            cy.get('#consensusReplicas').type(`{backspace}${maxReplicas + 1}`);
            cy.get('.ant-form-item-has-error')
                .should('be.visible')
                .should('include.text', `Value must be less than ${maxReplicas}`);
            cy.contains('button', 'Submit & Continue').click();
            cy.get('.ant-notification-notice-error').should('exist').and('be.visible');
            cy.closeNotification('.ant-notification-notice-error');
            cy.get('#consensusReplicas').clear();
        });

        it('Check new consensus task has correct tags and drop-down with replicas', () => {
            cy.goToTaskList();
            cy.openTask(taskName);
            cy.get('.cvat-task-details-wrapper').should('be.visible');
            cy.get('.ant-notification-notice-error').should('not.exist');
            // Check tags
            cy.get('.cvat-tag-consensus').then((tags) => {
                expect(tags.length).to.equal(2);
                cy.wrap(tags).each(($el) => {
                    cy.wrap($el).should('have.text', 'Consensus');
                });
            });
            cy.get('.cvat-consensus-job-collapse').should('be.visible')
                .within(($el) => {
                    expect($el.text()).to.equal(`${replicas} Replicas`);
                    cy.wrap($el).click();
                });
        });
        after(() => {
            cy.headlessDeleteTask(consensusTaskID);
        });
    });

    describe('Cosensus jobs merging', () => {
        let consensusTaskID = null;
        const baseShape = {
            objectType: 'shape',
            labelName,
            frame: 0,
            type: 'rectangle',
            points: [250, 64, 491, 228],
            occluded: false,
        };
        const jobIDs = [];

        before(() => {
            cy.headlessCreateTask(taskSpec, dataSpec, extras).then(({ taskID }) => {
                consensusTaskID = taskID;
            });
            cy.goToTaskList();
            cy.openTask(taskName);
            cy.get('.cvat-consensus-job-collapse').click();
        });

        it("Check new merge buttons exist and are visible. Trying to merge 'new' jobs should trigger errors", () => {
            // Check asc order of jobs in drop-down
            function parseJobId(jobItem) {
                const jobItemText = jobItem.innerText;
                const [start, stop] = [0, jobItemText.indexOf('\n')];
                return +(jobItemText.substring(start, stop).split('#')[1]);
            }
            cy.get('.cvat-job-item').each(([$el], i) => {
                const jobID = parseJobId($el);
                jobIDs.push(jobID);
                expect(jobID).equals(jobIDs[0] + i);
            });

            // Merge one consensus job
            cy.then(() => {
                cy.mergeConsensusJob(jobIDs[0], 400);
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
            const defaultQuorum = 50;
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
            checkFieldValue('#quorum', defaultQuorum).clear();
            attemptInvalidSaving(1);
            checkFieldValue('#iouThreshold', defaultIoU).clear();
            attemptInvalidSaving(2);
            cy.get('.ant-notification-notice').should('not.exist');

            // Go back to task page
            cy.get('.cvat-back-btn').should('be.visible').click();
        });

        it('Create annotations and check that job replicas merge correctly', () => {
            // Create annotations for job replicas
            const delta = 50;
            const [consensusJobID, ...replicaJobIDs] = jobIDs;
            for (let i = 0, shape = baseShape; i < replicas; i++) {
                cy.headlessCreateObjects([shape], jobIDs[i]); // only 'in progress' jobs can be merged
                cy.headlessUpdateJob(replicaJobIDs[i], { state: 'in progress' });
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
            const middle = Math.floor(jobIDs.length / 2);
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
            cy.get('.cvat-job-item').first()
                .find('.cvat-job-item-state').first()
                .invoke('text')
                .should('eq', 'completed');
            cy.contains('.cvat-job-item', `Job #${jobIDs[middle]}`).scrollIntoView();
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
            cy.headlessDeleteTask(consensusTaskID);
        });
    });
});

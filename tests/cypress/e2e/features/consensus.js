// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { translatePoints } from '../../support/utils';

context('Basic manipulations with consensus job replicas', () => {
    const labelName = 'Consensus';
    const replicas = 4;
    const taskName = 'Test consensus';
    const serverFiles = ['archive.zip'];

    before(() => {
        cy.visit('auth/login');
        cy.login();
        cy.get('.cvat-create-task-dropdown').click();
        cy.get('.cvat-create-task-button').should('be.visible').click();
    });
    describe('Consensus job creation', () => {
        const maxReplicas = 10;
        it('Check allowed number of replicas', () => {
            // Fill the fields to create the task
            cy.get('#name').type(taskName);
            cy.addNewLabel({ name: labelName });
            cy.selectFilesFromShare(serverFiles);
            cy.contains('[role="tab"]', 'My computer').click();

            cy.contains('Advanced configuration').click();
            // 'Consensus Replicas' field cannot equal to 1
            cy.get('#consensusReplicas').type(`{backspace}${1}`);
            cy.get('.ant-form-item-explain-error')
                .should('be.visible')
                .invoke('text').should('eq', 'Value can not be equal to 1');
            cy.contains('button', 'Submit & Continue').click();
            cy.get('.ant-notification-notice-error').should('exist').and('be.visible');
            cy.closeNotification('.ant-notification-notice-error');

            // 'Consensus Replicas' field cannot be > 10
            cy.get('#consensusReplicas').type(`{backspace}${maxReplicas + 1}`);
            cy.get('.ant-form-item-explain-error').should('be.visible')
                .invoke('text').should('eq', `Value must be less than ${maxReplicas}`);
            cy.contains('button', 'Submit & Continue').click();
            cy.get('.ant-notification-notice-error').should('exist').and('be.visible');
            cy.closeNotification('.ant-notification-notice-error');
            cy.get('#consensusReplicas').clear();
        });

        it('Check new consensus task has correct tags and drop-down with replicas', () => {
            // Create task with consensus
            cy.get('#consensusReplicas').type(replicas);
            cy.contains('button', 'Submit & Open').click();
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
    });

    describe('Cosensus jobs merging', () => {
        const shape0 = {
            objectType: 'shape',
            labelName,
            frame: 0,
            type: 'rectangle',
            points: [250, 64, 491, 228],
            occluded: false,
        };
        const jobIDs = [];
        const attrName = labelName;
        const advancedConfigurationParams = { consensusReplicas: replicas };

        const defaultArgs1 = ['Some default value for type Text', '', null];
        const deafultArgs2 = [false, false, '', 'success', 'Test', null];

        before(() => {
            cy.goToTaskList();
            cy.createAnnotationTask(
                taskName, labelName, attrName,
                ...defaultArgs1,
                advancedConfigurationParams,
                ...deafultArgs2,
                serverFiles,
            ); // TODO: rewrite to headless call to task
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
            function checkFieldSaving(selector, defaultValue) {
                cy.get(selector).then(([$el]) => {
                    cy.wrap($el).invoke('val').should('eq', `${defaultValue}`);
                    cy.wrap($el).clear();
                });
                cy.get('.ant-form-item-explain-error').should('be.visible');
                cy.contains('button', 'Save').click();
            }
            checkFieldSaving('#quorum', defaultQuorum);
            checkFieldSaving('#iouThreshold', defaultIoU);
            cy.get('.ant-notification-notice').should('not.exist');

            // Go back to task page
            cy.get('.cvat-back-btn').should('be.visible').click();
        });

        it('Create annotations and check that job replicas merge correctly', () => {
            // Create annotations for job replicas
            const delta = 50;
            const [consensusJobID, ...replicaJobIDs] = jobIDs;
            for (let i = 0, shape = shape0; i < replicas; i++) {
                cy.headlessCreateObjects([shape], replicaJobIDs[i]); // only 'in progress' jobs can be merged
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
    });
});

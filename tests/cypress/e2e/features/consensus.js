// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Basic manipulations with consensus job replicas', () => {
    before(() => {
        cy.visit('auth/login');
        cy.login();
        cy.get('.cvat-create-task-dropdown').click();
        cy.get('.cvat-create-task-button').should('be.visible').click();
    });
    describe('Consensus job creation', () => {
        // const jobType = 'consensus_replica';
        const maxReplicas = 10;
        const taskName = 'Test consensus';
        const labelName = 'test';
        const serverFiles = ['archive.zip'];
        const replicas = 3;
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

            // Check asc order of jobs
            function parseJobId(jobItem) {
                const jobItemText = jobItem.innerText;
                const [start, stop] = [0, jobItemText.indexOf('\n')];
                return +(jobItemText.substring(start, stop).split('#')[1]);
            }
            cy.get('.cvat-job-item').then((jobItems) => {
                const sourceJobId = parseJobId(jobItems[0]);
                for (let i = 1; i <= replicas; i++) {
                    const jobId = parseJobId(jobItems[i]);
                    expect(jobId).equals(sourceJobId + i);
                }
            });
        });
    });
    describe('Cosensus jobs merging', () => {
        it('Check new merge buttons exist and are visible', () => {
            cy.contains('button', 'Actions').click();
            cy.contains('Merge consensus jobs').should('be.visible');
            cy.get('.ant-card-body').first().within(() => {
                cy.get('.anticon-more').first().click();
            });
            cy.get('.ant-dropdown-menu')
                .should('be.visible')
                .contains('li', 'Merge consensus job').should('be.visible');
        });
        it('Check consensus management page', () => {
            const defaultQuorum = 50;
            const defaultIoU = 40;
            cy.contains('button', 'Actions').click();
            cy.contains('Consensus management').should('be.visible').click();
            cy.get('.cvat-consensus-management-inner').should('be.visible');
            // Save settings, confirm request is sent
            let requestCount = 0;
            cy.intercept('PATCH', 'api/consensus/settings/**', () => {
                requestCount++;
            }).as('settingsMeta');
            cy.contains('button', 'Save').click();
            cy.wait('@settingsMeta');

            // Forms and invalid saving
            cy.get('#quorum').then(([$el]) => {
                cy.wrap($el).invoke('val').should('eq', `${defaultQuorum}`);
                cy.wrap($el).clear();
            });
            cy.get('.ant-form-item-explain-error').should('be.visible');
            // cy.contains('button', 'Save').click();
            cy.get('#iouThreshold').then(([$el]) => {
                cy.wrap($el).invoke('val').should('eq', `${defaultIoU}`);
                cy.wrap($el).clear();
            });
            cy.get('.ant-form-item-explain-error').should('be.visible');
            // cy.contains('button', 'Save').click();
            /* FIXME: saving throws uncaught exception, waiting for fix
            ** saving should probably do nothing in this case ()
            */
            cy.then(() => {
                expect(requestCount).to.equal(1);
            });
        });
    });
});

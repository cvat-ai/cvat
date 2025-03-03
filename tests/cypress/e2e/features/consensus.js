// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />
/// <reference types="../../support" />

context('Basic manipulations with consensus job replicas', () => {
    describe('Consensus job creation', () => {
        // const jobType = 'consensus_replica';
        const maxReplicas = 10;
        const taskName = 'Test consensus';
        const labelName = 'test';
        const serverFiles = ['archive.zip'];
        before(() => {
            cy.visit('auth/login');
            cy.login();
            cy.get('.cvat-create-task-dropdown').click();
            cy.get('.cvat-create-task-button').should('be.visible').click();
        });
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
        it('This is your test case two title', () => {
        // Write your test case two here
        });
    });
});

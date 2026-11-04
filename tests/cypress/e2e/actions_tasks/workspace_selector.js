// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { defaultTaskSpec } from '../../support/default-specs';

context('Workspace selector for a regular task', () => {
    const taskName = 'Workspace selector';
    const { taskSpec, dataSpec, extras } = defaultTaskSpec({
        taskName,
        labelName: 'label',
        serverFiles: ['images/image_1.jpg'],
    });
    let taskId = null;
    let jobId = null;

    before(() => {
        cy.visit('/auth/login');
        cy.login();
        cy.url().should('contain', '/tasks');

        cy.headlessCreateTask(taskSpec, dataSpec, extras).then(({ taskId: tid, jobIds: [jid] }) => {
            [taskId, jobId] = [tid, jid];
            cy.intercept('GET', `/tasks/${taskId}/jobs/${jobId}`).as('visitAnnotationView');
            cy.visit(`/tasks/${taskId}/jobs/${jobId}`);
            cy.wait('@visitAnnotationView');
            cy.get('.cvat-canvas-container').should('exist').and('be.visible');
        });
    });

    after(() => {
        cy.headlessDeleteTask(taskId);
    });

    it('shows the workspaces available for a regular 2D task', () => {
        const expectedWorkspaces = [
            'Standard',
            'Attribute annotation',
            'Single shape',
            'Tag annotation',
            'Review',
        ];

        cy.get('.cvat-workspace-selector').should('be.visible').click();
        cy.get('.cvat-workspace-selector-dropdown')
            .not('.ant-select-dropdown-hidden')
            .find('.ant-select-item-option')
            .should('have.length', expectedWorkspaces.length)
            .then(($options) => {
                const workspaces = Array.from($options, (option) => option.getAttribute('title'));
                expect(workspaces).to.deep.equal(expectedWorkspaces);
            });
    });
});

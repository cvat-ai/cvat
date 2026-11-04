// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { audioFile } from '../../support/const_audio';
import { defaultTaskSpec } from '../../support/default-specs';

context('Task creation actions respect a project dimension.', () => {
    const projectName = 'Project task creation dimension';
    const labelName = 'Audio label';
    let projectId;

    function openTaskCreationMenu() {
        cy.get('.cvat-create-task-dropdown').click();
    }

    function reloadProjectPage() {
        cy.reload();
        cy.get('.cvat-spinner').should('not.exist');
        cy.get('.cvat-project-details').should('exist').and('be.visible');
    }

    function createTask(taskName, serverFiles) {
        const { taskSpec, dataSpec, extras } = defaultTaskSpec({
            taskName,
            labelName,
            projectId,
            serverFiles,
        });
        delete taskSpec.labels;
        return cy.headlessCreateTask(taskSpec, dataSpec, extras);
    }

    function assertTaskCreationOptions({ generic, audio, multi }) {
        openTaskCreationMenu();
        cy.get('.cvat-create-task-button').should(generic ? 'exist' : 'not.exist');
        cy.get('.cvat-create-audio-task-button').should(audio ? 'exist' : 'not.exist');
        cy.get('.cvat-create-multi-tasks-button').should(multi ? 'exist' : 'not.exist');
    }

    before(() => {
        cy.prepareUserSession();
        cy.headlessCreateProject({
            name: projectName,
            labels: [{ name: labelName, attributes: [], type: 'any' }],
        }).then(({ projectId: createdProjectId }) => {
            projectId = createdProjectId;
        });
    });

    after(() => {
        cy.headlessDeleteProject(projectId);
    });

    it('updates task creation actions when its dimension changes', () => {
        cy.openProjectById(projectId);
        assertTaskCreationOptions({ generic: true, audio: true, multi: true });

        createTask('Generic task in a project', ['images/image_1.jpg']).then(({ taskId }) => {
            reloadProjectPage();
            assertTaskCreationOptions({ generic: true, audio: false, multi: true });

            cy.headlessDeleteTask(taskId);
            reloadProjectPage();

            createTask('Audio task in a project', [audioFile]).then(() => {
                reloadProjectPage();
                assertTaskCreationOptions({ generic: false, audio: true, multi: false });
            });
        });
    });
});

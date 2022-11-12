// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Task status change.', () => {
    const caseId = '119';
    const labelName = `Case ${caseId}`;
    const taskName = `New annotation task for ${labelName}`;
    const serverFiles = ['images/image_1.jpg', 'images/image_2.jpg', 'images/image_3.jpg'];
    let taskId;
    let jobId;

    before(() => {
        cy.visit('auth/login');
        cy.login();

        cy.headlessCreateTask({
            labels: [{ name: labelName, attributes: [], type: 'any' }],
            name: taskName,
            project_id: null,
            segmentSize: 5,
            source_storage: { location: 'local' },
            target_storage: { location: 'local' },
        }, {
            server_files: serverFiles,
            image_quality: 70,
            use_zip_chunks: true,
            use_cache: true,
            sorting_method: 'lexicographical',
            segment_size: 1,
            multi_jobs: false,
        }).then((response) => {
            taskId = response.taskID;
            jobId = response.jobID;
        }).then(() => {
            cy.visit(`/tasks/`);
        });
    });

    after(() => {
        cy.logout();
        cy.getAuthKey().then((response) => {
            const authKey = response.body.key;
            cy.request({
                method: 'DELETE',
                url: `/api/tasks/${taskId}`,
                headers: {
                    Authorization: `Token ${authKey}`,
                },
            });
        });
    });

    function checkTaskStatus(status) {
        cy.get('.cvat-tasks-list-item')
            .within(() => {
                cy.get('div').eq(3).should('contain.text', status);
            });
    }

    describe(`Testing case "${caseId}"`, () => {
        it('Task have status "Pending".', () => {
            checkTaskStatus('Pending');
        });

        it('Change task status to "In progress".', () => {
            cy.openTask(taskName);
            cy.setJobStage(0, 'acceptance');
            cy.goToTaskList();
            checkTaskStatus('In Progress');
        });

        it('Not changed task status "In progress".', () => {
            cy.openTask(taskName);
            cy.setJobStage(1, 'acceptance');
            cy.goToTaskList();
            checkTaskStatus('In Progress');
        });

        it('Change task status to "Completed".', () => {
            cy.openTask(taskName);
            cy.setJobStage(2, 'acceptance');
            cy.goToTaskList();
            checkTaskStatus('Completed');
        });
    });
});

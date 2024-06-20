// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Regression tests', () => {
    const taskSpec = {
        labels: [{ name: 'label', attributes: [], type: 'any' }],
        name: 'Task1',
        project_id: null,
        source_storage: { location: 'local' },
        target_storage: { location: 'local' },
    };

    const serverFiles = ['images/image_1.jpg'];
    const dataSpec = {
        server_files: serverFiles,
        image_quality: 70,
        use_zip_chunks: true,
        use_cache: true,
        sorting_method: 'lexicographical',
    };

    let taskID = null;
    let jobID = null;

    before(() => {
        cy.visit('auth/login');
        cy.login();

        cy.headlessCreateTask(taskSpec, dataSpec).then((response) => {
            taskID = response.taskID;
            [jobID] = response.jobIDs;
        });
    });

    describe('Regression tests', () => {
        it('Check task stage on tasks list after changing job state', () => {
            cy.visit(`/tasks/${taskID}`);
            cy.setJobStage(jobID, 'acceptance');

            cy.openJobFromJobsPage(jobID);
            cy.setJobState('completed');

            cy.intercept('/api/tasks**').as('getTasks');
            cy.goToTaskList();
            cy.wait('@getTasks').then((intercept) => {
                expect(intercept.response.body.results.find((task) => task.id === taskID)).to.have.property(
                    'status',
                    'completed',
                );
            });
        });
    });

    after(() => {
        cy.logout();
        cy.getAuthKey().then((response) => {
            const authKey = response.body.key;
            cy.request({
                method: 'DELETE',
                url: `/api/tasks/${taskID}`,
                headers: {
                    Authorization: `Token ${authKey}`,
                },
            });
        });
    });
});

// Copyright (C) 2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Task status updated after initial save.', () => {
    const labelName = 'car';
    const taskName = 'Test task status updated after initial save';
    const rectangleData = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };

    let taskID = null;
    let jobID = null;
    const serverFiles = ['images/image_1.jpg'];

    before(() => {
        cy.headlessLogout();
        cy.visit('/auth/login');
        cy.login();
        cy.url().should('contain', '/tasks');
        cy.headlessCreateTask({
            labels: [{ name: labelName, attributes: [], type: 'any' }],
            name: taskName,
            project_id: null,
            source_storage: { location: 'local' },
            target_storage: { location: 'local' },
        }, {
            server_files: serverFiles,
            image_quality: 70,
            use_zip_chunks: true,
            use_cache: true,
            sorting_method: 'lexicographical',
        }).then((response) => {
            taskID = response.taskID;
            [jobID] = response.jobIDs;
        });
    });

    after(() => {
        if (taskID) {
            cy.headlessDeleteTask(taskID);
        }
    });

    describe(`Testing "${labelName}"`, () => {
        it('State of the created task should be "new".', () => {
            cy.intercept('GET', `/tasks/${taskID}`).as('visitTaskPage');
            cy.visit(`/tasks/${taskID}`);
            cy.wait('@visitTaskPage');
            cy.get('.cvat-job-item .cvat-job-item-state .ant-select-selection-item').invoke('text').should('equal', 'new');
        });

        it('Create object, save annotation, state should be "in progress"', () => {
            cy.intercept('GET', `/tasks/${taskID}/jobs/${jobID}`).as('visitAnnotationView');
            cy.visit(`/tasks/${taskID}/jobs/${jobID}`);
            cy.wait('@visitAnnotationView');
            cy.get('.cvat-canvas-container').should('exist').and('be.visible');
            cy.createRectangle(rectangleData);
            cy.saveJob();
            cy.interactMenu('Open the task');
            cy.get('.cvat-job-item .cvat-job-item-state .ant-select-selection-item').invoke('text').should('equal', 'in progress');
        });
    });
});

// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Requests page', () => {
    const serverFiles = ['images/image_1.jpg', 'images/image_2.jpg', 'images/image_3.jpg'];
    const mainLabelName = 'label';
    const secondLabelName = 'secondLabel';
    const projectName = 'A project for testing performance analytics';
    const projectLabels = [
        { name: mainLabelName, attributes: [], type: 'any' },
        { name: secondLabelName, attributes: [], type: 'any' },
    ];

    const taskName = 'Annotation task for testing requests page';
    const exportFormat = 'CVAT for images';

    const data = {
        projectID: null,
        taskID: null,
        jobID: null,
    };

    before(() => {
        cy.visit('auth/login');
        cy.login();

        cy.headlessCreateProject({
            labels: projectLabels,
            name: projectName,
        }).then((response) => {
            data.projectID = response.projectID;

            cy.headlessCreateTask({
                labels: [],
                name: taskName,
                project_id: data.projectID,
                source_storage: { location: 'local' },
                target_storage: { location: 'local' },
            }, {
                server_files: serverFiles,
                image_quality: 70,
                use_zip_chunks: true,
                use_cache: true,
                sorting_method: 'lexicographical',
            }).then((taskResponse) => {
                data.taskID = taskResponse.taskID;
                [data.jobID] = taskResponse.jobIDs;
            });
        });
    });

    after(() => {
        cy.headlessDeleteProject(data.projectID);
    });

    describe('Requests page', () => {
        it('Check created task and export job', () => {
            cy.visit('/requests');
            cy.contains(`Task #${data.taskID}`).should('exist');
            cy.get('.cvat-requests-card').first().then((element) => {
                cy.wrap(element).find('.cvat-requests-progress').should('exist');
                cy.wrap(element).find('.cvat-request-item-progress-message').should('contain', 'Finished');
            });

            cy.visit(`/tasks/${data.taskID}/jobs/${data.jobID}`);
            const exportAnnotation = {
                as: 'exportAnnotations',
                type: 'annotations',
                format: exportFormat,
            };
            cy.exportJob(exportAnnotation);
            cy.get('.cvat-header-requests-button').click();
            cy.contains(`Job #${data.jobID}`).should('exist');
            cy.get('.cvat-requests-card').first().then((element) => {
                cy.wrap(element).find('.cvat-requests-progress').should('exist');
                cy.wrap(element).find('.cvat-request-item-progress-message').should('contain', 'Finished');
            });

            cy.reload();
            cy.downloadExport(false).then((file) => {
                cy.verifyDownload(file);
            });
        });
    });
});

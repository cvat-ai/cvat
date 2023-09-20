// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Connected file share.', () => {
    const caseId = '107';
    const taskName = `Case ${caseId}`;
    const labelName = taskName;
    const imageFiles = {
        images: ['image_1.jpg', 'image_2.jpg', 'image_3.jpg'],
    };

    function createOpenTaskWithShare() {
        cy.get('.cvat-create-task-dropdown').click();
        cy.get('.cvat-create-task-button').should('be.visible').click();
        cy.get('#name').type(taskName);
        cy.addNewLabel({ name: labelName });
        cy.selectFilesFromShare(imageFiles);
        cy.contains('button', 'Submit & Open').click();
        cy.get('.cvat-task-details').should('exist');
    }

    before(() => {
        cy.visit('auth/login');
        cy.login();
    });

    afterEach(() => {
        cy.goToTaskList();
        cy.deleteTask(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Create a task with "Connected file share".', () => {
            createOpenTaskWithShare();
            cy.openJob();
            cy.get('.cvat-player-filename-wrapper').then((playerFilenameWrapper) => {
                for (let frame = 0; frame < imageFiles.images.length; frame++) {
                    cy.get(playerFilenameWrapper).should('have.text', `images/${imageFiles.images[frame]}`);
                    cy.checkFrameNum(frame);
                    cy.get('.cvat-player-next-button').click();
                    cy.get('.cvat-player-next-button').trigger('mouseout');
                }
            });
        });

        it('Check "Fix problem with getting share data for the task when data not available more in Firefox".', () => {
            cy.goToTaskList();
            createOpenTaskWithShare();
            cy.intercept('GET', '/api/jobs/*/data?**', {
                statusCode: 500,
                body: `<!doctype html>
                <html lang="en">
                    <head>
                        <title>Server Error (500)</title>
                    </head>
                    <body>
                        <h1>Server Error (500)</h1><p></p>
                    </body>
                </html>`,
            });

            cy.openJob();
            cy.get('.cvat-annotation-header').should('exist');
            // Error: . No such file or directory <image_name>".
            cy.get('.cvat-notification-notice-fetch-frame-data-from-the-server-failed').should('exist');
            cy.closeNotification('.cvat-notification-notice-fetch-frame-data-from-the-server-failed');
        });
    });
});

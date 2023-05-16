// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Connected file share.', () => {
    const caseId = '107';
    const taskName = `Case ${caseId}`;
    const labelName = taskName;
    const expectedTopLevel = [
        { name: 'images', type: 'DIR', mime_type: 'DIR' },
    ];

    const expectedImagesList = [
        { name: 'image_1.jpg', type: 'REG', mime_type: 'image' },
        { name: 'image_2.jpg', type: 'REG', mime_type: 'image' },
        { name: 'image_3.jpg', type: 'REG', mime_type: 'image' },
    ];

    function createOpenTaskWithShare() {
        cy.get('.cvat-create-task-dropdown').click();
        cy.get('.cvat-create-task-button').should('be.visible').click();
        cy.get('#name').type(taskName);
        cy.addNewLabel(labelName);
        cy.contains('[role="tab"]', 'Connected file share').click();
        cy.get('.cvat-share-tree')
            .should('be.visible')
            .within(() => {
                cy.intercept('GET', '/api/server/share?**').as('shareRequest');
                cy.get('[aria-label="plus-square"]').click();
                cy.wait('@shareRequest').then((interception) => {
                    for (const item of expectedTopLevel) {
                        const responseEl = interception.response.body.find((el) => el.name === item.name);
                        expect(responseEl).to.deep.equal(item);
                    }
                });
                cy.get('[title="images"]').parent().within(() => {
                    cy.get('[aria-label="plus-square"]').click();
                });
                cy.wait('@shareRequest').then((interception) => {
                    expect(interception.response.body
                        .sort((a, b) => a.name.localeCompare(b.name)))
                        .to.deep.equal(expectedImagesList);
                });
                expectedImagesList.forEach((el) => {
                    const { name } = el;
                    cy.get(`[title="${name}"]`).parent().within(() => {
                        cy.get('.ant-tree-checkbox').click().should('have.attr', 'class').and('contain', 'checked');
                    });
                });
            });
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
                for (let frame = 0; frame < expectedImagesList.length; frame++) {
                    const { name } = expectedImagesList[frame];
                    cy.get(playerFilenameWrapper).should('have.text', `${expectedTopLevel[0].name}/${name}`);
                    cy.checkFrameNum(frame);
                    cy.get('.cvat-player-next-button').click().trigger('mouseout');
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

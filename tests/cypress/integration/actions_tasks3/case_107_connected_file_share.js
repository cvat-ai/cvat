// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Connected file share.', () => {
    const caseId = '107';
    const taskName = `Case ${caseId}`;
    const labelName = taskName;
    let stdoutToList;
    const assetLocalPath = `cypress/integration/actions_tasks3/assets/case_${caseId}`;

    function createOpenTaskWithShare() {
        cy.get('#cvat-create-task-button').should('be.visible').click();
        cy.get('#name').type(taskName);
        cy.addNewLabel(labelName);
        cy.contains('[role="tab"]', 'Connected file share').click();
        cy.get('.cvat-share-tree')
            .should('be.visible')
            .within(() => {
                cy.get('[aria-label="plus-square"]').click();
                cy.exec('docker exec -i cvat /bin/bash -c "ls ~/share"').then((command) => {
                    stdoutToList = command.stdout.split('\n');
                    // [image_case_107_1.png, image_case_107_2.png, image_case_107_3.png]
                    expect(stdoutToList.length).to.be.eq(3);
                    // Number of images to select + selection of all images.
                    cy.get('[title]').should('have.length', stdoutToList.length + 1);
                    stdoutToList.forEach((el) => {
                        cy.get(`[title="${el}"]`).should('exist');
                        // Click on the checkboxes
                        cy.get(`[title="${el}"]`).prev().click().should('have.attr', 'class').and('contain', 'checked');
                    });
                });
            });
        cy.contains('button', 'Submit').click();
        cy.get('.cvat-notification-create-task-success').should('exist').find('button').click();
        cy.get('.cvat-notification-create-task-success').should('exist').find('[data-icon="close"]').click();
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

    after(() => {
        // Renaming to the original name
        cy.exec(`mv ${assetLocalPath}/${stdoutToList[0]}.bk ${assetLocalPath}/${stdoutToList[0]}`);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Create a task with "Connected file share".', () => {
            createOpenTaskWithShare();
            cy.openJob();
            cy.get('.cvat-player-filename-wrapper').then((playerFilenameWrapper) => {
                for (let el = 0; el < stdoutToList.length; el++) {
                    cy.get(playerFilenameWrapper).should('have.text', stdoutToList[el]);
                    cy.checkFrameNum(el);
                    cy.get('.cvat-player-next-button').click().trigger('mouseout');
                }
            });
        });

        it('Check "Fix problem with getting share data for the task when data not available more in Firefox".', () => {
            cy.goToTaskList();
            createOpenTaskWithShare();
            // Rename the image
            cy.exec(`mv ${assetLocalPath}/${stdoutToList[0]} ${assetLocalPath}/${stdoutToList[0]}.bk`).then(
                (fileRenameCommand) => {
                    expect(fileRenameCommand.code).to.be.eq(0);
                },
            );
            cy.exec(`docker exec -i cvat /bin/bash -c "find ~/share -name "*.png" -type f"`).then(
                (findFilesCommand) => {
                    // [image_case_107_2.png, image_case_107_3.png]
                    expect(findFilesCommand.stdout.split('\n').length).to.be.eq(2);
                },
            );
            cy.openJob();
            cy.get('.cvat-annotation-header').should('exist');
            // Error: . "\"No such file or directory /home/django/share/image_case_107_1.png\"".
            cy.get('.cvat-notification-notice-fetch-frame-data-from-the-server-failed').should('exist');
            cy.closeNotification('.cvat-notification-notice-fetch-frame-data-from-the-server-failed');
        });
    });
});

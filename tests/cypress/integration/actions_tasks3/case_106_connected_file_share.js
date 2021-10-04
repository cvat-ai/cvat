// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Connected file share.', () => {
    const caseId = '106';
    const taskName = `Case ${caseId}`;
    const labelName = taskName;
    let stdoutToList;

    before(() => {
        cy.visit('auth/login');
        cy.login();
    });

    after(() => {
        cy.goToTaskList();
        cy.deleteTask(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Create a task with "Connected file share".', () => {
            cy.get('#cvat-create-task-button').should('be.visible').click();
            cy.get('#name').type(taskName);
            cy.addNewLabel(labelName);
            cy.contains('[role="tab"]', 'Connected file share').click();
            cy.get('.cvat-share-tree').should('be.visible').within(() => {
                cy.get('[aria-label="plus-square"]').click();
                cy.get('[title]').should('have.length', 4) // Also "root"
                cy.exec('docker exec -i cvat /bin/bash -c "ls ~/share"').then((command) => {
                    stdoutToList = command.stdout.split('\n');
                    // [image_case_106_1.png, image_case_106_2.png, image_case_106_3.png]
                    expect (stdoutToList.length).to.be.eq(3);
                    stdoutToList.forEach((el) => {
                        cy.get(`[title="${el}"]`).should('exist');
                        // Click on the checkboxes
                        cy.get(`[title="${el}"]`).prev().click().should('have.attr', 'class').and('contain', 'checked');
                    });
                });
            });
            cy.contains('button', 'Submit').click();
            cy.get('.cvat-notification-create-task-success').should('exist').find('button').click();
            cy.get('.cvat-task-details').should('exist');
            cy.openJob();
            cy.get('.cvat-player-filename-wrapper').then((playerFilenameWrapper) => {
                for (let el = 0; el < stdoutToList.length; el++) {
                    cy.get(playerFilenameWrapper).should('have.text', stdoutToList[el]);
                    cy.checkFrameNum(el)
                    cy.get('.cvat-player-next-button').click().trigger('mouseout');
                }
            });
        });
    });
});

// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Ground truth jobs', () => {
    const caseId = 'Ground truth jobs';
    const labelName = 'car';
    const taskName = `New annotation task for Case ${caseId}`;
    const attrName = `Attr for Case ${caseId}`;
    const textDefaultValue = 'Some default value for type Text';
    const imagesCount = 10;
    const imageFileName = 'ground_truth_1';
    const width = 800;
    const height = 800;
    const posX = 10;
    const posY = 10;
    const color = 'gray';
    const archiveName = `${imageFileName}.zip`;
    const archivePath = `cypress/fixtures/${archiveName}`;
    const imagesFolder = `cypress/fixtures/${imageFileName}`;
    const directoryToArchive = imagesFolder;

    const jobOptions = {
        jobType: 'Ground truth',
        frameSelectionMethod: 'Random',
        fromTaskPage: true,
    };

    let jobID = null;

    function checkCardValue(className, value) {
        cy.get(className)
            .should('be.visible')
            .within(() => {
                cy.get('.cvat-analytics-card-value').should('have.text', value);
            });
    }

    function openQualityTab() {
        cy.get('.cvat-task-page-actions-button').click();
        cy.get('.cvat-actions-menu')
            .should('be.visible')
            .find('[role="menuitem"]')
            .filter(':contains("View analytics")')
            .last()
            .click();
        cy.get('.cvat-task-analytics-tabs')
            .within(() => {
                cy.contains('span', 'Quality').click();
            });
    }

    before(() => {
        cy.visit('auth/login');
        cy.login();
        cy.visit('/tasks');
        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
        cy.createZipArchive(directoryToArchive, archivePath);
        cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, archiveName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Create ground truth job from task page', () => {
            cy.openTask(taskName);
            cy.createJob({
                ...jobOptions,
                quantity: 15,
            });
            cy.url().then((url) => {
                jobID = Number(url.split('/').slice(-1)[0].split('?')[0]);

                cy.interactMenu('Open the task');
                cy.get('.cvat-job-item').contains('a', `Job #${jobID}`)
                    .parents('.cvat-job-item')
                    .find('.ant-tag')
                    .should('have.text', 'Ground truth');
            });
        });

        it('Delete ground truth job', () => {
            cy.deleteJob(jobID);
        });

        it('Check quality page, create ground truth job from quality page', () => {
            openQualityTab();
            checkCardValue('.cvat-task-mean-annotation-quality', 'N/A');
            checkCardValue('.cvat-task-gt-conflicts', 'N/A');
            checkCardValue('.cvat-task-issues', '0');

            cy.get('.cvat-job-empty-ground-truth-item')
                .should('be.visible')
                .within(() => {
                    cy.contains('button', 'Create new').click();
                });
            cy.createJob({
                ...jobOptions,
                frameCount: 5,
                fromTaskPage: false,
            });

            cy.url().then((url) => {
                jobID = Number(url.split('/').slice(-1)[0].split('?')[0]);

                cy.interactMenu('Open the task');
                openQualityTab();
                cy.get('.cvat-job-item').contains('a', `Job #${jobID}`)
                    .parents('.cvat-job-item')
                    .find('.ant-tag')
                    .should('have.text', 'Ground truth');
            });
        });
    });
});

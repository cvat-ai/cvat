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

    const rectangles = [
        {
            id: 1,
            points: 'By 2 Points',
            type: 'Shape',
            labelName,
            firstX: 250,
            firstY: 350,
            secondX: 350,
            secondY: 450,
        },
        {
            id: 2,
            points: 'By 2 Points',
            type: 'Shape',
            labelName,
            firstX: 350,
            firstY: 450,
            secondX: 450,
            secondY: 550,
        },
        {
            id: 3,
            points: 'By 2 Points',
            type: 'Shape',
            labelName,
            firstX: 350,
            firstY: 550,
            secondX: 450,
            secondY: 650,
        },
    ];

    let groundTruthJobID = null;
    let jobID = null;

    // With seed = 1, frameCount = 3, totalFrames = 10 - predifined ground truth frames are:
    const groundTruthFrames = [1, 6, 7];

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

    function checkRectangle(rectangle) {
        cy.get(`#cvat_canvas_shape_${rectangle.id}`)
            .should('be.visible')
            .should('have.class', 'cvat_canvas_ground_truth');
        cy.get(`#cvat-objects-sidebar-state-item-${rectangle.id}`)
            .should('be.visible');
    }

    before(() => {
        cy.visit('auth/login');
        cy.login();
        cy.visit('/tasks');
        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
        cy.createZipArchive(directoryToArchive, archivePath);
        cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, archiveName);
        cy.openTask(taskName);
        cy.get('.cvat-job-item').first().invoke('attr', 'data-row-id').then((val) => {
            jobID = val;
        });
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Create ground truth job from task page', () => {
            cy.createJob({
                ...jobOptions,
                quantity: 15,
            });
            cy.url().then((url) => {
                groundTruthJobID = Number(url.split('/').slice(-1)[0].split('?')[0]);

                cy.interactMenu('Open the task');
                cy.get('.cvat-job-item').contains('a', `Job #${groundTruthJobID}`)
                    .parents('.cvat-job-item')
                    .find('.ant-tag')
                    .should('have.text', 'Ground truth');
            });
        });

        it('Delete ground truth job', () => {
            cy.deleteJob(groundTruthJobID);
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
                frameCount: 3,
                seed: 1,
                fromTaskPage: false,
            });

            cy.url().then((url) => {
                groundTruthJobID = Number(url.split('/').slice(-1)[0].split('?')[0]);

                cy.interactMenu('Open the task');
                openQualityTab();
                cy.get('.cvat-job-item').contains('a', `Job #${groundTruthJobID}`)
                    .parents('.cvat-job-item')
                    .find('.ant-tag')
                    .should('have.text', 'Ground truth');
            });
        });

        it('Check frame navigation in ground truth job', () => {
            cy.get('.cvat-job-item').contains('a', `Job #${groundTruthJobID}`).click();
            cy.get('.cvat-spinner').should('not.exist');

            groundTruthFrames.forEach((frame) => {
                cy.checkFrameNum(frame);
                cy.get('.cvat-player-next-button').click();
            });

            cy.checkFrameNum(groundTruthFrames[2]);
        });

        it('Check ground truth annotations', () => {
            cy.interactMenu('Open the task');
            cy.get('.cvat-job-item').contains('a', `Job #${groundTruthJobID}`).click();

            groundTruthFrames.forEach((frame, index) => {
                cy.goCheckFrameNumber(frame);
                cy.createRectangle(rectangles[index]);
            });
            cy.saveJob();
            cy.interactMenu('Open the task');

            cy.get('.cvat-job-item').contains('a', `Job #${jobID}`).click();
            cy.changeWorkspace('Review');

            cy.get('.cvat-objects-sidebar-show-ground-truth').click();
            groundTruthFrames.forEach((frame, index) => {
                cy.goCheckFrameNumber(frame);
                checkRectangle(rectangles[index]);
            });
        });
    });
});

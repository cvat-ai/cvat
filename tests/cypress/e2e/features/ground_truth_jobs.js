// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { defaultTaskSpec } from '../../support/default-specs';

context('Ground truth jobs', () => {
    const labelName = 'car';
    const taskName = 'Annotation task for Ground truth jobs';

    const jobOptions = {
        jobType: 'Ground truth',
        frameSelectionMethod: 'Random',
        fromTaskPage: true,
    };

    const defaultValidationParams = {
        frameCount: 3,
        mode: 'gt',
        frameSelectionMethod: 'random_uniform',
    };

    const groundTruthRectangles = [
        {
            id: 1,
            points: 'By 2 Points',
            type: 'Shape',
            labelName,
            firstX: 570,
            firstY: 650,
            secondX: 670,
            secondY: 750,
        },
        {
            id: 2,
            points: 'By 2 Points',
            type: 'Shape',
            labelName,
            firstX: 250,
            firstY: 350,
            secondX: 350,
            secondY: 450,
        },
        {
            id: 3,
            points: 'By 2 Points',
            type: 'Shape',
            labelName,
            firstX: 350,
            firstY: 450,
            secondX: 450,
            secondY: 550,
        },
        {
            id: 4,
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
    let taskID = null;

    // With seed = 1, frameCount = 4, totalFrames = 100 - predifined ground truth frames are:
    const groundTruthFrames = [10, 23, 71, 87];

    function checkRectangleAndObjectMenu(rectangle, isGroundTruthJob = false) {
        if (isGroundTruthJob) {
            cy.get(`#cvat_canvas_shape_${rectangle.id}`)
                .should('be.visible')
                .should('not.have.class', 'cvat_canvas_ground_truth')
                .should('not.have.css', 'stroke-dasharray', '1px');

            cy.get('.cvat-object-item-menu-button').should('exist');
        } else {
            cy.get(`#cvat_canvas_shape_${rectangle.id}`)
                .should('be.visible')
                .should('have.class', 'cvat_canvas_ground_truth')
                .should('have.css', 'stroke-dasharray', '1px');

            cy.get('.cvat-object-item-menu-button').should('not.exist');
        }

        cy.get(`#cvat-objects-sidebar-state-item-${rectangle.id}`)
            .should('be.visible');
    }

    function openManagementTab() {
        cy.clickInTaskMenu('Quality control', true);
        cy.get('.cvat-task-control-tabs')
            .within(() => {
                cy.contains('Management').click();
            });
        cy.get('.cvat-quality-control-management-tab').should('exist').and('be.visible');
    }

    function createAndOpenTask(serverFiles, validationParams = null) {
        const { taskSpec, dataSpec, extras } = defaultTaskSpec({
            taskName, serverFiles, labelName, validationParams,
        });
        return cy.headlessCreateTask(taskSpec, dataSpec, extras).then((taskResponse) => {
            taskID = taskResponse.taskID;
            if (validationParams) {
                [groundTruthJobID, jobID] = taskResponse.jobIDs;
            } else {
                [jobID] = taskResponse.jobIDs;
            }
        }).then(() => {
            cy.visit(`/tasks/${taskID}`);
            cy.get('.cvat-task-details').should('exist').and('be.visible');
        });
    }

    before(() => {
        cy.visit('/auth/login');
        cy.login();
    });

    describe('Testing ground truth basics', () => {
        const serverFiles = ['bigArchive.zip'];

        before(() => {
            createAndOpenTask(serverFiles);
        });

        after(() => {
            cy.headlessDeleteTask(taskID);
        });

        it('Create ground truth job from task page', () => {
            cy.createJob({
                ...jobOptions,
                frameCount: 4,
                seed: 1,
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

        it('Frame navigation in ground truth job', () => {
            cy.get('.cvat-job-item').contains('a', `Job #${groundTruthJobID}`).click();
            cy.get('.cvat-spinner').should('not.exist');

            groundTruthFrames.forEach((frame) => {
                cy.checkFrameNum(frame);
                cy.get('.cvat-player-next-button').click();
            });
        });

        it('Check ground truth annotations in GT job and in regular job', () => {
            cy.interactMenu('Open the task');
            cy.get('.cvat-job-item').contains('a', `Job #${groundTruthJobID}`).click();

            groundTruthFrames.forEach((frame, index) => {
                cy.goCheckFrameNumber(frame);
                cy.createRectangle(groundTruthRectangles[index]);
            });

            cy.changeWorkspace('Review');
            groundTruthFrames.forEach((frame, index) => {
                cy.goCheckFrameNumber(frame);
                checkRectangleAndObjectMenu(groundTruthRectangles[index], true);
            });

            cy.saveJob();
            cy.interactMenu('Open the task');

            cy.getJobIDFromIdx(1).then((gtJobID) => cy.setJobStage(gtJobID, 'acceptance'));
            cy.getJobIDFromIdx(1).then((gtJobID) => cy.setJobState(gtJobID, 'completed'));
            cy.get('.cvat-job-item').contains('a', `Job #${jobID}`).click();
            cy.changeWorkspace('Review');

            cy.get('.cvat-objects-sidebar-show-ground-truth').click();
            groundTruthFrames.forEach((frame, index) => {
                cy.goCheckFrameNumber(frame);
                checkRectangleAndObjectMenu(groundTruthRectangles[index]);
            });
        });

        it('Delete ground truth job', () => {
            cy.interactMenu('Open the task');
            cy.deleteJob(groundTruthJobID);
        });
    });

    describe('Testing creating task with quality params', () => {
        const imagesCount = 3;
        const imageFileName = `image_${taskName.replace(' ', '_').toLowerCase()}`;
        const width = 800;
        const height = 800;
        const posX = 10;
        const posY = 10;
        const color = 'gray';
        const archiveName = `${imageFileName}.zip`;
        const archivePath = `cypress/fixtures/${archiveName}`;
        const imagesFolder = `cypress/fixtures/${imageFileName}`;
        const directoryToArchive = imagesFolder;
        const attrName = 'gt_attr';
        const defaultAttrValue = 'GT attr';
        const multiAttrParams = false;
        const forProject = false;
        const attachToProject = false;
        const projectName = null;
        const expectedResult = 'success';
        const projectSubsetFieldValue = null;
        const advancedConfigurationParams = false;

        before(() => {
            cy.contains('.cvat-header-button', 'Tasks').should('be.visible').click();
            cy.url().should('include', '/tasks');
            cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
            cy.createZipArchive(directoryToArchive, archivePath);
        });

        afterEach(() => {
            cy.goToTaskList();
            cy.deleteTask(taskName);
        });

        function createTaskWithQualityParams(qualityParams) {
            cy.createAnnotationTask(
                taskName,
                labelName,
                attrName,
                defaultAttrValue,
                archiveName,
                multiAttrParams,
                advancedConfigurationParams,
                forProject,
                attachToProject,
                projectName,
                expectedResult,
                projectSubsetFieldValue,
                qualityParams,
            );
            cy.openTask(taskName);
            cy.get('.cvat-job-item').first()
                .find('.ant-tag')
                .should('have.text', 'Ground truth');
        }

        it('Create task with ground truth job', () => {
            createTaskWithQualityParams({
                validationMode: 'Ground Truth',
            });
        });

        it('Create task with honeypots', () => {
            createTaskWithQualityParams({
                validationMode: 'Honeypots',
            });
        });
    });

    describe('Testing ground truth management basics', () => {
        const serverFiles = ['images/image_1.jpg', 'images/image_2.jpg', 'images/image_3.jpg'];

        before(() => {
            createAndOpenTask(serverFiles, defaultValidationParams).then(() => {
                cy.visit(`/tasks/${taskID}/quality-control#management`);
                cy.get('.cvat-quality-control-management-tab').should('exist').and('be.visible');
                cy.get('.cvat-quality-control-management-tab-summary').should('exist').and('be.visible');
            });
        });

        after(() => {
            cy.headlessDeleteTask(taskID);
        });

        it('Check management page contents.', () => {
            cy.get('.cvat-quality-control-management-tab-summary').should('exist');
            cy.contains('.cvat-allocation-summary-excluded', '0').should('exist');
            cy.contains('.cvat-allocation-summary-total', '3').should('exist');
            cy.contains('.cvat-allocation-summary-active', '3').should('exist');

            cy.get('.cvat-frame-allocation-table').should('exist');
            cy.get('.cvat-allocation-frame-row').should('have.length', 3);
            cy.get('.cvat-allocation-frame-row').each(($el, index) => {
                cy.wrap($el).within(() => {
                    cy.contains(`#${index}`).should('exist');
                    cy.contains(`images/image_${index + 1}.jpg`).should('exist');
                });
            });
        });

        it('Check link to frame.', () => {
            cy.get('.cvat-allocation-frame-row').last().within(() => {
                cy.get('.cvat-open-frame-button').first().click();
            });
            cy.get('.cvat-spinner').should('not.exist');
            cy.url().should('contain', `/tasks/${taskID}/jobs/${groundTruthJobID}`);
            cy.checkFrameNum(2);

            cy.interactMenu('Open the task');
            openManagementTab();
        });

        it('Disable single frame, enable it back.', () => {
            cy.get('.cvat-allocation-frame-row').last().within(() => {
                cy.get('.cvat-allocation-frame-delete').click();
            });
            cy.get('.cvat-spinner').should('not.exist');

            cy.get('.cvat-allocation-frame-row-excluded').should('exist');
            cy.contains('.cvat-allocation-summary-excluded', '1').should('exist');
            cy.contains('.cvat-allocation-summary-active', '2').should('exist');

            cy.get('.cvat-allocation-frame-row-excluded').within(() => {
                cy.get('.cvat-allocation-frame-restore').click();
            });
            cy.get('.cvat-spinner').should('not.exist');
            cy.get('.cvat-allocation-frame-row-excluded').should('not.exist');
            cy.contains('.cvat-allocation-summary-excluded', '0').should('exist');
            cy.contains('.cvat-allocation-summary-active', '3').should('exist');
        });

        it('Select several frames, use group operations.', () => {
            function selectFrames() {
                cy.get('.cvat-allocation-frame-row').each(($el, index) => {
                    if (index !== 0) {
                        cy.wrap($el).within(() => {
                            cy.get('.ant-table-selection-column input[type="checkbox"]').should('not.be.checked').check();
                        });
                    }
                });
            }

            selectFrames();
            cy.get('.cvat-allocation-selection-frame-delete').click();
            cy.get('.cvat-spinner').should('not.exist');

            cy.get('.cvat-allocation-frame-row-excluded').should('have.length', 2);
            cy.contains('.cvat-allocation-summary-excluded', '2').should('exist');
            cy.contains('.cvat-allocation-summary-active', '1').should('exist');

            selectFrames();
            cy.get('.cvat-allocation-selection-frame-restore').click();
            cy.get('.cvat-spinner').should('not.exist');

            cy.get('.cvat-allocation-frame-row-excluded').should('not.exist');
            cy.contains('.cvat-allocation-summary-excluded', '0').should('exist');
            cy.contains('.cvat-allocation-summary-active', '3').should('exist');
        });

        it('Check search feature', () => {
            cy.get('.cvat-quality-table-search-bar input').clear();
            serverFiles.forEach((file, index) => {
                cy.get('.cvat-quality-table-search-bar input').type(`image_${index + 1}`);
                cy.get('.cvat-quality-table-search-bar .ant-input-search-button').click();
                cy.get('.cvat-allocation-frame-row').should('have.length', 1);
                cy.get('.cvat-allocation-frame-row').within(() => {
                    cy.contains(file).should('exist');
                });
                cy.get('.cvat-quality-table-search-bar input').clear();
            });

            cy.get('.cvat-quality-table-search-bar .ant-input-search-button').click();
            cy.get('.cvat-allocation-frame-row').should('have.length', 3);
        });

        it('Check management table .csv representation is available for download', () => {
            cy.get('.cvat-quality-control-management-tab .cvat-quality-table-dowload-button').click();

            const expectedFileName = `allocation-table-task_${taskID}.csv`;
            cy.verifyDownload(expectedFileName);
            cy.checkCsvFileContent(expectedFileName, 'frame,name,active', 4, (row, index) => {
                expect(row).to.include(`images/image_${index + 1}.jpg`);
                expect(row).to.include('true');
            });
        });
    });

    describe('Regression tests', () => {
        const serverFiles = ['bigArchive.zip'];

        beforeEach(() => {
            createAndOpenTask(serverFiles);
        });

        afterEach(() => {
            cy.headlessDeleteTask(taskID);
        });

        it('Check GT button should be disabled while waiting for GT job creation', () => {
            cy.visit('/tasks');
            cy.openTask(taskName);

            cy.get('.cvat-create-job').click({ force: true });
            cy.url().should('include', '/jobs/create');
            cy.get('.cvat-select-job-type').click();
            cy.get('.ant-select-dropdown')
                .not('.ant-select-dropdown-hidden')
                .first()
                .within(() => {
                    cy.get('.ant-select-item-option[title="Ground truth"]').click();
                });
            cy.get('.cvat-input-frame-count').clear();
            cy.get('.cvat-input-frame-count').type(1);

            cy.intercept('POST', '/api/jobs**', (req) => {
                req.continue((res) => {
                    res.setDelay(1000);
                });
            }).as('delayedRequest');

            cy.contains('button', 'Submit').click({ force: true });
            cy.contains('button', 'Submit').should('be.disabled');
            cy.wait('@delayedRequest');

            cy.get('.cvat-canvas-container').should('exist').and('be.visible');
            cy.url().then((url) => {
                jobID = Number(url.split('/').slice(-1)[0].split('?')[0]);
            }).should('match', /\/tasks\/\d+\/jobs\/\d+/);
        });

        it('Check GT annotations can not be shown in standard annotation view', () => {
            cy.headlessCreateJob({
                task_id: taskID,
                frame_count: 4,
                type: 'ground_truth',
                frame_selection_method: 'random_uniform',
                seed: 1,
            }).then((jobResponse) => {
                groundTruthJobID = jobResponse.jobID;
                return cy.headlessCreateObjects(groundTruthFrames.map((frame, index) => {
                    const gtRect = groundTruthRectangles[index];
                    return {
                        objectType: 'shape',
                        labelName,
                        type: 'rectangle',
                        occluded: false,
                        frame,
                        points: [gtRect.firstX, gtRect.firstY, gtRect.secondX, gtRect.secondY],
                    };
                }), groundTruthJobID);
            }).then(() => {
                cy.visit(`/tasks/${taskID}/jobs/${jobID}`);
                cy.get('.cvat-canvas-container').should('exist');

                cy.changeWorkspace('Review');
                cy.get('.cvat-objects-sidebar-show-ground-truth').click();
                cy.get('.cvat-objects-sidebar-show-ground-truth').should(
                    'have.class', 'cvat-objects-sidebar-show-ground-truth-active',
                );
                groundTruthFrames.forEach((frame, index) => {
                    cy.goCheckFrameNumber(frame);
                    checkRectangleAndObjectMenu(groundTruthRectangles[index]);
                });

                cy.interactMenu('Open the task');
                cy.get('.cvat-task-job-list').within(() => {
                    cy.contains('a', `Job #${jobID}`).click();
                });
                groundTruthFrames.forEach((frame) => {
                    cy.goCheckFrameNumber(frame);
                    cy.get('.cvat_canvas_shape').should('not.exist');
                    cy.get('.cvat-objects-sidebar-state-item').should('not.exist');
                });
            });
        });
    });
});

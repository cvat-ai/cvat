// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Ground truth jobs', () => {
    const caseId = 'Ground truth jobs';
    const labelName = 'car';
    const taskName = `Annotation task for Case ${caseId}`;
    const attrName = `Attr for Case ${caseId}`;
    const textDefaultValue = 'Some default value for type Text';

    const jobOptions = {
        jobType: 'Ground truth',
        frameSelectionMethod: 'Random',
        fromTaskPage: true,
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

    const rectangles = [
        {
            points: 'By 2 Points',
            type: 'Shape',
            labelName,
            firstX: 270,
            firstY: 350,
            secondX: 370,
            secondY: 450,
        },
        {
            points: 'By 2 Points',
            type: 'Shape',
            labelName,
            firstX: 270,
            firstY: 350,
            secondX: 370,
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
            points: 'By 2 Points',
            type: 'Shape',
            labelName,
            firstX: 130,
            firstY: 200,
            secondX: 150,
            secondY: 250,
        },
    ];

    let groundTruthJobID = null;
    let jobID = null;
    let taskID = null;
    let qualityReportID = null;

    // With seed = 1, frameCount = 4, totalFrames = 10 - predifined ground truth frames are:
    const groundTruthFrames = [0, 1, 5, 6];

    function checkCardValue(className, value) {
        cy.get(className)
            .should('be.visible')
            .within(() => {
                cy.get('.cvat-analytics-card-value').should('have.text', value);
            });
    }

    function openQualityTab() {
        cy.clickInTaskMenu('View analytics', true);
        cy.get('.cvat-task-analytics-tabs')
            .within(() => {
                cy.contains('Quality').click();
            });
    }

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

    function checkConflicts(type = '', amount = 0, sidebar = true) {
        switch (type) {
            case 'warning': {
                cy.get('.cvat-conflict-warning').should('have.length', amount);
                if (sidebar) {
                    cy.get('.cvat-objects-sidebar-warning-item').should('have.length', amount);
                }
                break;
            }
            case 'error': {
                cy.get('.cvat-conflict-error').should('have.length', amount);
                if (sidebar) {
                    cy.get('.cvat-objects-sidebar-conflict-item').should('have.length', amount);
                }
                break;
            }
            default: {
                cy.get('.cvat-conflict-warning').should('not.exist');
                cy.get('.cvat-conflict-error').should('not.exist');
                if (sidebar) {
                    cy.get('.cvat-objects-sidebar-warning-item').should('not.exist');
                    cy.get('.cvat-objects-sidebar-conflict-item').should('not.exist');
                }
            }
        }
    }

    function checkHighlight(darkenConflicts) {
        cy.get('.cvat-conflict-label').first().trigger('mouseover');
        cy.get('.cvat-conflict-label.cvat-conflict-darken').should('have.length', darkenConflicts);
    }

    function waitForReport(cvat, rqID) {
        return new Promise((resolve) => {
            function request() {
                cvat.server.request(`/api/quality/reports?rq_id=${rqID}`, {
                    method: 'POST',
                }).then((response) => {
                    if (response.status === 201) {
                        qualityReportID = response.data.id;
                        resolve(qualityReportID);
                    } else {
                        setTimeout(request, 500);
                    }
                });
            }

            setTimeout(request, 500);
        });
    }

    function createTaskQualityReport(taskId) {
        cy.window().then((window) => window.cvat.server.request('/api/quality/reports', {
            method: 'POST',
            data: {
                task_id: taskId,
            },
        }).then((response) => {
            const rqID = response.data.rq_id;
            return waitForReport(window.cvat, rqID);
        })).then(() => {
            cy.visit('/tasks');
            cy.get('.cvat-spinner').should('not.exist');
            cy.intercept('GET', '/api/quality/reports**').as('getReport');

            cy.openTask(taskName);
            openQualityTab();
            cy.wait('@getReport');
        });
    }

    before(() => {
        cy.visit('auth/login');
        cy.login();
    });

    describe('Testing ground truth basics', () => {
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

        before(() => {
            cy.visit('/tasks');
            cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
            cy.createZipArchive(directoryToArchive, archivePath);
            cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, archiveName);
            cy.openTask(taskName);
            cy.url().then((url) => {
                taskID = Number(url.split('/').slice(-1)[0].split('?')[0]);
            });
            cy.get('.cvat-job-item').first().invoke('attr', 'data-row-id').then((val) => {
                jobID = val;
            });
        });

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

            cy.get('.cvat-job-empty-ground-truth-item')
                .should('be.visible')
                .within(() => {
                    cy.contains('button', 'Create new').click();
                });
            cy.createJob({
                ...jobOptions,
                frameCount: 4,
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
                checkCardValue('.cvat-task-mean-annotation-quality', 'N/A');
                checkCardValue('.cvat-task-gt-conflicts', 'N/A');
                checkCardValue('.cvat-task-issues', '0');
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
            cy.interactMenu('Finish the job');
            cy.get('.cvat-modal-content-finish-job').within(() => {
                cy.contains('button', 'Continue').click();
            });

            cy.get('.cvat-job-item').contains('a', `Job #${jobID}`).click();
            cy.changeWorkspace('Review');

            cy.get('.cvat-objects-sidebar-show-ground-truth').click();
            groundTruthFrames.forEach((frame, index) => {
                cy.goCheckFrameNumber(frame);
                checkRectangleAndObjectMenu(groundTruthRectangles[index]);
            });
        });

        it('Add annotations to regular job, check quality report', () => {
            cy.changeWorkspace('Standard');
            groundTruthFrames.forEach((frame, index) => {
                cy.goCheckFrameNumber(frame);
                cy.createRectangle(rectangles[index]);
            });
            cy.saveJob();

            createTaskQualityReport(taskID);
            checkCardValue('.cvat-task-mean-annotation-quality', '33.3%');
            checkCardValue('.cvat-task-gt-conflicts', '5');
            checkCardValue('.cvat-task-issues', '0');
        });

        it('Check quality report is available for download', () => {
            cy.get('.cvat-analytics-download-report-button').click();
            cy.verifyDownload(`quality-report-task_${taskID}-${qualityReportID}.json`);
        });

        it('Conflicts on canvas and sidebar', () => {
            cy.get('.cvat-task-job-list').within(() => {
                cy.contains('a', `Job #${jobID}`).click();
            });
            cy.get('.cvat-spinner').should('not.exist');

            cy.changeWorkspace('Review');
            cy.get('.cvat-objects-sidebar-tabs').within(() => {
                cy.contains('[role="tab"]', 'Issues').click();
            });
            cy.get('.cvat-objects-sidebar-show-ground-truth').filter(':visible').click();

            cy.goCheckFrameNumber(groundTruthFrames[0]);
            checkConflicts('error', 2);
            checkHighlight(1);

            cy.goCheckFrameNumber(groundTruthFrames[1]);
            checkConflicts('warning', 1);

            cy.goCheckFrameNumber(groundTruthFrames[2]);
            checkConflicts();

            cy.goCheckFrameNumber(groundTruthFrames[3]);
            checkConflicts('error', 2);
            checkHighlight(1);
        });

        it('Conflicts with annotation filter enabled', () => {
            cy.addFiltersRule(0);
            cy.setFilter({
                groupIndex: 0,
                ruleIndex: 0,
                field: 'ObjectID',
                operator: '>',
                value: '5',
                submit: true,
            });

            groundTruthFrames.forEach((frame, index) => {
                if (index !== groundTruthFrames.length - 1) {
                    cy.goCheckFrameNumber(frame);
                    checkConflicts('', 0, false);
                }
            });

            cy.goCheckFrameNumber(groundTruthFrames[groundTruthFrames.length - 1]);
            checkConflicts('error', 1, false);
        });

        it('Frames with conflicts navigation', () => {
            cy.goCheckFrameNumber(groundTruthFrames[0]);

            cy.get('.cvat-issues-sidebar-next-frame').click();
            cy.checkFrameNum(groundTruthFrames[1]);

            cy.get('.cvat-issues-sidebar-next-frame').click();
            cy.checkFrameNum(groundTruthFrames[3]);
        });
    });

    describe('Regression tests', () => {
        const imagesCount = 20;
        const imageFileName = 'ground_truth_2';
        const width = 100;
        const height = 100;
        const posX = 10;
        const posY = 10;
        const color = 'gray';
        const archiveName = `${imageFileName}.zip`;
        const archivePath = `cypress/fixtures/${archiveName}`;
        const imagesFolder = `cypress/fixtures/${imageFileName}`;
        const directoryToArchive = imagesFolder;
        let labels = [];

        before(() => {
            cy.visit('/tasks');
            cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
            cy.createZipArchive(directoryToArchive, archivePath);
            cy.createAnnotationTask(
                taskName, labelName, attrName,
                textDefaultValue, archiveName, false,
                { multiJobs: true, segmentSize: 1 },
            );
            cy.openTask(taskName);
            cy.url().then((url) => {
                taskID = Number(url.split('/').slice(-1)[0].split('?')[0]);
            });
            cy.get('.cvat-job-item').first().invoke('attr', 'data-row-id').then((val) => {
                jobID = val;
            }).then(() => {
                cy.intercept(`/api/labels?**job_id=${jobID}**`).as('getJobLabels');
                cy.visit(`/tasks/${taskID}/jobs/${jobID}`);
                cy.wait('@getJobLabels').then((interception) => {
                    labels = interception.response.body.results;
                });
            });
        });

        afterEach(() => {
            cy.window().then((window) => {
                window.cvat.server.request(`/api/jobs/${jobID}`, {
                    method: 'DELETE',
                });
            });
        });

        it('Create ground truth job, compute quality report, check jobs table', () => {
            cy.window().then((window) => window.cvat.server.request('/api/jobs', {
                method: 'POST',
                data: {
                    task_id: taskID,
                    frame_count: 20,
                    type: 'ground_truth',
                    frame_selection_method: 'random_uniform',
                },
            }).then((response) => {
                jobID = response.data.id;
                return window.cvat.server.request(`/api/jobs/${jobID}/annotations`, {
                    method: 'PUT',
                    data: {
                        shapes: [],
                        tracks: [{
                            label_id: labels[0].id,
                            frame: 0,
                            group: 0,
                            source: 'manual',
                            attributes: [],
                            elements: [],
                            shapes: [{
                                type: 'rectangle',
                                occluded: false,
                                z_order: 0,
                                rotation: 0,
                                outside: false,
                                attributes: [],
                                frame: 0,
                                points: [250, 350, 350, 450],
                            }],
                        }],
                        tags: [],
                    },
                });
            }).then(() => (
                window.cvat.server.request(`/api/jobs/${jobID}`, {
                    method: 'PATCH',
                    data: {
                        stage: 'acceptance',
                        state: 'completed',
                    },
                })
            ))).then(() => {
                createTaskQualityReport(taskID);
                cy.get('.cvat-task-jobs-table .ant-pagination-item').last().invoke('text').then((page) => {
                    const lastPage = parseInt(page, 10);

                    for (let i = 0; i < lastPage; i++) {
                        cy.get('.cvat-task-jobs-table-row').each((row) => {
                            cy.get(row).should('not.include.text', 'N/A');
                        });

                        cy.get('.cvat-task-jobs-table .ant-pagination-next').click();
                    }
                });
            });
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
    });
});

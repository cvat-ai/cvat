// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: LicenseRef-CVAT-AI-Commercial

/// <reference types="cypress" />

import {
    headlessCreatePaidLimits,
    headlessRemovePaidLimits,
    createAndOpenTask,
} from '../utils';

context('Quality control', () => {
    const labelName = 'car';
    const taskName = 'Annotation task for Quality control';

    const groundTruthRectangles = [
        {
            id: 1,
            points: '2 Points',
            type: 'Shape',
            labelName,
            firstX: 570,
            firstY: 650,
            secondX: 670,
            secondY: 750,
        },
        {
            id: 2,
            points: '2 Points',
            type: 'Shape',
            labelName,
            firstX: 250,
            firstY: 350,
            secondX: 350,
            secondY: 450,
        },
        {
            id: 3,
            points: '2 Points',
            type: 'Shape',
            labelName,
            firstX: 350,
            firstY: 450,
            secondX: 450,
            secondY: 550,
        },
        {
            id: 4,
            points: '2 Points',
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
            points: '2 Points',
            type: 'Shape',
            labelName,
            firstX: 270,
            firstY: 350,
            secondX: 370,
            secondY: 450,
        },
        {
            points: '2 Points',
            type: 'Shape',
            labelName,
            firstX: 270,
            firstY: 350,
            secondX: 370,
            secondY: 450,
        },
        {
            id: 3,
            points: '2 Points',
            type: 'Shape',
            labelName,
            firstX: 350,
            firstY: 450,
            secondX: 450,
            secondY: 550,
        },
        {
            points: '2 Points',
            type: 'Shape',
            labelName,
            firstX: 130,
            firstY: 200,
            secondX: 150,
            secondY: 250,
        },
    ];

    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const organizationParams = {
        shortName: `QualityOrg${randomSuffix}`,
        fullName: 'Quality control organization',
        description: 'Organization to check quality control',
        email: 'testorganization@local.local',
        phoneNumber: '+70000000000',
        location: 'Country, State, Address, 000000',
    };
    const user = {
        username: `QualityControl1${randomSuffix}`,
        firstName: 'Firtstnamerenametask',
        lastName: 'Lastnamerenametask',
        email: `QualityControl${randomSuffix}@local.local`,
        password: 'Pass!User1',
    };

    const defaultValidationParams = {
        frameCount: 3,
        mode: 'gt',
        frameSelectionMethod: 'random_uniform',
    };
    const childRequirementName = 'E2E rectangle accuracy';
    const grandchildRequirementName = 'E2E precise rectangle accuracy';

    // With seed = 1, frameCount = 4, totalFrames = 100 - predefined ground truth frames are:
    const groundTruthFrames = [10, 23, 72, 88];

    function openQualityControlTab(tabName) {
        cy.location('pathname').then((pathname) => {
            if (!pathname.includes('/quality-control')) {
                cy.clickInTaskMenu('Quality control', true);
            }

            cy.get('.cvat-quality-control-page-tabs')
                .within(() => {
                    cy.contains(tabName).click();
                });
            cy.get('.cvat-spinner').should('not.exist');
        });
    }

    function downloadCurrentReport() {
        cy.get('.cvat-quality-download-report-button').filter(':visible').first().click();
    }

    function clickQualityTab(tabName) {
        cy.get('.cvat-quality-control-page-tabs')
            .within(() => {
                cy.contains(tabName).click();
            });
    }

    function openQualityTab() {
        openQualityControlTab('Jobs');
    }

    function openQualityControlPage() {
        cy.clickInTaskMenu('Quality control', true);
        cy.get('.cvat-quality-control-page').should('exist');
        cy.get('.cvat-spinner').should('not.exist');
    }

    function checkSummaryCard(title, count, percent) {
        cy.contains('.cvat-quality-control-requirements-summary', title)
            .should('be.visible')
            .within(() => {
                cy.contains(count).should('exist');
                cy.contains(percent).should('exist');
            });
    }

    function checkEmptyQualityReport() {
        cy.get('.ant-tabs-tabpane-active .cvat-quality-control-empty-report', { timeout: 60000 })
            .should('contain.text', 'Request a quality report to see the metrics.');
    }

    function qualityRequest(method, path, data) {
        return cy.window().then((cvatWindow) => (
            cvatWindow.cvat.server.request(path, { method, data }).then((response) => response.data)
        ));
    }

    function createRequirement(data) {
        return qualityRequest('POST', '/api/quality/settings/requirements', data);
    }

    function patchRequirement(requirementId, data) {
        return qualityRequest('PATCH', `/api/quality/settings/requirements/${requirementId}`, data);
    }

    function enableDefaultRectangleRequirement(taskId) {
        return qualityRequest('GET', `/api/quality/settings?task_id=${taskId}`).then((data) => {
            expect(data.results).to.have.length(1);
            const [settings] = data.results;
            const rectangleRequirement = settings.requirements.find((requirement) => (
                requirement.is_base && requirement.annotation_type === 'rectangle'
            ));

            expect(rectangleRequirement).to.exist;

            return patchRequirement(rectangleRequirement.id, { enabled: true });
        });
    }

    function configureRequirementsOverview(taskId) {
        return qualityRequest('GET', `/api/quality/settings?task_id=${taskId}`).then((data) => {
            expect(data.results).to.have.length(1);
            const [settings] = data.results;
            const rectangleRequirement = settings.requirements.find((requirement) => (
                requirement.is_base && requirement.annotation_type === 'rectangle'
            ));

            expect(rectangleRequirement).to.exist;

            return patchRequirement(rectangleRequirement.id, { enabled: true }).then(() => createRequirement({
                settings_id: settings.id,
                parent_requirement: rectangleRequirement.id,
                name: childRequirementName,
                enabled: true,
                required_score: 0.8,
            })).then((childRequirement) => createRequirement({
                settings_id: settings.id,
                parent_requirement: childRequirement.id,
                name: grandchildRequirementName,
                enabled: true,
            }));
        });
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

    function waitForReport(cvat, rqId) {
        return new Promise((resolve) => {
            function request() {
                cvat.server.request(`/api/requests/${rqId}`, {
                    method: 'GET',
                }).then((response) => {
                    expect(response.status).to.equal(200);
                    const backgroundRequestStatus = response.data.status;
                    expect(backgroundRequestStatus).not.to.equal('failed');
                    if (backgroundRequestStatus === 'finished') {
                        const reportId = response.data.result_id;
                        resolve(reportId);
                    } else {
                        setTimeout(request, 500);
                    }
                });
            }

            setTimeout(request, 500);
        });
    }

    function createTaskQualityReport(taskId) {
        return cy.window().then((window) => window.cvat.server.request('/api/quality/reports', {
            method: 'POST',
            data: {
                task_id: taskId,
            },
        }).then((response) => {
            const rqId = response.data.rq_id;
            cy.visit('/tasks');
            return waitForReport(window.cvat, rqId);
        })).then((reportId) => {
            cy.get('.cvat-spinner').should('not.exist');
            cy.intercept('GET', '/api/quality/reports**').as('getReport');

            cy.openTask(taskName);
            openQualityTab();
            cy.wait('@getReport');
            return cy.wrap(reportId);
        });
    }

    function waitForFile(pattern) {
        const maxRetries = 10;
        const retryDelay = 100;

        function waitRecursively(attempt) {
            cy.task('findFiles', { pattern }).then((files) => {
                if (files.length === 1) {
                    expect(files.length).to.equal(1);
                } else if (attempt < maxRetries) {
                    cy.wait(retryDelay).then(() => {
                        waitRecursively(attempt + 1);
                    });
                } else {
                    throw new Error(`File not found by pattern: ${pattern} after ${maxRetries} retries`);
                }
            });
        }
        waitRecursively(0);
    }

    function goBack() {
        cy.get('.cvat-task-top-bar button').click();
        cy.get('.cvat-spinner').should('not.exist');
    }

    function recalculateQualityReport() {
        cy.get('.cvat-quality-control-refresh-button').filter(':visible').first().click();
        cy.contains('Quality report request sent').should('exist');
        cy.contains('Created a few seconds ago').should('exist');
        cy.get('.cvat-notification-notice-calculate-quality-report-failed').should('not.exist');
    }

    function downloadQualityReport() {
        cy.get('.cvat-quality-control-refresh-button').filter(':visible').first().click();
        downloadCurrentReport();
    }

    function verifyQualityReportDownloaded(isProject, id) {
        const downloadsFolder = Cypress.config('downloadsFolder');
        let fileSuffix;
        if (isProject) {
            fileSuffix = 'project';
        } else {
            fileSuffix = 'task';
        }
        waitForFile(`${downloadsFolder}/quality-report-${fileSuffix}_${id}-*.json`);
    }

    describe('Testing quality control availability', () => {
        const serverFiles = ['images/image_1.jpg', 'images/image_2.jpg', 'images/image_3.jpg'];
        let userId = null;
        let authHeaders = null;

        before(() => {
            cy.headlessLogout();
            cy.visit('/auth/login');
            cy.headlessCreateUser(user);
            cy.get('#credential').type(user.email);
            cy.get('#password').type(user.password);
            cy.task('getAuthHeaders').then((_authHeaders) => {
                // get auth headers for admin and keep
                // we will use them during the test
                authHeaders = _authHeaders;
            });

            cy.intercept('/api/users/self*').as('userRequest');
            cy.get('.cvat-credentials-action-button').click();
            cy.wait('@userRequest').then((interception) => {
                userId = interception.response.body.id;
            });

            cy.url().should('contain', '/tasks');
        });

        after(() => {
            cy.task('nodeJSONRequest', {
                url: `/api/users/${userId}`,
                options: {
                    method: 'DELETE',
                    headers: authHeaders,
                },
            });
        });

        it('Unpaid user login, sees Quality control placeholder.', () => {
            createAndOpenTask({ serverFiles, taskName, labelName }, defaultValidationParams).then((newTask) => {
                openQualityControlPage();
                cy.get('.cvat-paid-feature-placeholder').should('exist');
                cy.contains('You discovered a premium feature').should('exist');
                goBack();

                cy.headlessDeleteTask(newTask.taskId);
            });
        });

        it('Grant the user Solo plan privileges. Overview page should be accessible. Check empty overview page.', () => {
            createAndOpenTask({ serverFiles, taskName, labelName }, defaultValidationParams)
                .then((newTask) => headlessCreatePaidLimits({ userId })
                    .then((limitId) => {
                        cy.reload();
                        openQualityTab();
                        cy.get('.cvat-paid-feature-placeholder').should('not.exist');
                        checkEmptyQualityReport();
                        goBack();

                        cy.headlessDeleteTask(newTask.taskId);

                        headlessRemovePaidLimits([limitId]);
                    }));
        });

        it('User in unpaid organization sees Quality control placeholder.', () => {
            cy.createOrganization(organizationParams).then(({ id: organizationId }) => {
                createAndOpenTask({ serverFiles, taskName, labelName }, defaultValidationParams).then((newTask) => {
                    openQualityControlPage();
                    cy.get('.cvat-paid-feature-placeholder').should('exist');
                    cy.contains('You discovered a premium feature').should('exist');
                    goBack();

                    cy.headlessDeleteTask(newTask.taskId);

                    cy.window().then(($win) => (
                        cy.wrap($win.cvat.server.request({
                            url: `/api/organizations/${organizationId}`,
                            method: 'DELETE',
                        }))
                    ));
                });
            });
        });

        it('Grant organization Team privileges. Overview page should be accessible. Check empty overview page.', () => {
            cy.reload();
            cy.createOrganization(organizationParams).then(({ id: organizationId }) => {
                headlessCreatePaidLimits({ orgId: organizationId }).then((limitId) => {
                    createAndOpenTask({ serverFiles, labelName, taskName }, defaultValidationParams).then((newTask) => {
                        cy.reload();
                        openQualityTab();
                        cy.get('.cvat-paid-feature-placeholder').should('not.exist');
                        checkEmptyQualityReport();
                        goBack();

                        cy.headlessDeleteTask(newTask.taskId);

                        headlessRemovePaidLimits([limitId]).then(() => (
                            cy.window().then(($win) => (
                                cy.wrap($win.cvat.server.request({
                                    url: `/api/organizations/${organizationId}`,
                                    method: 'DELETE',
                                }))
                            ))
                        ));
                    });
                });
            });
        });
    });

    context('Quality report', () => {
        let qualityReportId = null;
        let groundTruthJobId = null;
        let jobId = null;
        let taskId = null;

        describe('Testing requirements overview', () => {
            const serverFiles = ['images/image_1.jpg', 'images/image_2.jpg', 'images/image_3.jpg'];
            const requirementsTaskName = `${taskName} requirements overview`;
            let requirementsTaskId = null;

            before(() => {
                cy.headlessLogout();
                cy.visit('/auth/login');
                cy.login();
                createAndOpenTask(
                    { serverFiles, labelName, taskName: requirementsTaskName },
                    defaultValidationParams,
                ).then((newTask) => {
                    requirementsTaskId = newTask.taskId;
                    return configureRequirementsOverview(requirementsTaskId);
                });
            });

            after(() => {
                cy.headlessDeleteTask(requirementsTaskId);
            });

            it('Shows an empty state on the requirements overview tab before a report exists', () => {
                openQualityControlTab('Requirements');
                cy.get('.cvat-quality-control-requirements-tab').should('be.visible');
                checkEmptyQualityReport();
                cy.get('.cvat-quality-control-requirements-summary').should('not.exist');
                cy.get('.cvat-quality-control-requirements-table').should('not.exist');
            });
        });

        describe('Testing ground truth basics', () => {
            const serverFiles = ['bigArchive.zip'];

            before(() => {
                cy.headlessLogout();
                cy.visit('/auth/login');
                cy.login();
                createAndOpenTask(
                    { serverFiles, labelName, taskName },
                    { ...defaultValidationParams, frameCount: 4, randomSeed: 1 },
                ).then((newTask) => {
                    groundTruthJobId = newTask.groundTruthJobId;
                    jobId = newTask.jobId;
                    taskId = newTask.taskId;
                    // Conflicts/quality are only computed for enabled requirements.
                    // The default rectangle requirement is disabled by default, so enable it
                    // before any report is generated for this task.
                    return enableDefaultRectangleRequirement(taskId);
                });
            });

            after(() => {
                cy.headlessDeleteTask(taskId);
            });

            it('Check management and jobs pages before report generation.', () => {
                openQualityControlTab('Management');
                cy.get('.cvat-quality-control-gt-job')
                    .contains('a', `Job #${groundTruthJobId}`)
                    .parents('.cvat-job-item')
                    .find('.ant-tag')
                    .should('have.text', 'Ground truth');
                cy.get('.cvat-frame-allocation-table').should('be.visible');

                openQualityControlTab('Jobs');
                checkEmptyQualityReport();
                cy.get('.cvat-quality-control-overview-job-list').should('not.exist');
                goBack();
            });

            it('Check quality report.', () => {
                cy.window().then((window) => (
                    cy.headlessCreateObjects(groundTruthFrames.map((frame, index) => {
                        const gtRect = groundTruthRectangles[index];
                        return {
                            objectType: 'shape',
                            labelName,
                            type: 'rectangle',
                            occluded: false,
                            frame,
                            points: [gtRect.firstX, gtRect.firstY, gtRect.secondX, gtRect.secondY],
                        };
                    }), groundTruthJobId,
                    ).then(() => (
                        window.cvat.server.request(`/api/jobs/${groundTruthJobId}`, {
                            method: 'PATCH',
                            data: {
                                stage: 'acceptance',
                                state: 'completed',
                            },
                        })
                    )).then(() => (
                        cy.headlessCreateObjects(groundTruthFrames.map((frame, index) => {
                            const rect = rectangles[index];
                            return {
                                objectType: 'shape',
                                labelName,
                                type: 'rectangle',
                                occluded: false,
                                frame,
                                points: [rect.firstX, rect.firstY, rect.secondX, rect.secondY],
                            };
                        }), jobId,
                        ))).then(() => {
                        createTaskQualityReport(taskId).then((reportId) => {
                            qualityReportId = reportId;
                        });
                        checkSummaryCard('Jobs compliant', '0 of 1', '0.0%');
                        cy.get('.cvat-quality-control-overview-job-list').within(() => {
                            cy.contains(`#${jobId}`).should('exist');
                            cy.contains('0.0%').should('exist');
                        });
                        goBack();
                    })
                ));
            });

            it('Check quality report is available for download', () => {
                openQualityTab();
                downloadCurrentReport();
                cy.verifyDownload(`quality-report-task_${taskId}-${qualityReportId}.json`);
                goBack();
            });

            it('Keeps the confusion matrix open after a page refresh', () => {
                openQualityControlTab('Requirements');
                cy.contains('.cvat-quality-control-requirements-table tr', 'Base rectangle')
                    .find('.anticon-table')
                    .click();
                cy.get('.cvat-confusion-matrix-page').should('be.visible');
                cy.contains('.cvat-confusion-matrix-table', 'Average Accuracy (micro)').should('be.visible');
                cy.contains('.cvat-confusion-matrix-table', 'Mean Accuracy (macro)').should('be.visible');
                cy.location('hash').should('match', /^#requirements\?matrix=\d+$/);

                cy.reload();
                cy.get('.cvat-confusion-matrix-page').should('be.visible');
                cy.get('.cvat-confusion-matrix-selector').should('contain.text', 'Base rectangle');
                goBack();
            });

            it('Check overview table .csv representation is available for download', () => {
                openQualityTab();
                cy.get('.cvat-quality-control-overview-tab .cvat-table-export-csv-button').click();

                const expectedFileName = `overview-table-task_${taskId}-jobs.csv`;
                cy.verifyDownload(expectedFileName);
                goBack();
            });

            it('Check conflicts.', () => {
                // Conflicts on canvas and sidebar
                cy.visit(`/tasks/${taskId}/jobs/${jobId}`);
                cy.get('.cvat-spinner').should('not.exist');
                cy.get('.cvat-workspace-selector').should('be.visible');

                cy.changeWorkspace('Review');
                cy.get('.cvat-objects-sidebar-tabs').within(() => {
                    cy.contains('[role="tab"]', 'Issues').click();
                });
                cy.get('.cvat-objects-sidebar-show-ground-truth').filter(':visible').click();

                cy.goCheckFrameNumber(groundTruthFrames[0]);
                checkConflicts('error', 2);
                checkHighlight(1);

                cy.goCheckFrameNumber(groundTruthFrames[1]);
                checkConflicts();

                cy.goCheckFrameNumber(groundTruthFrames[2]);
                checkConflicts();

                cy.goCheckFrameNumber(groundTruthFrames[3]);
                checkConflicts('error', 2);
                checkHighlight(1);

                // Conflicts with annotation filter enabled
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

                // Frames with conflicts navigation. Only the first and last ground truth frames
                // hold conflicts now, so the next-frame button jumps straight from one to the other.
                cy.goCheckFrameNumber(groundTruthFrames[0]);

                cy.get('.cvat-issues-sidebar-next-frame').click();
                cy.checkFrameNum(groundTruthFrames[3]);

                cy.interactMenu('Open the task');
            });

            it('Check quality report recompution via UI.', () => {
                openQualityTab();

                const newShape = {
                    objectType: 'shape',
                    labelName,
                    type: 'rectangle',
                    occluded: false,
                    frame: groundTruthFrames[0],
                    points: [310, 70, 490, 190],
                };
                cy.headlessCreateObjects([newShape], jobId).then(() => {
                    recalculateQualityReport();
                    checkSummaryCard('Jobs compliant', '0 of 1', '0.0%');
                    cy.get('.cvat-quality-control-overview-job-list').within(() => {
                        cy.contains(`#${jobId}`).should('exist');
                    });

                    goBack();
                });
            });

            it('Shows columns only for enabled requirements.', () => {
                openQualityTab();

                qualityRequest('GET', `/api/quality/settings?task_id=${taskId}`).then((data) => {
                    const [settings] = data.results;
                    const rectangleRequirement = settings.requirements.find((requirement) => (
                        requirement.is_base && requirement.annotation_type === 'rectangle'
                    ));
                    const polygonRequirement = settings.requirements.find((requirement) => (
                        requirement.is_base && requirement.annotation_type === 'polygon'
                    ));

                    expect(rectangleRequirement).to.exist;
                    expect(polygonRequirement).to.exist;

                    return patchRequirement(rectangleRequirement.id, { enabled: false })
                        .then(() => patchRequirement(polygonRequirement.id, { enabled: true }));
                }).then(() => {
                    cy.reload();
                    cy.get('.cvat-spinner').should('not.exist');
                    cy.get('.cvat-quality-control-overview-job-list .ant-table-thead').within(() => {
                        cy.contains('Base polygon').should('be.visible');
                        cy.contains('Base rectangle').should('not.exist');
                    });
                    goBack();
                });
            });
        });

        describe('Testing honeypots basics', () => {
            const honeyPotsFrames = [0, 1, 2];
            const honeyPotsFrameBase = 100;
            const validationParams = {
                ...defaultValidationParams,
                mode: 'gt_pool',
                framesPerJobCount: 3,
                randomSeed: 1,
                frameSelectionMethod: 'manual',
                frames: [
                    'image_main_task_1.png',
                    'image_main_task_2.png',
                    'image_main_task_3.png',
                ],
            };
            // With specified randomSeed and frameCount honeypots frames are:
            const honeypotsInNormalJob = [84, 62, 16];
            const serverFiles = ['bigArchive.zip'];
            let honeypotsGroundTruthJobId = null;
            let honeypotsJobId = null;
            let honeypotsTaskId = null;

            before(() => {
                cy.headlessLogout();
                cy.visit('/auth/login');
                cy.login();
                createAndOpenTask(
                    { serverFiles, labelName, taskName },
                    validationParams,
                ).then((newTask) => {
                    honeypotsGroundTruthJobId = newTask.groundTruthJobId;
                    honeypotsJobId = newTask.jobId;
                    honeypotsTaskId = newTask.taskId;
                });

                cy.window().then((window) => (
                    cy.headlessCreateObjects(honeyPotsFrames.map((frame, index) => {
                        const gtRect = groundTruthRectangles[index];
                        return {
                            objectType: 'shape',
                            labelName,
                            type: 'rectangle',
                            occluded: false,
                            frame: honeyPotsFrameBase + frame,
                            points: [gtRect.firstX, gtRect.firstY, gtRect.secondX, gtRect.secondY],
                        };
                    }), honeypotsGroundTruthJobId).then(() => (
                        window.cvat.server.request(`/api/jobs/${honeypotsGroundTruthJobId}`, {
                            method: 'PATCH',
                            data: {
                                stage: 'acceptance',
                                state: 'completed',
                            },
                        })
                    )).then(() => cy.headlessCreateObjects(honeypotsInNormalJob.map((frame, index) => {
                        let rect = groundTruthRectangles[index];
                        // Assuming last honeypot frame is bad
                        if (index === honeypotsInNormalJob.length - 1) {
                            rect = rectangles[rectangles.length - 1];
                        }
                        return {
                            objectType: 'shape',
                            labelName,
                            type: 'rectangle',
                            occluded: false,
                            frame,
                            points: [rect.firstX, rect.firstY, rect.secondX, rect.secondY],
                        };
                    }), honeypotsJobId)).then(() => {
                        openQualityControlTab('Management');
                    })
                ));
            });

            after(() => {
                cy.headlessDeleteTask(honeypotsTaskId);
            });

            it('Check honeypots management page contents.', () => {
                cy.get('.cvat-quality-control-management-tab-summary').should('exist');
                cy.contains('.cvat-allocation-summary-excluded', '0').should('exist');
                cy.contains('.cvat-allocation-summary-total', '3').should('exist');
                cy.contains('.cvat-allocation-summary-active', '3').should('exist');
                cy.contains('.cvat-quality-control-validation-mode-hint', 'Honeypots').should('exist');

                cy.get('.cvat-frame-allocation-table').should('exist');
                cy.get('.cvat-allocation-frame-row').should('have.length', 3);
                cy.get('.cvat-allocation-frame-row').each(($el, index) => {
                    cy.wrap($el).within(() => {
                        cy.contains(`#${honeyPotsFrameBase + index}`).should('exist');
                        cy.contains(`image_main_task_${index + 1}.png`).should('exist');
                        cy.contains('N/A').should('exist');
                    });
                });

                cy.contains('.ant-table-column-title', 'Use count').should('exist');
                cy.contains('.ant-table-column-title', 'Quality').should('exist');
            });

            it('Check honeypots management page operations.', () => {
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

                function selectFrames() {
                    cy.get('.cvat-allocation-frame-row').each(($el, index) => {
                        if (index !== 0) {
                            cy.wrap($el).within(() => {
                                cy.get('.ant-table-selection-column input[type="checkbox"]')
                                    .should('not.be.checked')
                                    .check();
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

            it('Delete bad GT frame, see changes in quality report.', () => {
                createTaskQualityReport(honeypotsTaskId).then((reportId) => {
                    qualityReportId = reportId;
                });
                checkSummaryCard('Jobs compliant', '0 of 1', '0.0%');
                clickQualityTab('Management');

                cy.get('.cvat-allocation-frame-row').last().within(() => {
                    cy.get('.cvat-allocation-frame-delete').click();
                });

                cy.get('.cvat-spinner').should('not.exist');
                cy.get('.cvat-frame-allocation-table').should('be.visible');
                cy.get('.cvat-allocation-frame-row').last()
                    .should('have.class', 'cvat-allocation-frame-row-excluded');

                clickQualityTab('Jobs');
                recalculateQualityReport();
                checkSummaryCard('Jobs compliant', '0 of 1', '0.0%');

                clickQualityTab('Management');
                cy.get('.cvat-allocation-frame-row').each(($el, index) => {
                    cy.wrap($el).within(() => {
                        if (index !== honeyPotsFrames.length - 1) {
                            cy.contains('1').should('exist');
                        } else {
                            cy.contains('N/A').should('exist');
                        }
                    });
                });
            });

            it('Check management table .csv representation is available for download', () => {
                cy.get('.cvat-quality-control-management-tab .cvat-table-export-csv-button').click();

                const expectedFileName = `allocation-table-task_${honeypotsTaskId}.csv`;
                const expectedContent = [
                    '100,"image_main_task_1.png",true,,1',
                    '101,"image_main_task_2.png",true,,1',
                    '102,"image_main_task_3.png",false,,1',
                ];
                cy.verifyDownload(expectedFileName);
                cy.checkCsvFileContent(expectedFileName, 'frame,name,active,quality,useCount', 4, (row) => (
                    expect(expectedContent.some((expected) => row.includes(expected))).to.be.true
                ));
            });
        });
    });

    describe('Test honeypots chunks', () => {
        let defaultJobMetaPeriod;
        const chunkReloadPeriod = 100;
        const imagesCount = 6;
        const honeypotsOverheadCount = 3;
        const imageFileName = 'test_honeypot_chunks';
        const honeypotFileName = 'test_honeypot_chunks_different_size';
        const width = 800;
        const height = 800;
        const honeypotWithDifferentWidth = 700;
        const honeypotWithDifferentHeight = 500;
        const posX = 10;
        const posY = 10;
        const color = 'gray';
        const archiveName = 'test_honeypot_chunks.zip';
        const archivePath = `cypress/fixtures/${archiveName}`;
        const imagesFolder = `cypress/fixtures/${imageFileName}`;
        const directoryToArchive = imagesFolder;
        // With specified randomSeed and frameCount honeypots frames are:
        const honeypotsInNormalJob = [0, 2, 5];
        const attrName = 'gt_attr';
        const defaultAttrValue = 'GT attr';
        const multiAttrParams = false;
        const forProject = false;
        const attachToProject = false;
        const projectName = null;
        const expectedResult = 'success';
        const projectSubsetFieldValue = null;
        const advancedConfigurationParams = false;
        const qualityParams = {
            validationMode: 'Honeypots',
        };

        let chunksJobId = null;
        let chunksTaskId = null;

        function updateValidationLayout(cvatWindow, frames) {
            return cvatWindow.cvat.server.request(`/api/jobs/${chunksJobId}/validation_layout`, {
                method: 'PATCH',
                data: {
                    frame_selection_method: 'manual',
                    honeypot_real_frames: frames,
                },
            });
        }

        function checkHoneypotsFrameSizes(checkWidth, checkHeight) {
            honeypotsInNormalJob.forEach((frame) => {
                cy.goCheckFrameNumber(frame);
                cy.get('.cvat-spinner').should('not.exist');
                cy.get('#cvat_canvas_background').should('exist');
                cy.get('#cvat_canvas_background').should('have.attr', 'width', checkWidth);
                cy.get('#cvat_canvas_background').should('have.attr', 'height', checkHeight);
            });
        }

        before(() => {
            cy.headlessLogout();
            cy.visit('/auth/login');
            cy.login();
            cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, taskName, imagesCount);
            cy.imageGenerator(
                imagesFolder, honeypotFileName, honeypotWithDifferentWidth, honeypotWithDifferentHeight,
                color, posX, posY, taskName, honeypotsOverheadCount,
            );
            cy.createZipArchive(directoryToArchive, archivePath);
            cy.intercept('POST', '/api/tasks/*/data**', (req) => {
                if (req.body.validation_params) {
                    // Mutate req.body in place. Reassigning req.body wholesale is not reliably
                    // applied to the outgoing request by Cypress, which would let the form's
                    // original validation_params (carrying frames_per_job_share) reach the
                    // server and conflict with frames_per_job_count.
                    // eslint-disable-next-line no-param-reassign
                    req.body.validation_params = {
                        mode: 'gt_pool',
                        frames_per_job_count: 3,
                        random_seed: 1,
                        frame_selection_method: 'manual',
                        frames: [
                            'test_honeypot_chunks_1.png',
                            'test_honeypot_chunks_2.png',
                            'test_honeypot_chunks_3.png',
                            'test_honeypot_chunks_different_size_1.png',
                            'test_honeypot_chunks_different_size_2.png',
                            'test_honeypot_chunks_different_size_3.png',
                        ],
                    };
                }
                req.continue();
            });
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
            cy.getJobIdFromIdx(0).then((_jobId) => {
                chunksJobId = _jobId;
            });
            cy.url().then((url) => {
                chunksTaskId = Number(url.split('/').slice(-1)[0].split('?')[0]);
            });
            cy.window().then((cvatWindow) => {
                const cvatConfig = cvatWindow.cvat.config;
                defaultJobMetaPeriod = cvatConfig.jobMetaDataReloadPeriod;
                cvatConfig.jobMetaDataReloadPeriod = chunkReloadPeriod;
                // set frames with 800x800
                updateValidationLayout(cvatWindow, [6, 7, 8]);
            });
        });

        after(() => {
            cy.window().then((cvatWindow) => {
                const cvatConfig = cvatWindow.cvat.config;
                cvatConfig.jobMetaDataReloadPeriod = defaultJobMetaPeriod;
            });
            cy.headlessDeleteTask(chunksTaskId);
            cy.headlessLogout();
        });

        it('Check honeypots changing pipeline. Check if user sees new images.', () => {
            cy.get('.cvat-task-job-list').within(() => {
                cy.contains('a', `Job #${chunksJobId}`).click();
            });

            cy.get('.cvat-spinner').should('not.exist');
            cy.get('#cvat_canvas_background').should('exist').and('be.visible');

            checkHoneypotsFrameSizes('800px', '800px');

            cy.interactMenu('Open the task');

            // Update honeypots (they are 700x500)
            cy.window().then((cvatWindow) => updateValidationLayout(cvatWindow, [9, 10, 11])).then(() => {
                cy.get('.cvat-task-job-list').within(() => {
                    cy.contains('a', `Job #${chunksJobId}`).click();
                });
                cy.get('.cvat-spinner').should('not.exist');
                cy.get('#cvat_canvas_background').should('exist').and('be.visible');

                checkHoneypotsFrameSizes('700px', '500px');

                cy.interactMenu('Open the task');
            });
        });
    });

    describe('Regression tests', () => {
        const serverFiles = ['bigArchive.zip'];
        let regressionGroundTruthJobId = null;
        let regressionTaskId = null;

        before(() => {
            cy.headlessLogout();
            cy.visit('/auth/login');
            cy.login();
            createAndOpenTask(
                {
                    serverFiles,
                    labelName,
                    taskName,
                    startFrame: 5,
                    segmentSize: 3,
                    frameFilter: 'step=2',
                },
                {
                    mode: 'gt',
                    frameSelectionMethod: 'random_per_job',
                    framesPerJobCount: 1,
                },
            ).then((newTask) => {
                regressionGroundTruthJobId = newTask.groundTruthJobId;
                regressionTaskId = newTask.taskId;
            });
        });

        after(() => {
            if (regressionTaskId) {
                cy.headlessDeleteTask(regressionTaskId);
            }
        });

        afterEach(() => {
            cy.window().then((window) => {
                window.cvat.server.request(`/api/jobs/${regressionGroundTruthJobId}`, {
                    method: 'DELETE',
                });
            });
        });

        it('Compute quality report, check jobs table', () => {
            cy.get('.cvat-job-item').contains('a', `Job #${regressionGroundTruthJobId}`).click();
            cy.get('.cvat-spinner').should('not.exist');
            cy.get('.cvat-player-frame-selector').should('exist').and('be.visible');
            let firstAvailableFrame = null;
            cy.get('.cvat-player-frame-selector').within(() => {
                cy.get('input[role="spinbutton"]')
                    .invoke('val')
                    .then((frameNum) => {
                        firstAvailableFrame = +frameNum;
                    });
            });
            cy.interactMenu('Open the task');
            cy.get('.cvat-task-details').should('exist');
            cy.window().then((window) => (
                cy.headlessCreateObjects([{
                    objectType: 'track',
                    labelName,
                    frame: firstAvailableFrame,
                    shapes: [{
                        frame: firstAvailableFrame,
                        type: 'rectangle',
                        occluded: false,
                        points: [250, 350, 350, 450],
                    }],
                }], regressionGroundTruthJobId,
                ).then(() => (
                    window.cvat.server.request(`/api/jobs/${regressionGroundTruthJobId}`, {
                        method: 'PATCH',
                        data: {
                            stage: 'acceptance',
                            state: 'completed',
                        },
                    })
                )).then(() => {
                    openQualityTab();
                    recalculateQualityReport();
                    cy.get('.cvat-quality-control-overview-job-list .ant-pagination-item').last().invoke('text').then((page) => {
                        const lastPage = Number.parseInt(page, 10);

                        for (let i = 0; i < lastPage; i++) {
                            cy.get('.cvat-quality-control-overview-job-list .ant-table-row').each((row) => {
                                cy.get(row).should('not.include.text', 'N/A');
                            });

                            cy.get('.cvat-quality-control-overview-job-list .ant-pagination-next').click();
                        }
                    });
                })
            ));
        });
    });

    describe('Testing Quality Control For Project', () => {
        const serverFiles = ['images/image_1.jpg', 'images/image_2.jpg', 'images/image_3.jpg'];
        const projectDetails = {
            name: 'Analytics project',
            labels: [
                {
                    name: 'car',
                    type: 'rectangle',
                    attributes: [],
                },
            ],
        };

        let projectId = null;
        let projectTaskId = null;
        before(() => {
            cy.headlessLogout();
            cy.visit('/auth/login');
            cy.login();
            cy.headlessCreateProject(projectDetails).then((createdProject) => {
                const createdProjectId = createdProject.projectId;
                createAndOpenTask(
                    {
                        serverFiles, taskName, labelName, projectId: createdProjectId,
                    },
                    defaultValidationParams,
                ).then((newTask) => {
                    projectTaskId = newTask.taskId;
                    projectId = createdProjectId;
                });
            });
        });

        after(() => {
            cy.headlessDeleteTask(projectTaskId);
            cy.headlessDeleteProject(projectId);
        });

        it('check quality report generation', () => {
            cy.goToProjectsList();
            cy.clickInProjectMenu('Quality control', false, projectDetails.name);
            cy.contains('.cvat-quality-control-page-tabs', 'Requirements').should('exist');
            cy.contains('.cvat-quality-control-page-tabs', 'Tasks').should('exist');
            cy.contains('.cvat-quality-control-page-tabs', 'Jobs').should('exist');
            cy.get('.cvat-quality-control-requirements-tab').should('be.visible');
            checkEmptyQualityReport();
            recalculateQualityReport();
            checkSummaryCard('Completed requirements', '0 of 0', '0.0%');
            downloadCurrentReport();
            verifyQualityReportDownloaded(true, projectId);
        });

        it('check quality overview pages after report is generated', () => {
            checkSummaryCard('Completed requirements', '0 of 0', '0.0%');

            clickQualityTab('Tasks');
            checkSummaryCard('Tasks compliant', '0 of 1', '0.0%');
            cy.get('.cvat-quality-control-overview-task-list').within(() => {
                cy.contains(`#${projectTaskId}`).should('exist');
                cy.contains('Completion rate').should('exist');
            });

            clickQualityTab('Jobs');
            checkSummaryCard('Jobs compliant', '0 of 1', '0.0%');
            cy.get('.cvat-quality-control-overview-job-list').within(() => {
                cy.contains('ID').should('exist');
                cy.contains('Completion rate').should('exist');
            });
        });

        it('check task settings page is available from project task', () => {
            cy.intercept('GET', '/api/quality/settings?**').as('getQualitySettings');
            cy.visit(`/tasks/${projectTaskId}/quality-control#settings`);
            cy.wait('@getQualitySettings', { timeout: 60000 });
            cy.url().should('include', `/tasks/${projectTaskId}/quality-control`);
            cy.location('hash').should('eq', '#settings');
            cy.get('.cvat-quality-control-loading', { timeout: 60000 }).should('not.exist');
            cy.get('.cvat-quality-control-page-tabs')
                .contains('.ant-tabs-tab-active', 'Settings')
                .should('exist');
            cy.get('.cvat-quality-control-settings-tab', { timeout: 60000 }).should('be.visible');
        });
    });
});

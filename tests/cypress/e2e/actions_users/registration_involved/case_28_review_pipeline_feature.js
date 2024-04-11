// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Review pipeline feature', () => {
    const serverFiles = ['archive.zip'];
    const additionalUsers = {
        annotator: {
            username: 'annotator',
            firstName: 'Firstname',
            lastName: 'Lastname',
            emailAddr: 'annotator@local.local',
            password: 'UfdU21!dds',
        },
        reviewer: {
            username: 'reviewer',
            firstName: 'Firstname',
            lastName: 'Lastname',
            emailAddr: 'reviewer@local.local',
            password: 'Fv5Df3#f55g',
        },
    };

    const taskSpec = {
        labels: [
            {
                name: 'label 1',
                attributes: [{
                    name: 'attribute 1',
                    mutable: false,
                    input_type: 'text',
                    default_value: 'default value',
                    values: [],
                }],
                type: 'any',
            },
        ],
        name: 'Review pipeline task',
        project_id: null,
        source_storage: { location: 'local' },
        target_storage: { location: 'local' },
    };

    const dataSpec = {
        server_files: serverFiles,
        image_quality: 70,
        use_zip_chunks: true,
        use_cache: true,
        sorting_method: 'lexicographical',
    };

    let taskID = null;
    let jobIDs = null;

    before(() => {
        cy.visit('auth/login');
        cy.get('.cvat-login-form-wrapper').should('exist').and('be.visible');

        // register additional users
        cy.clearCookies();
        for (const user of Object.values(additionalUsers)) {
            cy.headlessCreateUser(user);
            cy.clearCookies();
        }

        // create main task
        cy.login();
        cy.get('.cvat-tasks-page').should('exist').and('be.visible');
        cy.headlessCreateTask(taskSpec, dataSpec).then((response) => {
            taskID = response.taskID;
            jobIDs = response.jobIDs;
        });
        cy.logout();
    });

    after(() => {
        cy.logout();
        cy.getAuthKey().then((response) => {
            const authKey = response.body.key;
            cy.deleteUsers(response, [
                additionalUsers.annotator.username,
                additionalUsers.reviewer.username,
            ]);

            if (taskID) {
                cy.request({
                    method: 'DELETE',
                    url: `/api/tasks/${taskID}`,
                    headers: {
                        Authorization: `Token ${authKey}`,
                    },
                });
            }
        });
    });

    const customIssueDescription = 'Issue with a custom text';
    describe('Testing review pipeline: interaction between requester/annotator/reviewer', {
        scrollBehavior: false,
    }, () => {
        it('Review pipeline, part 1', () => {
            // Annotator, reviewer login, the task is not visible
            for (const user of Object.values(additionalUsers)) {
                cy.login(user.username, user.password);
                cy.get('.cvat-tasks-page').should('exist').and('be.visible');
                cy.contains('.cvat-item-task-name', taskSpec.name).should('not.exist');
                cy.logout();
            }

            // Requester logins and assignes annotator, then logouts
            cy.login();
            cy.openTask(taskSpec.name);
            cy.assignJobToUser(jobIDs[0], additionalUsers.annotator.username);
            cy.logout();

            // Annotator logins, opens the job, annotates it and saves
            cy.login(additionalUsers.annotator.username, additionalUsers.annotator.password);
            cy.openJobFromJobsPage(jobIDs[0]);
            for (let i = 0; i < 4; i++) {
                cy.createRectangle({
                    points: 'By 2 Points',
                    type: 'Shape',
                    labelName: taskSpec.labels[0].name,
                    firstX: 400,
                    firstY: 350,
                    secondX: 500,
                    secondY: 450,
                });

                cy.goToNextFrame(i + 1);
            }
            cy.saveJob();

            // Annotator updates job state, both times update is successfull, logout
            // check: https://github.com/cvat-ai/cvat/pull/7158
            cy.intercept('PATCH', `/api/jobs/${jobIDs[0]}`).as('updateJobState');
            cy.setJobState('completed');
            cy.wait('@updateJobState').its('response.statusCode').should('equal', 200);
            cy.setJobState('completed');
            cy.wait('@updateJobState').its('response.statusCode').should('equal', 200);
            cy.logout();

            // Requester logins and assignes a reviewer
            cy.login();
            cy.openTask(taskSpec.name);
            cy.get('.cvat-job-item').first().within(() => {
                cy.get('.cvat-job-item-state').should('have.text', 'Completed');
                cy.get('.cvat-job-item-stage .ant-select-selection-item').should('have.text', 'annotation');
            });
            cy.setJobStage(jobIDs[0], 'validation');
            cy.assignJobToUser(jobIDs[0], additionalUsers.reviewer.username);
            cy.logout();

            // The reviewer logins, opens the job, review mode is opened automatically
            cy.login(additionalUsers.reviewer.username, additionalUsers.reviewer.password);
            cy.openJobFromJobsPage(jobIDs[0]);
            cy.get('.cvat-workspace-selector').should('have.text', 'Review');

            // The reviewer creates quick issue "Incorrect position"
            cy.createIssueFromObject(1, 'Quick issue: incorrect position');
            cy.checkIssueLabel('Wrong position');

            // Item submenu: "Quick issue ..." does not appear, because we did not create custom issues yet
            cy.get('#cvat_canvas_shape_1').rightclick();
            cy.get('.cvat-canvas-context-menu')
                .contains('.cvat-context-menu-item', 'Quick issue ...')
                .should('not.exist');
            cy.get('#cvat_canvas_content').click({ force: true }); // Close the context menu

            // The reviewer creates different issues with a custom text
            cy.goToNextFrame(1);
            cy.createIssueFromObject(2, 'Open an issue ...', customIssueDescription);
            cy.checkIssueLabel(customIssueDescription);

            // Now item submenu: "Quick issue ..." appears and it contains several latest options
            // Use one of items to create quick issue on another object on another frame. Issue has been created
            cy.goToNextFrame(2);
            cy.createIssueFromObject(3, 'Quick issue ...', customIssueDescription);
            // The reviewer reloads the page, all the issues still exist
            cy.reload();
            cy.get('.cvat-canvas-container').should('exist');
        });

        it('Review pipeline, part 2', () => {
            // this is the same test, but Cypress can't handle too many commands
            // in one test, sometimes raising out of memory exception
            // this test is devided artifically into two parts
            // https://github.com/cypress-io/cypress/issues/27415

            const countIssuesByFrame = [[0, 1, 'Wrong position'], [1, 1, customIssueDescription], [2, 1, customIssueDescription]];
            for (const [frame, issues, text] of countIssuesByFrame) {
                cy.goCheckFrameNumber(frame);
                cy.get('.cvat_canvas_issue_region').should('have.length', issues);
                cy.checkIssueLabel(text);
            }

            // The reviewer creates issues using button on left panel
            // issue from a rectangle, and issue from a point
            const rectangleIssue = {
                type: 'rectangle',
                description: 'rectangle issue',
                firstX: 250,
                firstY: 100,
                secondX: 350,
                secondY: 200,
            };

            const pointIssue = {
                type: 'point',
                description: 'point issue',
                firstX: 380,
                firstY: 100,
            };
            cy.createIssueFromControlButton(rectangleIssue);
            cy.createIssueFromControlButton(pointIssue);
            countIssuesByFrame[2][1] = 3;

            // The reviewer goes to "Standard mode", creates an object, saves the job successfully
            cy.changeWorkspace('Standard');
            cy.createPoint({
                type: 'Shape',
                labelName: taskSpec.labels[0].name,
                pointsMap: [{ x: 650, y: 350 }],
                complete: true,
                numberOfPoints: null,
            });
            cy.saveJob();
            cy.get('.cvat-notification-notice-save-annotations-failed').should('not.exist');

            // Finally, the reviewer rejects the job, logouts
            cy.setJobState('rejected');
            cy.logout();

            // Requester logins and assignes the job to the annotator, sets job stage to annotation
            cy.login();
            cy.get('.cvat-tasks-page').should('exist').and('be.visible');
            cy.openTask(taskSpec.name);
            cy.get('.cvat-job-item').first().within(() => {
                cy.get('.cvat-job-item-state').should('have.text', 'Rejected');
                cy.get('.cvat-job-item-stage .ant-select-selection-item').should('have.text', 'validation');
            });
            cy.setJobStage(jobIDs[0], 'annotation');
            cy.assignJobToUser(jobIDs[0], additionalUsers.annotator.username);
            cy.logout();

            // Annotator logins, opens the job on standard workspace, sees the issues
            cy.login(additionalUsers.annotator.username, additionalUsers.annotator.password);
            cy.openJobFromJobsPage(jobIDs[0]);
            cy.get('.cvat-workspace-selector').should('have.text', 'Standard');

            // Go to "Issues" tab at right sidebar and select an issue
            cy.get('.cvat-objects-sidebar').within(() => {
                cy.contains('[role="tab"]', 'Issues').click();
                cy.contains('[role="tab"]', 'Issues').should('have.attr', 'aria-selected', 'true');
            });

            for (const [frame, issues] of countIssuesByFrame) {
                cy.goCheckFrameNumber(frame);
                cy.get('.cvat-objects-sidebar-issue-item').should('have.length', issues);
                cy.get('.cvat-hidden-issue-label').should('have.length', issues);
                cy.get('.cvat_canvas_issue_region').should('have.length', issues);

                // Annotator selects an issue on sidebar
                // Issue indication has changed the color for highlighted issue
                cy.collectIssueRegionIDs().then((issueIDs) => {
                    for (const issueID of issueIDs) {
                        const objectsSidebarIssueItem = `#cvat-objects-sidebar-issue-item-${issueID}`;
                        const canvasIssueRegion = `#cvat_canvas_issue_region_${issueID}`;
                        cy.get(objectsSidebarIssueItem).trigger('mouseover');
                        cy.get(canvasIssueRegion).should('have.attr', 'fill', 'url(#cvat_issue_region_pattern_2)');
                        cy.get(objectsSidebarIssueItem).trigger('mouseout');
                        cy.get(canvasIssueRegion).should('have.attr', 'fill', 'url(#cvat_issue_region_pattern_1)');
                    }
                });
            }

            // Issue navigation. Navigation works and go only to frames with issues
            cy.goCheckFrameNumber(0);
            cy.get('.cvat-issues-sidebar-previous-frame')
                .should('have.attr', 'style')
                .and('contain', 'opacity: 0.5;'); // the element is not active
            cy.get('.cvat-issues-sidebar-next-frame').should('be.visible').click();
            cy.checkFrameNum(1);
            cy.get('.cvat-issues-sidebar-next-frame').should('be.visible').click();
            cy.checkFrameNum(2);
            cy.get('.cvat-issues-sidebar-next-frame').should('have.attr', 'style')
                .and('contain', 'opacity: 0.5;'); // the element is not active
            cy.get('.cvat-issues-sidebar-previous-frame').should('be.visible').click();
            cy.checkFrameNum(1);

            cy.goCheckFrameNumber(1);
            cy.collectIssueLabel().then((issueLabelList) => {
                for (let label = 0; label < issueLabelList.length; label++) {
                    cy.resolveIssue(issueLabelList[label], 'Resolved issue');
                }
            });
            cy.goCheckFrameNumber(0);
            cy.get('.cvat-issues-sidebar-hidden-resolved-status').click();
            cy.get('.cvat-issues-sidebar-next-frame').should('be.visible').click();
            cy.checkFrameNum(2);
            cy.get('.cvat-issues-sidebar-hidden-resolved-status').click();

            // Hide all issues. All issues are hidden on all frames
            cy.get('.cvat-issues-sidebar-shown-issues').click();
            for (const [frame, issues] of countIssuesByFrame) {
                cy.goCheckFrameNumber(frame);
                cy.get('.cvat-objects-sidebar-issue-item').should('have.length', issues);
                cy.get('.cvat-hidden-issue-label').should('have.length', 0);
                cy.get('.cvat_canvas_issue_region').should('have.length', 0);
            }

            // Show them back
            cy.get('.cvat-issues-sidebar-hidden-issues').click();
            for (const [frame, issues] of countIssuesByFrame) {
                cy.goCheckFrameNumber(frame);
                cy.get('.cvat-objects-sidebar-issue-item').should('have.length', issues);
                cy.get('.cvat-hidden-issue-label').should('have.length', issues);
                cy.get('.cvat_canvas_issue_region').should('have.length', issues);
            }

            // Comment issues and resolve them
            for (const [frame] of countIssuesByFrame) {
                if (frame !== 1) {
                    cy.goCheckFrameNumber(frame);
                    cy.collectIssueLabel().then((issueLabelList) => {
                        for (let label = 0; label < issueLabelList.length; label++) {
                            cy.resolveIssue(issueLabelList[label], 'Resolved issue');
                        }
                    });
                }
            }

            cy.setJobState('completed');
            cy.logout();

            // Requester logins, removes all the issues, finishes the job
            // Now job has correct status accepted/completed

            cy.login();
            cy.openJobFromJobsPage(jobIDs[0]);
            // Comment issues and resolve them
            for (const [frame] of countIssuesByFrame) {
                cy.goCheckFrameNumber(frame);

                cy.collectIssueLabel().then((issueLabelList) => {
                    for (let label = 0; label < issueLabelList.length; label++) {
                        cy.reopenIssue(issueLabelList[label]);
                    }
                });

                cy.collectIssueLabel().then((issueLabelList) => {
                    for (let label = 0; label < issueLabelList.length; label++) {
                        cy.removeIssue(issueLabelList[label]);
                    }
                });
            }

            // check: https://github.com/cvat-ai/cvat/issues/7206
            cy.interactMenu('Finish the job');
            cy.get('.cvat-modal-content-finish-job').within(() => {
                cy.contains('button', 'Continue').click();
            });
            cy.get('.cvat-job-item').first().within(() => {
                cy.get('.cvat-job-item-state').should('have.text', 'Completed');
                cy.get('.cvat-job-item-stage .ant-select-selection-item').should('have.text', 'acceptance');
            });
        });
    });
});

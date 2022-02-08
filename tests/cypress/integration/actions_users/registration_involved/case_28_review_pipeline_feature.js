// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Review pipeline feature', () => {
    const caseId = '28';
    const labelName = `Case ${caseId}`;
    const taskName = 'Review pipeline feature';
    const attrName = `Attr for ${labelName}`;
    const textDefaultValue = 'Some default value for type Text';
    const imagesCount = 30;
    const imageFileName = `image_${labelName.replace(' ', '_').toLowerCase()}`;
    const width = 800;
    const height = 800;
    const posX = 10;
    const posY = 10;
    const color = 'gray';
    const archiveName = `${imageFileName}.zip`;
    const archivePath = `cypress/fixtures/${archiveName}`;
    const imagesFolder = `cypress/fixtures/${imageFileName}`;
    const directoryToArchive = imagesFolder;
    const advancedConfigurationParams = {
        multiJobs: true,
        segmentSize: 10,
    };

    // eslint-disable-next-line no-unused-vars
    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };

    // eslint-disable-next-line no-unused-vars
    const createRectangleShape2PointsSecond = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName,
        firstX: 400,
        firstY: 350,
        secondX: 500,
        secondY: 450,
    };

    // eslint-disable-next-line no-unused-vars
    const createPointsShape = {
        type: 'Shape',
        labelName,
        pointsMap: [{ x: 650, y: 350 }],
        complete: true,
        numberOfPoints: null,
    };

    // eslint-disable-next-line no-unused-vars
    const createPointsShapeSecond = {
        type: 'Shape',
        labelName,
        pointsMap: [{ x: 700, y: 350 }],
        complete: true,
        numberOfPoints: null,
    };

    // eslint-disable-next-line no-unused-vars
    const createPointsShapeThird = {
        type: 'Shape',
        labelName,
        pointsMap: [{ x: 750, y: 350 }],
        complete: true,
        numberOfPoints: null,
    };

    // eslint-disable-next-line no-unused-vars
    const createPointsShapeFourth = {
        type: 'Shape',
        labelName,
        pointsMap: [{ x: 700, y: 400 }],
        complete: true,
        numberOfPoints: null,
    };

    const secondUserName = 'Pipsecuser';
    const thirdUserName = 'Pipthirduser';

    const secondUser = {
        firstName: `${secondUserName} fitstname`,
        lastName: `${secondUserName} lastname`,
        emailAddr: `${secondUserName.toLowerCase()}@local.local`,
        password: 'UfdU21!dds',
    };
    const thirdUser = {
        firstName: `${thirdUserName} fitstname`,
        lastName: `${thirdUserName} lastname`,
        emailAddr: `${thirdUserName.toLowerCase()}@local.local`,
        password: 'Fv5Df3#f55g',
    };

    // eslint-disable-next-line no-unused-vars
    const customeIssueDescription = 'Custom issue';

    // eslint-disable-next-line no-unused-vars
    const createIssueRectangle = {
        type: 'rectangle',
        description: 'rectangle issue',
        firstX: 550,
        firstY: 100,
        secondX: 650,
        secondY: 200,
    };

    // eslint-disable-next-line no-unused-vars
    const createIssuePoint = {
        type: 'point',
        description: 'point issue',
        firstX: 700,
        firstY: 100,
    };

    before(() => {
        cy.clearLocalStorageSnapshot();
        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
        cy.createZipArchive(directoryToArchive, archivePath);
        cy.visit('auth/register');
    });

    beforeEach(() => {
        cy.restoreLocalStorage();
    });

    afterEach(() => {
        cy.saveLocalStorage();
    });

    after(() => {
        cy.logout();
        cy.getAuthKey().then((authKey) => {
            cy.deleteUsers(authKey, [secondUserName, thirdUserName]);
            cy.deleteTasks(authKey, [taskName]);
        });
    });

    describe(`Testing "${labelName}"`, () => {
        it('Registration of required users.', () => {
            cy.userRegistration(
                secondUser.firstName,
                secondUser.lastName,
                secondUserName,
                secondUser.emailAddr,
                secondUser.password,
            );
            cy.logout(secondUserName);
            cy.goToRegisterPage();
            cy.userRegistration(
                thirdUser.firstName,
                thirdUser.lastName,
                thirdUserName,
                thirdUser.emailAddr,
                thirdUser.password,
            );
            cy.logout(thirdUserName);
        });

        it('First user login. Create a task. Open the task. Assign to himself.', () => {
            cy.login();
            cy.createAnnotationTask(
                taskName,
                labelName,
                attrName,
                textDefaultValue,
                archiveName,
                null,
                advancedConfigurationParams,
            );
            cy.openTask(taskName);
            cy.logout();
        });

        it('Login the second, the third user. The task is missing.', () => {
            cy.login(secondUserName, secondUser.password);
            cy.contains('.cvat-item-task-name', taskName).should('not.exist');
            cy.logout(secondUserName);
            cy.login(thirdUserName, thirdUser.password);
            cy.contains('.cvat-item-task-name', taskName).should('not.exist');
            cy.logout(thirdUserName);
        });

        it('First user login. Assign the first job to the second user.', () => {
            cy.login();
            cy.openTask(taskName);
            cy.assignJobToUser(0, secondUserName);
        });

        /* FIXME: Second user has access to a job inside the task. Need to redesign openTaskJob.
        it.skip('Second user login. Open the task, open the job and annotates it.', () => {
            cy.login(secondUserName, secondUser.password);
            cy.openTaskJob(taskName, 0, false);
            cy.createRectangle(createRectangleShape2PointsSecond);
            for (let i = 1; i < 4; i++) {
                cy.createRectangle(createRectangleShape2Points);
                cy.goToNextFrame(i);
            }
        });

        it('Second user sends the job to review.', () => {
            cy.intercept('POST', '/api/server/logs').as('sendLogs');
            cy.interactMenu('Request a review');
            cy.contains('.cvat-modal-content-save-job', 'The job has unsaved annotations')
                .should('exist')
                .within(() => {
                    cy.contains('[type="button"]', 'OK').click();
                });
            cy.wait('@sendLogs').its('response.statusCode').should('equal', 201);
            cy.get('.cvat-request-review-dialog')
                .should('exist')
                .within(() => {
                    cy.get('.cvat-user-search-field').click();
                });
            cy.get('.ant-select-dropdown').within(() => {
                cy.contains(new RegExp(`^${thirdUserName}`, 'g')).click();
            });
            cy.contains('.cvat-request-review-dialog', 'Reviewer:').within(() => {
                cy.contains('[type="button"]', 'Submit').click();
            });
            cy.url().should('include', '/tasks');
            cy.contains('.cvat-task-details', taskName).should('exist');
             // Check status, assignee, reviewer of the job
            cy.checkJobStatus(0, 'validation', secondUserName, thirdUserName);
        });

        it('Second user opens the job again, switches to standard mode and tried ' +
           'to change anything and save changes. The request will be rejected with 403 code.', () => {
            cy.openJob(0, false);
            cy.get('.cvat-workspace-selector').should('have.text', 'Review');
            cy.changeWorkspace('Standard', labelName);
            cy.createPoint(createPointsShape);
            cy.saveJob('PATCH', 403);
            cy.get('.cvat-notification-notice-save-annotations-failed')
                .should('exist')
                .within(() => {
                    cy.get('[data-icon="close"]').click(); // Close the notice.
                });
            cy.goToTaskList();
            cy.logout(secondUserName);
        });

        it('The third user opens the job. Review mode is opened automatically.', () => {
            cy.login(thirdUserName, thirdUser.password);
            cy.openTaskJob(taskName, 0, false);
            cy.get('.cvat-workspace-selector').should('have.text', 'Review');
        });

        it('Use quick issues "Incorrect position". Issue will be created immediately.', () => {
            cy.createIssueFromObject('#cvat_canvas_shape_1', 'Quick issue: incorrect position');
            cy.checkIssueLabel('Wrong position');
            cy.get('.cvat_canvas_issue_region').should('have.length', 1);
        });

        it('Item submenu: "Quick issue ..." does not appear.', () => {
            cy.get('#cvat_canvas_shape_2').trigger('mousemove').rightclick();
            cy.get('.cvat-canvas-context-menu')
                .contains('.cvat-context-menu-item', 'Quick issue ...')
                .should('not.exist');
            cy.get('.cvat-canvas-container').click(); // Close the context menu
        });

        it('Create different issues with a custom text.', () => {
            cy.createIssueFromObject('#cvat_canvas_shape_2', 'Open an issue ...', customeIssueDescription);
            cy.checkIssueLabel(customeIssueDescription);
            cy.get('.cvat_canvas_issue_region').should('have.length', 2);
        });

        it('Now item submenu: "Quick issue ..." appears and it contains several latest options.', () => {
            cy.get('#cvat_canvas_shape_1').trigger('mousemove', { force: true }).rightclick({ force: true });
            cy.get('.cvat-canvas-context-menu')
                .contains('.cvat-context-menu-item', 'Quick issue ...')
                .should('exist')
                .trigger('mousemove')
                .trigger('mouseover');
            cy.get('.cvat-quick-issue-from-latest-item').within(() => {
                cy.contains('.cvat-context-menu-item', new RegExp(`^${customeIssueDescription}$`, 'g'))
                    .should('exist')
                    .and('have.text', customeIssueDescription);
            });
        });

        it('Use one of items to create quick issue on another object on another frame. Issue has been created.', () => {
            cy.goCheckFrameNumber(2);
            cy.createIssueFromObject('#cvat_canvas_shape_4', 'Quick issue: incorrect attribute');
            cy.get('.cvat_canvas_issue_region').should('have.length', 1);
            cy.checkIssueLabel('Wrong attribute');
            cy.goCheckFrameNumber(0); // Back to first frame
        });

        it('Reload page. All the issue still exists.', () => {
            cy.reload();
            cy.get('.cvat-canvas-container').should('exist');
            cy.get('.cvat_canvas_issue_region').should('have.length', 2);
            cy.checkIssueLabel(customeIssueDescription);
            cy.checkIssueLabel('Wrong position');
        });

        it('Use button on the left panel to create a couple of issues (in the first case ' +
           'draw a rectangle, in the second draw a point).', () => {
            cy.createIssueFromControlButton(createIssueRectangle);
            cy.createIssueFromControlButton(createIssuePoint);
        });

        it('Go to "Standard mode". Create a couple of objects. Save the job. Saving was successful.', () => {
            cy.changeWorkspace('Standard', labelName);
            cy.createPoint(createPointsShape);
            cy.saveJob();
            cy.get('.cvat-notification-notice-save-annotations-failed').should('not.exist');
        });

        it('Reject review. The third user was redirected to a task page. The job has status "annotation"', () => {
            cy.interactMenu('Submit the review');
            cy.submitReview('Reject');
            cy.url().should('include', '/tasks');
            cy.contains('.cvat-task-details', taskName).should('exist');
            cy.checkJobStatus(0, 'annotation', secondUserName, thirdUserName);
        });

        it('Reopen the job. Change something there. Save work. That saving wasn't successful. ' +
           'The third user logout.", () => {
            cy.openJob(0, false);
            cy.createPoint(createPointsShapeSecond);
            cy.saveJob('PATCH', 403);
            cy.get('.cvat-notification-notice-save-annotations-failed')
                .should('exist')
                .within(() => {
                    cy.get('[data-icon="close"]').click({ multiple: true }); // Close the notice.
                });
            cy.goToTaskList();
            cy.logout(thirdUserName);
        });

        it('The second user login. Opens the job again. All issues are visible.', () => {
            cy.login(secondUserName, secondUser.password);
            cy.openTaskJob(taskName, 0, false);
            cy.get('.cvat-workspace-selector').should('have.text', 'Standard');
            for (const j of [
                customeIssueDescription,
                'Wrong position',
                createIssueRectangle.description,
                createIssuePoint.description,
            ]) {
                cy.checkIssueLabel(j);
            }
            cy.goCheckFrameNumber(2);
            cy.checkIssueLabel('Wrong attribute');
            cy.goCheckFrameNumber(0);
        });

        it('Go to "Issues" tab at right sidebar and select an issue.', () => {
            cy.get('.cvat-objects-sidebar').within(() => {
                cy.contains('[role="tab"]', 'Issues').click().should('have.attr', 'aria-selected', 'true');
            });
            cy.get('.cvat-objects-sidebar-issues-list-header').should('be.visible');
            cy.get('.cvat-objects-sidebar-issue-item').should('have.length', 4);
            cy.get('.cvat-hidden-issue-label').should('have.length', 4);
            cy.get('.cvat_canvas_issue_region').should('have.length', 4);
        });

        it('Select an issue on sidebar. Issue indication has changed the color for highlighted issue', () => {
            cy.collectIssueRegionId().then(($issueRegionList) => {
                for (const issueRegionID of $issueRegionList) {
                    const objectsSidebarIssueItem = `#cvat-objects-sidebar-issue-item-${issueRegionID}`;
                    const canvasIssueRegion = `#cvat_canvas_issue_region_${issueRegionID}`;
                    cy.get(objectsSidebarIssueItem).trigger('mousemove').trigger('mouseover');
                    cy.get(canvasIssueRegion).should('have.attr', 'fill', 'url(#cvat_issue_region_pattern_2)');
                    cy.get(objectsSidebarIssueItem).trigger('mouseout');
                    cy.get(canvasIssueRegion).should('have.attr', 'fill', 'url(#cvat_issue_region_pattern_1)');
                }
            });
        });

        it('Issue navigation. Navigation works and go only to frames with issues.', () => {
            cy.get('.cvat-issues-sidebar-previous-frame').should('have.attr', 'style')
              .and('contain', 'opacity: 0.5;'); // The element is not active
            cy.get('.cvat-issues-sidebar-next-frame').should('be.visible').click();
            cy.checkFrameNum(2); // Frame changed to 2
            cy.get('.cvat-issues-sidebar-next-frame').should('have.attr', 'style')
              .and('contain', 'opacity: 0.5;'); // The element is not active
            cy.get('.cvat-issues-sidebar-previous-frame').should('be.visible').click();
            cy.checkFrameNum(0); // Frame changed to 0
        });

        it('Hide all issues. All issues are hidden on all frames.', () => {
            cy.get('.cvat-issues-sidebar-shown-issues').click();
            cy.get('.cvat-hidden-issue-label').should('not.exist');
            cy.get('.cvat-issues-sidebar-next-frame').click();
            cy.get('.cvat-hidden-issue-label').should('not.exist');
            cy.get('.cvat-issues-sidebar-previous-frame').click();
        });

        it('Display all the issues again. Comment a couple of issues and resolve all them.', () => {
            function resolveReopenIssue(reopen) {
                cy.collectIssueLabel().then((issueLabelList) => {
                    for (let label = 0; label < issueLabelList.length; label++) {
                        if (reopen) {
                            cy.resolveReopenIssue(issueLabelList[label], 'Please fix', true);
                        } else {
                            cy.resolveReopenIssue(issueLabelList[label], 'Done');
                        }
                    }
                });
            }

            cy.get('.cvat-issues-sidebar-hidden-issues').click();
            cy.get('.cvat-hidden-issue-label').should('exist').and('have.length', 4);
            cy.get('.cvat-issues-sidebar-next-frame').click();
            cy.get('.cvat-hidden-issue-label').should('exist').and('have.length', 1);
            cy.get('.cvat-issues-sidebar-previous-frame').click();

            resolveReopenIssue();
            cy.checkIssueLabel('Done', 'resolved');
            cy.goCheckFrameNumber(2);
            resolveReopenIssue();
            cy.checkIssueLabel('Done', 'resolved');
            cy.goCheckFrameNumber(0);

            // Reopen issues
            resolveReopenIssue(true);
            // Resolve again
            resolveReopenIssue();
        });

        it('Request a review again. Assign the third user again. The second user logout.', () => {
            cy.interactMenu('Request a review');
            cy.contains('.cvat-request-review-dialog', 'Reviewer:').within(() => {
                cy.get('.cvat-user-search-field').within(() => {
                    cy.get('input[type="search"]').should('have.value', thirdUserName);
                });
                cy.contains('[type="button"]', 'Submit').click();
            });
            cy.logout(secondUserName);
        });

        it('The third user login, opens the job, goes to menu, "Submit review"
            => "Review next" => Assign the first user => Submit.', () => {
            cy.login(thirdUserName, thirdUser.password);
            cy.openTaskJob(taskName, 0, false);
            cy.interactMenu('Submit the review');
            cy.submitReview('Review next', Cypress.env('user'));
            cy.get('.cvat-not-found').should('exist');
        });
        it('The third user logout. The first user login and opens the job, goes to menu,
            "Submit review" => Accept => Submit', () => {
            cy.logout(thirdUserName);
            cy.login();
            cy.openTaskJob(taskName, 0, false);
            cy.interactMenu('Submit the review');
            cy.submitReview('Accept');
            cy.url().should('include', '/tasks');
            cy.contains('.cvat-task-details', taskName).should('exist');
            cy.checkJobStatus(0, 'completed', secondUserName, Cypress.env('user'));
        });

        it('The first user can change annotations. The second users can't change annotations. ' +
            'For the third user the task is not visible.", () => {
            cy.openJob(0, false);
            cy.createPoint(createPointsShapeThird);
            cy.saveJob();
            cy.get('.cvat-notification-notice-save-annotations-failed').should('not.exist');
            cy.logout();
            cy.login(secondUserName, secondUser.password);
            cy.openTaskJob(taskName, 0, false);
            cy.createPoint(createPointsShapeFourth);
            cy.saveJob();
            cy.get('.cvat-notification-notice-save-annotations-failed').should('exist');
            cy.goToTaskList();
            cy.logout(secondUserName);
            cy.login(thirdUserName, thirdUser.password);
            cy.contains('strong', taskName).should('not.exist');
            cy.goToTaskList();
            cy.logout(thirdUserName);
        });

        it('The first user login. Remove the issue on third frame.', () => {
            cy.login();
            cy.openTaskJob(taskName, 0, false);
            cy.goCheckFrameNumber(2);

            // Start deleting the issue and press "Cancel"
            cy.collectIssueLabel().then((issueLabelList) => {
                cy.removeIssue(issueLabelList);
                cy.get('.cvat-issue-dialog-header')
                    .should('exist')
                    .find('[data-icon="close"]')
                    .click()
                    .should('not.exist');
                cy.get('.cvat_canvas_issue_region').should('have.length', 1);
                cy.get('.cvat-hidden-issue-label').should('have.length', 1).and('be.visible');
            });

            // Remove the issue
            cy.collectIssueLabel().then((issueLabelList) => {
                cy.removeIssue(issueLabelList, true);
                cy.get('.cvat-issue-dialog-header').should('not.exist');
                cy.get('.cvat-hidden-issue-label').should('have.length', 0);
                cy.get('.cvat_canvas_issue_region').should('have.length', 0);
            });
        });

        it('The first user opens the job and presses "Renew the job".', () => {
            cy.goCheckFrameNumber(0);
            cy.interactMenu('Renew the job');
            cy.get('.cvat-modal-content-renew-job').within(() => {
                cy.contains('button', 'Continue').click();
            });
            cy.url().should('include', '/tasks');
            cy.contains('.cvat-task-details', taskName).should('exist');
            cy.checkJobStatus(0, 'annotation', secondUserName, Cypress.env('user'));
        });

        it('The first user opens the job and presses "Finish the job".', () => {
            cy.openJob(0, false);
            cy.interactMenu('Finish the job');
            cy.get('.cvat-modal-content-finish-job').within(() => {
                cy.contains('button', 'Continue').click();
            });
            cy.url().should('include', '/tasks');
            cy.contains('.cvat-task-details', taskName).should('exist');
            cy.checkJobStatus(0, 'completed', secondUserName, Cypress.env('user'));
        });

        it('In column "status" the job has question circle. The first user hover it, ' +
           'short statistics about reviews shown.', () => {
            cy.get('.cvat-job-completed-color').within(() => {
                cy.get('[aria-label="question-circle"]').trigger('mouseover');
            });
            const summary = [];
            cy.get('.cvat-review-summary-description').within(() => {
                cy.get('td').then(($td) => {
                    for (let i = 0; i < $td.length; i++) {
                        summary.push($td[i].outerText);
                    }
                    expect(Number(summary[1])).to.be.equal(3); // Reviews 3
                    expect(Number(summary[5])).to.be.equal(0); // Unsolved issues 0
                    expect(Number(summary[7])).to.be.equal(4); // Resolved issues 4
                });
            });
        }); */
    });
});

// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

const randomString = (string) => {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    for (let i = 0; i <= 8; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return string ? `${result}${Math.floor(Math.random() * 10)}` : result;
};

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

    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName: labelName,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };

    const createRectangleShape2PointsSecond = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName: labelName,
        firstX: 400,
        firstY: 350,
        secondX: 500,
        secondY: 450,
    };

    const createPointsShape = {
        type: 'Shape',
        labelName: labelName,
        pointsMap: [{ x: 650, y: 350 }],
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

    const customeIssueDescription = 'Custom issue'

    before(() => {
        cy.clearLocalStorageSnapshot();
        // cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
        // cy.createZipArchive(directoryToArchive, archivePath);
        // cy.visit('auth/register');
    });

    beforeEach(() => {
        cy.restoreLocalStorage();
    });

    afterEach(() => {
        cy.saveLocalStorage();
    });

    // after(() => {
    //     cy.goToTaskList();
    //     cy.getTaskID(taskName).then(($taskID) => {
    //         cy.deleteTask(taskName, $taskID);
    //     });
    // });

    describe(`Testing "${labelName}"`, () => {
        // it('Registration of required users.', () => {
        //     cy.userRegistration(
        //         secondUser.firstName,
        //         secondUser.lastName,
        //         secondUserName,
        //         secondUser.emailAddr,
        //         secondUser.password,
        //     );
        //     cy.logout(secondUserName);
        //     cy.goToRegisterPage();
        //     cy.userRegistration(
        //         thirdUser.firstName,
        //         thirdUser.lastName,
        //         thirdUserName,
        //         thirdUser.emailAddr,
        //         thirdUser.password,
        //     );
        //     cy.logout(thirdUserName);
        // });

        // it('First user login. Create a task. Open the task. Assign to himself.', () => {
        //     cy.visit('/')
        //     cy.login();
        //     cy.createAnnotationTask(
        //         taskName,
        //         labelName,
        //         attrName,
        //         textDefaultValue,
        //         archiveName,
        //         null,
        //         advancedConfigurationParams,
        //     );
        //     cy.openTask(taskName);
        //     cy.assignTaskToUser(Cypress.env('user'));
        //     cy.logout();
        // });

        // it('Login the second, third user. The task is missing.', () => {
        //     cy.login(secondUserName, secondUser.password);
        //     cy.contains('.cvat-item-task-name', taskName).should('not.exist');
        //     cy.logout(secondUserName);
        //     cy.login(thirdUserName, thirdUser.password);
        //     cy.contains('.cvat-item-task-name', taskName).should('not.exist');
        //     cy.logout(thirdUserName);
        // });

        // it('First user login. Assign the first job to the second user.', () => {
        //     cy.login();
        //     cy.openTask(taskName);
        //     cy.assignJobToUser(0, secondUserName);
        //     cy.logout();
        // });

        // it('Second user login. Open the task, open the job and annotates it.', () => {
        //     cy.visit('/')
        //     cy.login(secondUserName, secondUser.password);
        //     cy.openTaskJob(taskName);
        //     cy.createRectangle(createRectangleShape2PointsSecond);
        //     for (let i = 1; i < 4; i++) {
        //         cy.createRectangle(createRectangleShape2Points);
        //         cy.goToNextFrame(i);
        //     }
        // });

        // it('Second user sends the job to review.', () => {
        //     cy.server().route('POST', '/api/v1/server/logs').as('sendLogs');
        //     cy.contains('.cvat-annotation-header-button', 'Menu').click();
        //     cy.get('.cvat-annotation-menu').within(() => {
        //         cy.contains('Request a review').click();
        //     });
        //     cy.contains('.cvat-modal-content-save-job', 'The job has unsaved annotations')
        //         .should('exist')
        //         .within(() => {
        //             cy.contains('[type="button"]', 'OK').click();
        //         });
        //     cy.wait('@sendLogs').its('status').should('equal', 201);
        //     cy.contains('.cvat-request-review-dialog', 'Reviewer:')
        //         .should('exist')
        //         .within(() => {
        //             cy.get('.cvat-user-search-field').click();
        //         });
        //     cy.get('.ant-select-dropdown')
        //         .not('.ant-select-dropdown-hidden')
        //         .within(() => {
        //             cy.contains(new RegExp(`^${thirdUserName}`, 'g')).click();
        //         });
        //     cy.contains('.cvat-request-review-dialog', 'Reviewer:').within(() => {
        //         cy.contains('[type="button"]', 'Submit').click();
        //     });
        //     cy.url().should('include', '/tasks');
        //     cy.contains('.cvat-task-details', taskName).should('exist');
        //     cy.checkJobStatus(0, 'validation', secondUserName, thirdUserName) // Check status, assignee, reviewer
        // });

        // it('Second user opens the job again, switches to standard mode and tried to change anything and save changes. The request will be rejected with 403 code.', () => {
        //     cy.openJob();
        //     cy.get('.cvat-workspace-selector').should('have.text', 'Review');
        //     cy.changeWorkspace('Standard', labelName)
        //     cy.createPoint(createPointsShape);
        //     cy.saveJob();
        //     cy.get('.cvat-notification-notice-save-annotations-failed')
        //         .should('exist')
        //         .within(() => {
        //             cy.get('[data-icon="close"]').click(); // Close the notice.
        //         });
        //     cy.logout(secondUserName);
        // });

        it('The third user opens the job. Review mode is opened automatically.', () => {
            cy.visit('/')
            cy.login(thirdUserName, thirdUser.password);
            cy.openTaskJob(taskName);
            cy.get('.cvat-workspace-selector').should('have.text', 'Review');
        });

        it('Use quick issues "Incorrect position". Issue will be created immediately.', () => {
            cy.createIssueFromObject('#cvat_canvas_shape_1', 'Quick issue: incorrect position');
            cy.checkIssue('Wrong position');
        });

        it('Item submenu: "Quick issue ..." does not appear.', () => {
            cy.get('#cvat_canvas_shape_1').trigger('mousemove', {force: true}).rightclick({force: true});
            cy.get('.cvat-canvas-context-menu')
                .contains('.cvat-context-menu-item', 'Quick issue ...')
                .should('not.exist');
        });

        it('Create different issues with a custom text.', () => {
            cy.createIssueFromObject('#cvat_canvas_shape_1', 'Open an issue ...', customeIssueDescription);
            cy.checkIssue(customeIssueDescription);
        });

        it('Now item submenu: "Quick issue ..." appears and it contains several latest options.', () => {
            cy.get('#cvat_canvas_shape_1').trigger('mousemove', {force: true}).rightclick({force: true});
            cy.get('.cvat-canvas-context-menu')
                .contains('.cvat-context-menu-item', 'Quick issue ...')
                .should('exist')
                .trigger('mousemove')
                .trigger('mouseover');
            cy.get('[id="quick_issue_from_latest$Menu"]')
                .should('be.visible')
                .and('have.text', customeIssueDescription);
        });

        it('Use one of items to create quick issue on another object. Issue has been created.', () => {
            cy.createIssueFromObject('#cvat_canvas_shape_2', 'Quick issue ...', customeIssueDescription);
            cy.checkIssue(customeIssueDescription);
        });

        it('Reload page. All the issue still exists.', () => {
            cy.reload();
            cy.get('.cvat-canvas-container').should('exist');
            cy.checkIssue(customeIssueDescription);
            cy.checkIssue('Wrong position');
        });

        // it('Use button on the left panel to create a couple of issues (in the first case draw a rectangle, in the second draw a point).', () => {
        //     cy.get('.cvat-issue-control').click();
        // });
    });
});

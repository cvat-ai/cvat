// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { projectName } from '../../../support/const_project';

context('Base actions on the project', () => {
    const labelName = `Base label for ${projectName}`;
    const taskName = {
        firstTask: `First task for ${projectName}`,
        secondTask: `Second task for ${projectName}`,
    };
    const attrName = `Attr for ${labelName}`;
    const textDefaultValue = 'Some default value for type Text';
    const imagesCount = 1;
    const imageFileName = `image_${taskName.firstTask.replace(/\s+/g, '_').toLowerCase()}`;
    const width = 800;
    const height = 800;
    const posX = 10;
    const posY = 10;
    const color = 'white';
    const archiveName = `${imageFileName}.zip`;
    const archivePath = `cypress/fixtures/${archiveName}`;
    const imagesFolder = `cypress/fixtures/${imageFileName}`;
    const directoryToArchive = imagesFolder;
    const advancedConfigurationParams = false;
    const forProject = true;
    const attachToProject = {
        yes: true,
        no: false,
    };
    const multiAttrParams = false;
    const newLabelName1 = `First label ${projectName}`;
    const newLabelName2 = `Second label ${projectName}`;
    const newLabelName3 = `Third label ${projectName}`;
    const newLabelName4 = `Fourth label ${projectName}`;
    const firstName = 'Seconduser fm';
    const lastName = 'Seconduser lm';
    const userName = 'Seconduser';
    const emailAddr = `${userName}@local.local`;
    const password = 'GDrb41RguF!';
    let projectID = '';
    const projectSubsetFieldValue = 'Test';

    function getProjectID(myProjectName) {
        cy.contains('.cvat-project-name', myProjectName)
            .parents('.cvat-project-details')
            .should('have.attr', 'data-cvat-project-id')
            .then(($projectID) => {
                projectID = $projectID;
            });
    }

    before(() => {
        cy.openProject(projectName);
    });

    after(() => {
        cy.getAuthKey().then((authKey) => {
            cy.deleteUsers(authKey, [userName]);
        });
    });

    describe('Testing "Base actions on the project"', () => {
        it('Add some labels to project.', () => {
            [newLabelName1, newLabelName2, newLabelName3, newLabelName4].forEach((name) => {
                cy.addNewLabel({ name });
            });
        });
        it('Create a first task for the project. Project field is completed with proper project name and labels editor is not accessible.', () => {
            cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
            cy.createZipArchive(directoryToArchive, archivePath);
            cy.createAnnotationTask(
                taskName.firstTask,
                labelName,
                attrName,
                textDefaultValue,
                archiveName,
                multiAttrParams,
                advancedConfigurationParams,
                forProject,
                attachToProject.no,
                projectName,
            );
        });
        it('Create a second task from task list page and attach to the created project. Assign first user.', () => {
            cy.goToTaskList();
            cy.createAnnotationTask(
                taskName.secondTask,
                labelName,
                attrName,
                textDefaultValue,
                archiveName,
                multiAttrParams,
                advancedConfigurationParams,
                forProject,
                attachToProject.yes,
                projectName,
            );
            cy.goToProjectsList();
            cy.openProject(projectName);
            cy.openTask(taskName.secondTask, projectSubsetFieldValue);
            cy.assignTaskToUser(Cypress.env('user'));
        });
        it('The task is successfully opened. No label editor on task page.', () => {
            cy.goToProjectsList();
            cy.openProject(projectName);
            getProjectID(projectName);
            cy.get('.cvat-tasks-list-item').then((countTasks) => {
                // The number of created tasks is greater than zero
                expect(countTasks.length).to.be.gt(0);
            });
            cy.openTask(taskName.firstTask);
            cy.get('.cvat-constructor-viewer').should('not.exist');
        });
        it('Logout first user, register second user, tries to create project and logout.', () => {
            cy.goToTaskList();
            cy.logout();
            cy.goToRegisterPage();
            cy.userRegistration(firstName, lastName, userName, emailAddr, password);
            cy.goToProjectsList();
            cy.logout();
        });
        it('Login first user. Assign project to second user. Logout.', () => {
            cy.login();
            cy.goToProjectsList();
            cy.openProject(projectName);
            cy.assignProjectToUser(userName);
            cy.logout();
        });
        it('Login second user. The project and first tasks available for that user. Tries to delete project. Logout.', () => {
            cy.login(userName, password);
            cy.goToProjectsList();
            // tries to delete project
            cy.deleteProject(projectName, projectID, 'fail');
            cy.closeNotification('.cvat-notification-notice-delete-project-failed');
            cy.openProject(projectName);
            cy.goToTaskList();
            cy.openTask(taskName.firstTask);
            cy.goToTaskList();
            cy.logout();
        });
        it('Delete the project. Deleted project not exist. Checking the availability of tasks.', () => {
            cy.login();
            cy.goToProjectsList();
            cy.deleteProject(projectName, projectID);
            cy.goToTaskList();
            cy.contains('strong', taskName.firstTask).should('not.exist');
            cy.contains('strong', taskName.secondTask).should('not.exist');
            cy.logout();
        });
    });
});

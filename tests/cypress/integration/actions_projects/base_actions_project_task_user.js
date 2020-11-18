// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { projectName } from '../../support/const_project';

const randomString = (isPassword) => {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    for (let i = 0; i <= 8; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return isPassword ? `${result}${Math.floor(Math.random() * 10)}` : result;
};

context('Base actions on the project', () => {

    const labelName = `Base label for ${projectName}`;
    const taskName = `First task for ${projectName}`;
    const attrName = `Attr for ${labelName}`;
    const textDefaultValue = 'Some default value for type Text';
    const imagesCount = 1;
    const imageFileName = `image_${taskName.replace(/\s+/g, '_').toLowerCase()}`;
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
    const multiAttrParams = false;
    const newLabelName1 = `First label ${projectName}`;
    const newLabelName2 = `Second label ${projectName}`;
    const newLabelName3 = `Third label ${projectName}`;
    const newLabelName4 = `Fourth label ${projectName}`;
    const firstName = `${randomString()}`;
    const lastName = `${randomString()}`;
    const userName = `${randomString()}`;
    const emailAddr = `${userName}@local.local`;
    const password = `${randomString(true)}`;
    let projectID = '';

    before(() => {
        cy.openProject(projectName);
    });

    describe(`Testing "Base actions on the project"`, () => {
        it('Add some labels to project.', () => {
            cy.addNewLabel(newLabelName1);
            cy.addNewLabel(newLabelName2);
            cy.addNewLabel(newLabelName3);
            cy.addNewLabel(newLabelName4);
        });
        it('Create a task for the project. Project field is completed with proper project name and labels editor is not accessible.', () => {
            cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
            cy.createZipArchive(directoryToArchive, archivePath);
            cy.createAnnotationTask(
                taskName,
                labelName,
                attrName,
                textDefaultValue,
                archiveName,
                multiAttrParams,
                advancedConfigurationParams,
                forProject,
                projectName,
            );
        });
        it('The task is successfully opened. No label editor on task page.', () => {
            cy.openProject(projectName);
            cy.getProjectID(projectName).then($projectID => {
                projectID = $projectID;
            });
            cy.get('.cvat-tasks-list-item').then(countTasks => {
                // The number of created tasks is greater than zero
                expect(countTasks.length).to.be.gt(0);
            });
            cy.openTask(taskName);
            cy.get('.cvat-constructor-viewer').should('not.exist');
        });
        it('Logout firts user, register second user, logout.', () => {
            cy.logout();
            cy.get('a[href="/auth/register"]').click();
            cy.url().should('include', '/auth/register');
            cy.userRegistration(firstName, lastName, userName, emailAddr, password);
            cy.logout(userName);
        });
        it('Login firts user. Assing project to second user. Logout.', () => {
            cy.login();
            cy.openProject(projectName);
            cy.get('.cvat-user-search-field').click();
            cy.contains(userName).click();
            cy.logout();
        });
        it('Login second user. The project available for that user. Logout.', () => {
            cy.login(userName, password);
            cy.openProject(projectName);
            cy.logout(userName);
        });
        it('Delete the project. Checking the availability of tasks.', () => {
            cy.login();
            cy.goToProjectsList();
            cy.deleteProject(projectName, projectID);
            cy.goToTaskList();
            cy.contains('strong', taskName).should('not.exist');
        });
    });
});

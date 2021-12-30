// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('New organization pipeline.', () => {
    const caseId = '113';
    const firstUserName = 'Firstuser';
    const secondUserName = 'Seconduser';
    const thirdUserName = 'Thirduser';

    const firstUser = {
        firstName: `${firstUserName} fitstname`,
        lastName: `${firstUserName} lastname`,
        emailAddr: `${firstUserName.toLowerCase()}@local.local`,
        password: 'UfdU21!dds',
    };
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
    const organizationParams = {
        shortName: 'TestOrganization',
        fullName: 'Organization full name. Only for test.',
        description: 'This organization was created to test the functionality.',
        email: 'testorganization@local.local',
        phoneNumber: '+70000000000',
        location: 'Country, State, Address, 000000',
    };
    const project = {
        name: `Project case ${caseId}`,
        label: 'car',
        attrName: 'color',
        attrVaue: 'red',
        multiAttrParams: false,
    };

    const labelName = `Case ${caseId}`;
    const taskName = `New annotation task for ${labelName}`;
    const attrName = `Attr for ${labelName}`;
    const textDefaultValue = 'Some default value for type Text';
    const imagesCount = 1;
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

    before(() => {
        cy.imageGenerator(
            imagesFolder,
            imageFileName,
            width,
            height,
            color,
            posX,
            posY,
            project.label,
            imagesCount,
        );
        cy.createZipArchive(directoryToArchive, archivePath);
        cy.visit('/');

        cy.goToRegisterPage();
        cy.userRegistration(
            firstUser.firstName,
            firstUser.lastName,
            firstUserName,
            firstUser.emailAddr,
            firstUser.password,
        );
        cy.logout(firstUserName);
        cy.goToRegisterPage();

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
        cy.clearLocalStorage();

        cy.login(firstUserName, firstUser.password);
    });

    beforeEach(() => {
        Cypress.Cookies.preserveOnce('sessionid', 'csrftoken');
    });

    // TODO
    // afterEach(() => {
    //     remove organizations
    // });

    describe(`Testing case "${caseId}"`, () => {
        it('Create an organization.', () => {
            cy.createOrganization(organizationParams);
        });

        it('Activate the organization.', () => {
            cy.activateOrganization(organizationParams.shortName);
            cy.get('.cvat-header-menu-user-dropdown').should('contain.text', organizationParams.shortName);
        });

        it('Open the organization settings. Invite members.', () => {
            cy.openOrganization(organizationParams.shortName);
            cy.checkOrganizationParams(organizationParams);
            cy.checkOrganizationMembers(1, [firstUserName]);
            const membersToInvite = [
                {
                    email: secondUser.emailAddr,
                    role: 'Worker',
                },
                {
                    email: thirdUser.emailAddr,
                    role: 'Worker',
                },
            ];
            cy.inviteMembersToOrganization(membersToInvite);
            cy.checkOrganizationMembers(3, [firstUserName, secondUserName, thirdUserName]);
        });

        it('Create a project, create a task.', () => {
            cy.goToProjectsList();
            cy.createProjects(
                project.name,
                project.label,
                project.attrName,
                project.attrVaue,
                project.multiAttrParams,
            );
            cy.goToTaskList();
            cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, archiveName);
            cy.openTask(taskName);
            cy.assignTaskToUser(secondUserName);
            cy.activateOrganization('Personal workspace');
            cy.get('.cvat-header-menu-user-dropdown').should('not.contain.text', organizationParams.shortName);
        });
    });
});

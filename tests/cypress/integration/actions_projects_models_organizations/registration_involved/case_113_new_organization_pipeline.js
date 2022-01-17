// Copyright (C) 2022 Intel Corporation
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
    const newTaskName = labelName;
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
    let taskID;
    let jobID;

    const createCuboidShape2Points = {
        points: 'From rectangle',
        type: 'Shape',
        labelName,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };

    function capitalizeEmail(email) {
        const userName = email.split('@')[0];
        const domainName = email.split('@')[1].split('.')[0];
        const topLevelDomain = email.split('.')[1];
        const emailParts = [];
        for (const i of [userName, domainName, topLevelDomain]) {
            emailParts.push(i[0].toUpperCase() + i.slice(1).toLowerCase());
        }
        const capitalizedEmail = `${emailParts[0]}@${emailParts[1]}.${emailParts[2]}`;
        return capitalizedEmail;
    }

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

        cy.goToRegisterPage();
        cy.userRegistration(
            firstUser.firstName,
            firstUser.lastName,
            firstUserName,
            firstUser.emailAddr,
            firstUser.password,
        );
    });

    beforeEach(() => {
        Cypress.Cookies.preserveOnce('sessionid', 'csrftoken');
    });

    after(() => {
        cy.logout(thirdUserName);
        cy.getAuthKey().then((response) => {
            cy.deletingRegisteredUsers(response, [firstUserName, secondUserName, thirdUserName]);
            cy.deletingCreatedTasks(response, [newTaskName]);
            cy.deletingCreatedProjects(response, [project.name]);
            cy.deletingCreatedOrganizations(response, [organizationParams.shortName]);
        });
    });

    describe(`Testing case "${caseId}"`, () => {
        it('The first user creates an organization and activates it.', () => {
            cy.createOrganization(organizationParams);
            cy.activateOrganization(organizationParams.shortName);
        });

        it('Open the organization settings. Invite members.', () => {
            cy.openOrganization(organizationParams.shortName);
            cy.checkOrganizationParams(organizationParams);
            cy.checkOrganizationMembers(1, [firstUserName]);
            const membersToInvite = [
                {
                    email: capitalizeEmail(secondUser.emailAddr),
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

        it('Create a project, create a task. Deactivate organization.', () => {
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
            cy.activateOrganization('Personal workspace'); // Deactivate organization
        });

        // FIXME: Activate after implementation
        it.skip('The project, the task are invisible now.', () => {
            cy.contains('.cvat-item-task-name', taskName).should('not.exist');
            cy.goToProjectsList();
            cy.contains('.cvat-projects-project-item-title', project.name).should('not.exist');
        });

        it('Admin tries to leave from organization (not successfully because he is not a member of it).', () => {
            cy.logout(firstUserName);
            cy.login();
            cy.activateOrganization(organizationParams.shortName);
            cy.openOrganization(organizationParams.shortName);
            cy.contains('button', 'Leave organization').should('be.visible').click();
            cy.get('.cvat-modal-organization-leave-confirm')
                .should('be.visible')
                .within(() => {
                    cy.contains('button', 'Leave').click();
                });
            cy.get('.cvat-notification-notice-leave-organization-failed').should('exist');
            cy.closeNotification('.cvat-notification-notice-leave-organization-failed');
        });

        it('Second user login. The user is able to see the organization, the task and can’t see the project.', () => {
            cy.logout();
            cy.login(secondUserName, secondUser.password);
            cy.checkPresenceOrganization(organizationParams.shortName);
            cy.contains('.cvat-item-task-name', taskName).should('exist');
            cy.goToProjectsList();
            cy.get('.cvat-empty-projects-list').should('exist');
        });

        it('Open the task, assign one of jobs to the third user. Rename the task.', () => {
            cy.activateOrganization(organizationParams.shortName);
            cy.goToTaskList();
            cy.openTask(taskName);
            cy.assignJobToUser(0, thirdUserName);
            cy.renameTask(taskName, newTaskName);
            cy.url().then((url) => {
                taskID = Number(url.split('/').slice(-1)[0]);
            });
            cy.getJobNum(0).then(($jobID) => {
                jobID = $jobID;
            });
        });

        it('Logout, the third user login. The user does not see the project, the task. The user can open the job using direct link. Create an object, save annotations.', () => {
            cy.logout(secondUserName);
            cy.login(thirdUserName, thirdUser.password);
            cy.contains('.cvat-item-task-name', taskName).should('not.exist');
            cy.goToProjectsList();
            cy.contains('.cvat-projects-project-item-title', project.name).should('not.exist');
            cy.visit(`/tasks/${taskID}/jobs/${jobID}`);
            cy.get('.cvat-canvas-container').should('exist');
            cy.createCuboid(createCuboidShape2Points);
            cy.saveJob();
        });

        it('The owner of the organization removes the second user from it.', () => {
            cy.logout(thirdUserName);
            cy.login(firstUserName, firstUser.password);
            cy.activateOrganization(organizationParams.shortName);
            cy.openOrganization(organizationParams.shortName);
            cy.removeMemberFromOrganization(secondUserName);
            cy.checkOrganizationMembers(2, [firstUserName, thirdUserName]);
        });

        it('The organization, project is no longer available to the second user. The task is available.', () => {
            cy.logout(firstUserName);
            cy.login(secondUserName, secondUser.password);
            cy.checkPresenceOrganization(organizationParams.shortName, false);
            cy.openTaskJob(newTaskName, 0, false);
            cy.get('.cvat_canvas_shape_cuboid').should('be.visible');
            cy.goToProjectsList();
            cy.contains('.cvat-projects-project-item-title', project.name).should('not.exist');
        });

        it('Logout. Remove the first, the second user (deletion occurs from user admin).', () => {
            cy.logout(secondUserName);
            cy.getAuthKey().then((response) => {
                cy.deletingRegisteredUsers(response, [firstUserName, secondUserName]);
            });
        });

        it('Login as the third user. The organization page can be opened.', () => {
            cy.login(thirdUserName, thirdUser.password);
            cy.activateOrganization(organizationParams.shortName);
            cy.visit('/organization');
            cy.checkOrganizationParams(organizationParams);
            cy.checkOrganizationMembers(1, [thirdUserName]);
        });

        it('The job can be opened.', () => {
            cy.visit(`/tasks/${taskID}/jobs/${jobID}`);
            cy.get('.cvat-canvas-container').should('exist');
            cy.get('.cvat_canvas_shape_cuboid').should('be.visible');
        });
    });
});

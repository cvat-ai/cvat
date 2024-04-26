// Copyright (C) 2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('New organization pipeline.', () => {
    const caseId = '113';

    const firstUserName = 'Firstuser';
    const secondUserName = 'Seconduser';
    const thirdUserName = 'Thirduser';
    const users = {
        thirdUser: {
            name: thirdUserName,
            firstName: `${thirdUserName} fitstname`,
            lastName: `${thirdUserName} lastname`,
            emailAddr: `${thirdUserName.toLowerCase()}@local.local`,
            password: 'Fv5Df3#f55g',
        },
        secondUser: {
            name: secondUserName,
            firstName: `${secondUserName} fitstname`,
            lastName: `${secondUserName} lastname`,
            emailAddr: `${secondUserName.toLowerCase()}@local.local`,
            password: 'UfdU21!dds',
        },
        firstUser: {
            name: firstUserName,
            firstName: `${firstUserName} fitstname`,
            lastName: `${firstUserName} lastname`,
            emailAddr: `${firstUserName.toLowerCase()}@local.local`,
            password: 'UfdU21!dds',
        },
    };
    const { firstUser, secondUser, thirdUser } = users;

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
        return email.split('@').map((part) => `${part.toUpperCase()[0]}${part.slice(1)}`).join('@');
    }

    before(() => {
        cy.visit('/');
        cy.login();
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
        cy.logout();

        for (const user of Object.values(users)) {
            cy.goToRegisterPage();
            cy.userRegistration(
                user.firstName,
                user.lastName,
                user.name,
                user.emailAddr,
                user.password,
            );
            if (user.name !== firstUserName) cy.logout(user.name);
        }
    });

    beforeEach(() => {
        cy.clearLocalStorage('currentOrganization');
    });

    after(() => {
        cy.logout();
        cy.getAuthKey().then((authKey) => {
            cy.deleteUsers(authKey, [thirdUserName]);
            cy.deleteTasks(authKey, [newTaskName]);
            cy.deleteProjects(authKey, [project.name]);
            cy.deleteOrganizations(authKey, [organizationParams.shortName]);
        });
    });

    describe(`Testing case "${caseId}"`, () => {
        it('The first user creates an organization and activates it.', () => {
            cy.createOrganization(organizationParams);
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
            cy.deactivateOrganization();
        });

        it('The project, the task are invisible now.', () => {
            cy.contains('.cvat-item-task-name', taskName).should('not.exist');
            cy.goToProjectsList();
            cy.contains('.cvat-projects-project-item-title', project.name).should('not.exist');
        });

        it('Admin tries to leave from organization (not successfully because he is not a member of it).', () => {
            cy.logout();
            cy.login();
            cy.activateOrganization(organizationParams.shortName);
            cy.openOrganization(organizationParams.shortName);
            cy.contains('button', 'Leave organization').should('be.visible').click();
            cy.once('uncaught:exception', () => false); // thrown exception is expected in this test
            cy.get('.cvat-modal-organization-leave-confirm')
                .should('be.visible')
                .within(() => {
                    cy.contains('button', 'Leave').click();
                });
            cy.get('.cvat-notification-notice-leave-organization-failed').should('exist');
            cy.closeNotification('.cvat-notification-notice-leave-organization-failed');
        });

        it("The second user login. The user is able to see the organization, can't see the task.", () => {
            cy.logout();
            cy.login(secondUserName, secondUser.password);
            cy.checkOrganizationExists(organizationParams.shortName);
            cy.contains('.cvat-item-task-name', taskName).should('not.exist');
        });

        it("The second user activates the organization, can't see the project because it is not assigned to him.", () => {
            cy.activateOrganization(organizationParams.shortName);
            cy.goToProjectsList();
            cy.contains('.cvat-projects-project-item-title', project.name).should('not.exist');
        });

        it('The first user login. Assigne the project to the second user.', () => {
            cy.logout();
            cy.login(firstUserName, firstUser.password);
            cy.activateOrganization(organizationParams.shortName);
            cy.goToProjectsList();
            cy.openProject(project.name);
            cy.assignProjectToUser(secondUserName);
        });

        it('The second user login. Now he sees the project and can open it.', () => {
            cy.logout();
            cy.login(secondUserName, secondUser.password);
            cy.activateOrganization(organizationParams.shortName);
            cy.goToProjectsList();
            cy.openProject(project.name);
        });

        it('Open the task, assign one of jobs to the third user. Rename the task.', () => {
            cy.goToTaskList();
            cy.openTask(taskName);
            cy.getJobIDFromIdx(0).then((_jobID) => {
                jobID = _jobID;
                cy.assignJobToUser(_jobID, thirdUserName);
            });
            cy.renameTask(taskName, newTaskName);
            cy.url().then((url) => {
                const [link] = url.split('?');
                taskID = Number(link.split('/').slice(-1)[0]);
            });
        });

        it('Logout, the third user login. The user does not see the project, the task.', () => {
            cy.logout();
            cy.login(thirdUserName, thirdUser.password);
            cy.contains('.cvat-item-task-name', taskName).should('not.exist');
            cy.goToProjectsList();
            cy.contains('.cvat-projects-project-item-title', project.name).should('not.exist');
        });

        it('User can open the job using direct link. Organization is set automatically. Create an object, save annotations.', () => {
            cy.visit(`/tasks/${taskID}/jobs/${jobID}`);
            cy.get('.cvat-canvas-container').should('exist');
            cy.get('.cvat-header-menu-user-dropdown-organization').should('have.text', organizationParams.shortName);
            cy.createCuboid(createCuboidShape2Points);
            cy.saveJob();
        });

        it('The owner of the organization removes the second user from it.', () => {
            cy.logout();
            cy.login(firstUserName, firstUser.password);
            cy.activateOrganization(organizationParams.shortName);
            cy.openOrganization(organizationParams.shortName);
            cy.removeMemberFromOrganization(secondUserName);
            cy.checkOrganizationMembers(2, [firstUserName, thirdUserName]);
        });

        it('The organization, project, task is no longer available to the second user.', () => {
            cy.logout();
            cy.login(secondUserName, secondUser.password);
            cy.checkOrganizationExists(organizationParams.shortName, false);
            cy.contains('.cvat-item-task-name', taskName).should('not.exist');
            cy.goToProjectsList();
            cy.contains('.cvat-projects-project-item-title', project.name).should('not.exist');
        });

        it('Logout. Remove the first, the second user (deletion occurs from user admin).', () => {
            cy.logout();
            cy.getAuthKey().then((authKey) => {
                cy.deleteUsers(authKey, [firstUserName, secondUserName]);
            });
        });

        it('Login as the third user. The organization page can be opened. The job can be opened.', () => {
            cy.login(thirdUserName, thirdUser.password);
            cy.activateOrganization(organizationParams.shortName);
            cy.visit('/organization');
            cy.checkOrganizationParams(organizationParams);
            cy.checkOrganizationMembers(1, [thirdUserName]);
            cy.visit(`/tasks/${taskID}/jobs/${jobID}`);
            cy.get('.cvat-canvas-container').should('exist');
            cy.get('.cvat_canvas_shape_cuboid').should('be.visible');
        });
    });
});

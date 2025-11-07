// Copyright (C) 2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { defaultTaskSpec } from '../../support/default-specs';

context('New organization pipeline.', () => {
    const caseId = '113';

    const firstUserName = 'Firstuser';
    const secondUserName = 'Seconduser';
    const thirdUserName = 'Thirduser';
    const users = {
        thirdUser: {
            username: thirdUserName,
            firstName: `${thirdUserName} fitstname`,
            lastName: `${thirdUserName} lastname`,
            email: `${thirdUserName.toLowerCase()}@local.local`,
            password: 'Fv5Df3#f55g',
        },
        secondUser: {
            username: secondUserName,
            firstName: `${secondUserName} fitstname`,
            lastName: `${secondUserName} lastname`,
            email: `${secondUserName.toLowerCase()}@local.local`,
            password: 'UfdU21!dds',
        },
        firstUser: {
            username: firstUserName,
            firstName: `${firstUserName} fitstname`,
            lastName: `${firstUserName} lastname`,
            email: `${firstUserName.toLowerCase()}@local.local`,
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
        attrValue: 'red',
        multiAttrParams: false,
    };

    const labelName = `Case ${caseId}`;
    const taskName = `New annotation task for ${labelName}`;
    const newTaskName = labelName;
    const serverFiles = ['archive.zip'];
    let taskID = null;
    let jobID = null;

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
        return email.split('@').map(Cypress._.capitalize).join('@');
    }
    function tearDown() {
        cy.headlessLogout().then(() => {
            cy.task('getAuthHeaders').then((authHeaders) => {
                cy.deleteUsers(authHeaders, [firstUserName, secondUserName, thirdUserName]);
                cy.deleteTasks(authHeaders, [newTaskName]);
                cy.deleteProjects(authHeaders, [project.name]);
                cy.deleteOrganizations(authHeaders, [organizationParams.shortName]);
                cy.headlessLogout();
            });
        });
    }
    function makeLoginUser(user) {
        return {
            username: user.username,
            password: user.password,
            nextURL: '/tasks',
        };
    }

    before(() => {
        cy.visit('/auth/login');
        cy.window().its('cvat').should('not.be.undefined');
        tearDown();
        for (const user of Object.values(users)) {
            cy.headlessCreateUser(user);
        }
        cy.headlessLogin(makeLoginUser(firstUser));
    });

    beforeEach(() => {
        cy.clearLocalStorage('currentOrganization');
    });

    after(() => {
        tearDown();
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
                    email: capitalizeEmail(secondUser.email),
                    role: 'Worker',
                },
                {
                    email: thirdUser.email,
                    role: 'Worker',
                },
            ];
            cy.inviteMembersToOrganization(membersToInvite);
            cy.then(() => {
                cy.checkOrganizationMembers(3, [firstUserName, secondUserName, thirdUserName]);
            });
        });

        it('Search within organizations: All members should be queryable', () => {
            const searchBar = 'searchBar';
            const searchBarRef = `@${searchBar}`;
            function search(string = '') {
                cy.get(searchBarRef).clear();
                cy.get(searchBarRef).type(`${string}{enter}`);
            }
            cy.get('.cvat-organization-page-search-bar').should('be.visible')
                .find('input')
                .as(searchBar);

            search(firstUserName);
            cy.checkOrganizationMembers(1, [firstUserName]);

            const commonSubstring = 'user';
            search(commonSubstring);
            cy.checkOrganizationMembers(3, [firstUserName, secondUserName, thirdUserName]);

            const badSearch = 'abc';
            search(badSearch);
            cy.get('.cvat-empty-members-list').should('exist');

            // Empty search bar outputs all members
            search();
            cy.checkOrganizationMembers(3, [firstUserName, secondUserName, thirdUserName]);
        });

        it('Search within organizations: Filters work correctly', () => {
            cy.get('.cvat-quick-filters-button').click();
            cy.get('.cvat-resource-page-predefined-filters-list')
                .should('be.visible')
                .within(() => {
                    cy.contains('Workers').click();
                });
            cy.get('.cvat-quick-filters-button').click();
            cy.get('.cvat-resource-page-predefined-filters-list').should('not.exist');
            cy.checkOrganizationMembers(2, [secondUserName, thirdUserName]);
        });

        it('Create a project, create a task. Deactivate organization.', () => {
            cy.headlessCreateProject({
                name: project.name,
                labels: [{
                    name: labelName,
                    attributes: [{
                        name: project.attrName,
                        mutable: false,
                        input_type: 'text',
                        default_value: project.attrValue,
                        values: [project.attrValue],
                    }],
                }],
            }).then(({ projectID }) => {
                const { taskSpec, dataSpec, extras } = defaultTaskSpec({
                    labelName, taskName, serverFiles,
                });
                delete taskSpec.labels;
                taskSpec.project_id = projectID;
                cy.headlessCreateTask(
                    taskSpec, dataSpec, extras,
                ).then((taskResponse) => {
                    taskID = taskResponse.taskID;
                });
            });
            cy.goToProjectsList();
            cy.goToTaskList();

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
            cy.headlessLogin();
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
            cy.headlessLogin(makeLoginUser(secondUser));
            cy.checkOrganizationExists(organizationParams.shortName);
            cy.contains('.cvat-item-task-name', taskName).should('not.exist');
        });

        it("The second user activates the organization, can't see the project because it is not assigned to him.", () => {
            cy.activateOrganization(organizationParams.shortName);
            cy.goToProjectsList();
            cy.contains('.cvat-projects-project-item-title', project.name).should('not.exist');
        });

        it('The first user login. Assign the project to the second user.', () => {
            cy.headlessLogin(makeLoginUser(firstUser));
            cy.activateOrganization(organizationParams.shortName);
            cy.goToProjectsList();
            cy.openProject(project.name);
            cy.assignProjectToUser(secondUserName);
        });

        it('The second user login. Now he sees the project and can open it.', () => {
            cy.headlessLogin(makeLoginUser(secondUser));
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
        });

        it('Logout, the third user login. The user does not see the project, the task.', () => {
            cy.headlessLogin(makeLoginUser(thirdUser));
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
            cy.get('.cvat-spinner').should('not.exist');
        });

        it('The owner of the organization removes the second user from it.', () => {
            cy.headlessLogin(makeLoginUser(firstUser));
            cy.contains(firstUser.username).should('exist').and('be.visible');
            cy.activateOrganization(organizationParams.shortName);
            cy.openOrganization(organizationParams.shortName);
            cy.removeMemberFromOrganization(secondUserName);
            cy.checkOrganizationMembers(2, [firstUserName, thirdUserName]);
        });

        it('The organization, project, task is no longer available to the second user.', () => {
            cy.headlessLogin(makeLoginUser(secondUser));
            cy.checkOrganizationExists(organizationParams.shortName, false);
            cy.contains('.cvat-item-task-name', taskName).should('not.exist');
            cy.goToProjectsList();
            cy.contains('.cvat-projects-project-item-title', project.name).should('not.exist');
        });

        it('Logout. Remove the first, the second user (deletion occurs from user admin).', () => {
            cy.headlessLogout();
            cy.task('getAuthHeaders').then((authHeaders) => {
                cy.deleteUsers(authHeaders, [firstUserName, secondUserName]);
            });
        });

        it('Login as the third user. The organization page can be opened. The job can be opened.', () => {
            cy.headlessLogin(makeLoginUser(thirdUser));
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

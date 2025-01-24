// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Basic markdown pipeline', () => {
    const projectName = 'A project with markdown';
    const projectLabels = [{ name: 'label', attributes: [], type: 'any' }];
    const taskName = 'A task with markdown';
    const serverFiles = ['images/image_1.jpg', 'images/image_2.jpg', 'images/image_3.jpg'];
    const additionalUsers = {
        jobAssignee: {
            username: 'md_job_assignee',
            firstName: 'Firstname',
            lastName: 'Lastname',
            email: 'md_job_assignee@local.local',
            password: 'Fv5Df3#f55g',
        },
        taskAssignee: {
            username: 'md_task_assignee',
            firstName: 'Firstname',
            lastName: 'Lastname',
            email: 'md_task_assignee@local.local',
            password: 'UfdU21!dds',
        },
        notAssignee: {
            username: 'md_not_assignee',
            firstName: 'Firstname',
            lastName: 'Lastname',
            email: 'md_not_assignee@local.local',
            password: 'UfdU21!dds',
        },
    };
    let projectID = null;
    let taskID = null;
    let jobID = null;
    let guideID = null;
    let assetID = null;

    before(() => {
        cy.headlessLogout();
        cy.visit('/auth/login');

        for (const user of Object.values(additionalUsers)) {
            cy.headlessCreateUser(user);
        }

        cy.login();
        cy.get('.cvat-tasks-page').should('exist').and('be.visible');

        cy.headlessCreateProject({
            labels: projectLabels,
            name: projectName,
        }).then((response) => {
            projectID = response.projectID;

            cy.headlessCreateTask({
                labels: [],
                name: taskName,
                project_id: projectID,
                source_storage: { location: 'local' },
                target_storage: { location: 'local' },
            }, {
                server_files: serverFiles,
                image_quality: 70,
                use_zip_chunks: true,
                use_cache: true,
                sorting_method: 'lexicographical',
            }).then((taskResponse) => {
                taskID = taskResponse.taskID;
                [jobID] = taskResponse.jobIDs;

                cy.visit(`/tasks/${taskID}`);
                cy.get('.cvat-task-details').should('exist').and('be.visible');
                cy.assignTaskToUser(additionalUsers.taskAssignee.username);
                cy.assignJobToUser(jobID, additionalUsers.jobAssignee.username);
            });
        });
    });

    after(() => {
        cy.getAuthKey().then((authKey) => {
            cy.deleteUsers(authKey, [
                additionalUsers.jobAssignee.username,
                additionalUsers.taskAssignee.username,
                additionalUsers.notAssignee.username,
            ]);
            cy.deleteTasks(authKey, [taskName]);
            cy.deleteProjects(authKey, [projectName]);
        });
    });

    describe('Markdown text can be bounded to the project', () => {
        function openProject() {
            cy.visit(`/projects/${projectID}`);
            cy.get('.cvat-project-details').should('exist').and('be.visible');
        }

        function openGuide() {
            cy.get('.cvat-md-guide-control-wrapper button').click();
            cy.url().should('to.match', /\/projects\/\d+\/guide/);
            cy.get('.cvat-guide-page-editor-wrapper').should('exist').and('be.visible');
            cy.get('.cvat-spinner-container').should('not.exist').then(() => {
                if (guideID === null) {
                    cy.intercept('GET', '/api/projects/**').as('getProjects');
                    cy.window().then(async ($win) => {
                        $win.cvat.projects.get({ id: projectID }).then(([project]) => {
                            guideID = project.guideId;
                        });
                    });
                    cy.wait('@getProjects').its('response.statusCode').should('equal', 200);
                }
            });
        }

        function updatePlainText(value) {
            cy.get('.cvat-guide-page-editor-wrapper textarea').clear();
            cy.get('.cvat-guide-page-editor-wrapper textarea').type(value);
            cy.intercept('PATCH', '/api/guides/**').as('patchGuide');
            cy.get('.cvat-guide-page-bottom button').should('exist').and('be.visible').and('not.be.disabled').click();
            cy.get('.cvat-spinner-container').should('not.exist');
            cy.wait('@patchGuide').its('response.statusCode').should('equal', 200);
        }

        function setupGuide(value) {
            openProject();
            openGuide();
            updatePlainText(value);
        }

        it('Plain text', () => {
            setupGuide('A plain markdown text');
        });

        it('Plain text with 3rdparty picture', () => {
            const url = 'https://github.com/cvat-ai/cvat/raw/develop/site/content/en/images/cvat_poster_with_name.png';
            const value = `Plain text with 3rdparty picture\n![image](${url})`;
            cy.intercept('GET', url).as('getPicture');
            setupGuide(value);
            cy.wait('@getPicture');
        });

        it('Text and an uploaded picture', () => {
            cy.window().then(($win) => {
                cy.readFile('mounted_file_share/images/image_1.jpg', 'base64').should('exist').then((image) => {
                    const base64 = `data:image/jpg;base64,${image}`;
                    return fetch(base64);
                }).then((res) => res.blob()).then((blob) => (
                    $win.cvat.assets.create(
                        new $win.File([blob], 'file.jpg', { type: 'image/jpeg' }), guideID,
                    )
                )).then(({ uuid }) => {
                    assetID = uuid;
                    setupGuide(`Plain text with a picture\n![image](/api/assets/${uuid})`);
                });
            });
        });

        after(() => {
            cy.logout();
        });
    });

    describe('Staff can see markdown', () => {
        function checkGuideAndAssetAvailableOnAnnotationView() {
            // when open job for the first time, guide is opened automatically
            cy.visit(`/tasks/${taskID}/jobs/${jobID}`);
            cy.intercept('GET', `/api/assets/${assetID}**`).as('assetGet');
            cy.get('.cvat-annotation-view-markdown-guide-modal button').contains('OK').click();
            cy.wait('@assetGet');

            // when reopen the job, guide is not opened automatically, but can be opened manually
            cy.reload();
            cy.get('.cvat-annotation-header-guide-button').should('not.exist');
            cy.get('.cvat-annotation-header-guide-button').should('exist').and('be.visible').click();
            cy.get('.cvat-annotation-view-markdown-guide-modal').should('exist').and('be.visible');
            cy.get('.cvat-annotation-view-markdown-guide-modal button').contains('OK').click();

            // when there is a request to open in a link, the guide is opened automatically
            cy.visit(`/tasks/${taskID}/jobs/${jobID}?openGuide`);
            cy.get('.cvat-annotation-header-guide-button').should('not.exist');
            cy.get('.cvat-annotation-view-markdown-guide-modal button').contains('OK').click();
        }

        beforeEach(() => {
            cy.clearLocalStorage('seenGuides');
        });

        afterEach(() => {
            cy.logout();
        });

        it('Project owner can see markdown on annotation view', () => {
            cy.login();
            checkGuideAndAssetAvailableOnAnnotationView();
        });

        it('Job assignee can see markdown on annotation view', () => {
            cy.login(additionalUsers.jobAssignee.username, additionalUsers.jobAssignee.password);
            checkGuideAndAssetAvailableOnAnnotationView();
        });

        it('Task assignee can see markdown on annotation view', () => {
            cy.login(additionalUsers.taskAssignee.username, additionalUsers.taskAssignee.password);
            checkGuideAndAssetAvailableOnAnnotationView();
        });

        it('Not assignee can not access the guide and the asset', () => {
            cy.login(additionalUsers.notAssignee.username, additionalUsers.notAssignee.password);
            cy.request({
                method: 'GET',
                url: `/api/guides/${guideID}`,
                failOnStatusCode: false,
            }).its('status').should('equal', 403);
            cy.request({
                method: 'GET',
                url: `/api/assets/${assetID}`,
                failOnStatusCode: false,
            }).its('status').should('equal', 403);
        });
    });
});

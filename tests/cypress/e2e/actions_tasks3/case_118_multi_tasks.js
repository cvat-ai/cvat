// Copyright (C) 2022-2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Create mutli tasks.', () => {
    const caseId = '118';
    const taskName = `Case ${caseId}`;
    const labelName = taskName;
    const sharePath = 'mounted_file_share';

    const expectedTopLevel = [
        { name: 'images', type: 'DIR', mime_type: 'DIR' },
        { name: 'videos', type: 'DIR', mime_type: 'DIR' },
    ];

    const expectedImagesList = [
        { name: 'image_1.jpg', type: 'REG', mime_type: 'image' },
        { name: 'image_2.jpg', type: 'REG', mime_type: 'image' },
        { name: 'image_3.jpg', type: 'REG', mime_type: 'image' },
    ];

    const expectedVideosList = [
        { name: 'video_1.mp4', type: 'REG', mime_type: 'video' },
        { name: 'video_2.mp4', type: 'REG', mime_type: 'video' },
        { name: 'video_3.mp4', type: 'REG', mime_type: 'video' },
    ];

    function submitTask() {
        cy.get('.cvat-create-task-content-alert').should('not.exist');
        cy.get('.cvat-create-task-content-footer [type="submit"]')
            .should('not.be.disabled')
            .contains(`Submit ${expectedVideosList.length} tasks`)
            .click();
    }

    function checkCreatedTasks() {
        cy.get('.cvat-create-multi-tasks-progress', { timeout: 50000 }).should('exist')
            .contains(`Total: ${expectedVideosList.length}`);
        cy.contains('button', 'Cancel');
        cy.get('.cvat-create-multi-tasks-state').should('exist')
            .contains('Finished');
        cy.get('.cvat-notification-create-task-success').within(() => {
            cy.get('.ant-notification-notice-close').click();
        });
        cy.contains('button', 'Retry failed tasks').should('be.disabled');
        cy.contains('button', 'Ok').click();
        expectedVideosList.forEach((video) => {
            cy.contains('strong', video.name).should('exist');
        });
    }

    before(() => {
        cy.visit('auth/login');
        cy.login();
    });

    beforeEach(() => {
        cy.get('.cvat-create-task-dropdown').click();
        cy.get('.cvat-create-multi-tasks-button').should('be.visible').click();
        cy.addNewLabel(labelName);
    });

    afterEach(() => {
        cy.goToTaskList();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Checking default name pattern', () => {
            cy.get('#name').should('have.attr', 'value', '{{file_name}}');
        });

        it('Trying to create a tasks with local images', () => {
            cy.contains('[role="tab"]', 'My computer').click();

            const imageNames = expectedImagesList.map((image) => image.name);
            const imagePaths = imageNames.map((name) => `${sharePath}/images/${name}`);

            cy.get('input[type="file"]')
                .selectFile(imagePaths, { action: 'drag-drop', force: true });

            cy.get('.ant-upload-animate').should('not.exist');
            cy.get('.cvat-create-task-content-alert').should('be.visible');
            cy.get('.cvat-create-task-content-footer [type="submit"]').should('be.disabled');
        });

        it('Trying to create a tasks with images from the shared storage', () => {
            cy.contains('[role="tab"]', 'Connected file share').click();
            cy.get('.cvat-share-tree')
                .should('be.visible')
                .within(() => {
                    cy.intercept('GET', '/api/server/share?**').as('shareRequest');
                    cy.get('[aria-label="plus-square"]').click();
                    cy.wait('@shareRequest').then((interception) => {
                        for (const item of expectedTopLevel) {
                            const responseEl = interception.response.body.find((el) => el.name === item.name);
                            expect(responseEl).to.deep.equal(item);
                        }
                    });
                    cy.get('[title="images"]').parent().within(() => {
                        cy.get('[aria-label="plus-square"]').click();
                    });
                    cy.wait('@shareRequest').then((interception) => {
                        expect(interception.response.body
                            .sort((a, b) => a.name.localeCompare(b.name)))
                            .to.deep.equal(expectedImagesList);
                    });
                    expectedImagesList.forEach((el) => {
                        const { name } = el;
                        cy.get(`[title="${name}"]`).parent().within(() => {
                            cy.get('.ant-tree-checkbox').click().should('have.attr', 'class').and('contain', 'checked');
                        });
                    });
                });

            cy.get('.cvat-create-task-content-alert').should('be.visible');
            cy.get('.cvat-create-task-content-footer [type="submit"]').should('be.disabled');
        });

        it('Trying to create a tasks with remote images', () => {
            const imageUrls =
                'https://raw.githubusercontent.com/cvat-ai/cvat/v1.2.0/cvat/apps/documentation/static/documentation/images/cvatt.jpg';

            cy.contains('[role="tab"]', 'Remote sources').click();
            cy.get('.cvat-file-selector-remote').clear().type(imageUrls);

            cy.get('.cvat-create-task-content-alert').should('be.visible');
            cy.get('.cvat-create-task-content-footer [type="submit"]').should('be.disabled');
        });

        it('Trying to create a tasks with local videos', () => {
            cy.contains('[role="tab"]', 'My computer').click();

            const videoNames = expectedVideosList.map((video) => video.name);
            const videoPaths = videoNames.map((name) => `${sharePath}/videos/${name}`);

            cy.get('input[type="file"]')
                .selectFile(videoPaths, { action: 'drag-drop', force: true });

            cy.get('.ant-upload-animate').should('not.exist');

            submitTask();
            checkCreatedTasks();
        });

        it('Trying to create a tasks with videos from the shared storage', () => {
            cy.contains('[role="tab"]', 'Connected file share').click();
            cy.get('.cvat-share-tree')
                .should('be.visible')
                .within(() => {
                    cy.intercept('GET', '/api/server/share?**').as('shareRequest');
                    cy.get('[aria-label="plus-square"]').click();
                    cy.wait('@shareRequest').then((interception) => {
                        for (const item of expectedTopLevel) {
                            const responseEl = interception.response.body.find((el) => el.name === item.name);
                            expect(responseEl).to.deep.equal(item);
                        }
                    });
                    cy.get('[title="videos"]').parent().within(() => {
                        cy.get('[aria-label="plus-square"]').click();
                    });
                    cy.wait('@shareRequest').then((interception) => {
                        expect(interception.response.body
                            .sort((a, b) => a.name.localeCompare(b.name)))
                            .to.deep.equal(expectedVideosList);
                    });
                    expectedVideosList.forEach((el) => {
                        const { name } = el;
                        cy.get(`[title="${name}"]`).parent().within(() => {
                            cy.get('.ant-tree-checkbox').click().should('have.attr', 'class').and('contain', 'checked');
                        });
                    });
                });

            submitTask();
            checkCreatedTasks();
        });

        it('Trying to create a tasks with remote videos', () => {
            const baseUrl = 'https://github.com/cvat-ai/cvat';
            const revision = 'raw/b2a66db76ba8316521bc7de2fbd418008ab3cb5b';
            const folder = 'tests/mounted_file_share';
            cy.contains('[role="tab"]', 'Remote sources').click();

            expectedVideosList.forEach((video) => {
                const URL = `${baseUrl}/${revision}/${folder}/${expectedTopLevel[1].name}/${video.name}`;
                cy.get('.cvat-file-selector-remote').type(URL).type('{enter}');
            });

            submitTask();
            checkCreatedTasks();
        });
    });

    after(() => {
        cy.logout();
        cy.getAuthKey().then((authKey) => {
            cy.deleteTasks(authKey, expectedVideosList.map((video) => video.name));
        });
    });
});

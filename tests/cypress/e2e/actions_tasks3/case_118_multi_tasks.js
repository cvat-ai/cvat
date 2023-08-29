// Copyright (C) 2022-2023 CVAT.ai Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Create mutli tasks.', () => {
    const caseId = '118';
    const taskName = `Case ${caseId}`;
    const labelName = taskName;
    const sharePath = 'mounted_file_share';

    const imageFiles = {
        images: ['image_1.jpg', 'image_2.jpg', 'image_3.jpg'],
    };

    const videoFiles = {
        videos: ['video_1.mp4', 'video_2.mp4', 'video_3.mp4'],
    };

    function submitTask() {
        cy.get('.cvat-create-task-content-alert').should('not.exist');
        cy.get('.cvat-create-task-content-footer [type="submit"]')
            .should('not.be.disabled')
            .contains(`Submit ${videoFiles.videos.length} tasks`)
            .click();
    }

    function checkCreatedTasks() {
        cy.get('.cvat-create-multi-tasks-progress', { timeout: 50000 }).should('exist')
            .contains(`Total: ${videoFiles.videos.length}`);
        cy.contains('button', 'Cancel');
        cy.get('.cvat-create-multi-tasks-state').should('exist')
            .contains('Finished');
        cy.get('.cvat-notification-create-task-success').within(() => {
            cy.get('.ant-notification-notice-close').click();
        });
        cy.contains('button', 'Retry failed tasks').should('be.disabled');
        cy.contains('button', 'Ok').click();
        videoFiles.videos.forEach((video) => {
            cy.contains('strong', video).should('exist');
        });
    }

    before(() => {
        cy.visit('auth/login');
        cy.login();
    });

    beforeEach(() => {
        cy.get('.cvat-create-task-dropdown').click();
        cy.get('.cvat-create-multi-tasks-button').should('be.visible').click();
        cy.addNewLabel({ name: labelName });
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
            const imagePaths = imageFiles.images.map((name) => `${sharePath}/images/${name}`);
            cy.get('input[type="file"]')
                .selectFile(imagePaths, { action: 'drag-drop', force: true });

            cy.get('.ant-upload-animate').should('not.exist');
            cy.get('.cvat-create-task-content-alert').should('be.visible');
            cy.get('.cvat-create-task-content-footer [type="submit"]').should('be.disabled');
        });

        it('Trying to create a tasks with images from the shared storage', () => {
            cy.selectFilesFromShare(imageFiles);
            cy.get('.cvat-create-task-content-alert').should('be.visible');
            cy.get('.cvat-create-task-content-footer [type="submit"]').should('be.disabled');
        });

        it('Trying to create a tasks with remote images', () => {
            const imageUrls =
                'https://raw.githubusercontent.com/cvat-ai/cvat/v1.2.0/cvat/apps/documentation/static/documentation/images/cvatt.jpg';

            cy.contains('[role="tab"]', 'Remote sources').click();
            cy.get('.cvat-file-selector-remote').clear();
            cy.get('.cvat-file-selector-remote').type(imageUrls);

            cy.get('.cvat-create-task-content-alert').should('be.visible');
            cy.get('.cvat-create-task-content-footer [type="submit"]').should('be.disabled');
        });

        it('Trying to create a tasks with local videos', () => {
            cy.contains('[role="tab"]', 'My computer').click();
            const videoPaths = videoFiles.videos.map((name) => `${sharePath}/videos/${name}`);
            cy.get('input[type="file"]')
                .selectFile(videoPaths, { action: 'drag-drop', force: true });

            cy.get('.ant-upload-animate').should('not.exist');

            submitTask();
            checkCreatedTasks();
        });

        it('Trying to create a tasks with videos from the shared storage', () => {
            cy.selectFilesFromShare(videoFiles);
            submitTask();
            checkCreatedTasks();
        });

        it('Trying to create a tasks with remote videos', () => {
            const baseUrl = 'https://github.com/cvat-ai/cvat';
            const revision = 'raw/b2a66db76ba8316521bc7de2fbd418008ab3cb5b';
            const folder = 'tests/mounted_file_share';
            cy.contains('[role="tab"]', 'Remote sources').click();

            videoFiles.videos.forEach((video) => {
                const URL = `${baseUrl}/${revision}/${folder}/videos/${video}`;
                cy.get('.cvat-file-selector-remote').type(URL);
                cy.get('.cvat-file-selector-remote').type('{enter}');
            });

            submitTask();
            checkCreatedTasks();
        });
    });

    after(() => {
        cy.logout();
        cy.getAuthKey().then((authKey) => {
            cy.deleteTasks(authKey, videoFiles.videos);
        });
    });
});

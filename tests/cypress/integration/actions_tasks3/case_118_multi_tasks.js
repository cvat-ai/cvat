// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Create mutli tasks.', () => {
    const caseId = '118';
    const taskName = `Case ${caseId}`;
    const labelName = taskName;
    const fixturesPath = 'cypress/fixtures';
    const imagesCount = 5;
    const imageFileName = `image_${taskName.replace(' ', '_').toLowerCase()}`;
    // const videoFileName = `video_${taskName.replace(' ', '_').toLowerCase()}`;
    const width = 800;
    const height = 800;
    const posX = 10;
    const posY = 10;
    const color = 'gray';
    const imagesFolder = `${fixturesPath}/${imageFileName}`;
    const imageListToAttach = [];
    // const imageListToVideo = [];
    // const videoFilesToAttach = [];
    // const videoTasksName = [`${videoFileName}_1.mp4`, `${videoFileName}_2.mp4`];

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

    for (let i = 1; i <= imagesCount; i++) {
        imageListToAttach.push(`${imageFileName}/${imageFileName}_${i}.png`);
        // imageListToVideo.push(`${imagesFolder}/${imageFileName}_${i}.png`);
    }
    // for (let i = 1; i <= videoCount; i++) {
    //     videoFilesToAttach.push(`${fixturesPath}/${videoFileName}_${i}.${videoExtention}`);
    // }

    before(() => {
        cy.visit('auth/login');
        cy.login();
        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
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
            cy.get('input[type="file"]').attachFile(imageListToAttach, { subjectType: 'drag-n-drop' });
            cy.get('.cvat-create-task-content-alert').should('be.visible');
            cy.get('[type="submit"]').should('be.disabled');

            cy.get('.cvat-create-task-content-alert').should('be.visible');
            cy.get('[type="submit"]').should('be.disabled');
        });

        it('Trying to create a tasks with images from the shared storage', () => {
            cy.contains('[role="tab"]', 'Connected file share').click();
            cy.get('.cvat-share-tree')
                .should('be.visible')
                .within(() => {
                    cy.intercept('GET', '/api/server/share?**').as('shareRequest');
                    cy.get('[aria-label="plus-square"]').click();
                    cy.wait('@shareRequest').then((interception) => {
                        expect(interception.response.body
                            .sort((a, b) => a.name.localeCompare(b.name)))
                            .to.deep.equal(expectedTopLevel);
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
        });

        it('Trying to create a tasks with remote images', () => {
            const imageUrls =
                'https://raw.githubusercontent.com/cvat-ai/cvat/v1.2.0/cvat/apps/documentation/static/documentation/images/cvatt.jpg';

            cy.contains('[role="tab"]', 'Remote sources').click();
            cy.get('.cvat-file-selector-remote').clear().type(imageUrls);

            cy.get('.cvat-create-task-content-alert').should('be.visible');
            cy.get('[type="submit"]').should('be.disabled');
        });

        // it.skip('Trying to create a tasks with local videos', () => {
        //     cy.get('input[type="file"]')
        //         // selectFile not work with no visible elements
        //         .invoke('attr', 'style', 'display: inline')
        //         // attachFile not work with video
        //         .selectFile(videoFilesToAttach, { subjectType: 'drag-n-drop' });
        //     cy.get('.cvat-create-task-content-alert').should('not.be.exist');
        //     cy.get('.cvat-create-task-content-footer [type="submit"]')
        //         .should('not.be.disabled')
        //         .contains(`Submit ${videoCount} tasks`)
        //         .click();
        //     cy.get('.cvat-create-multi-tasks-progress').should('be.exist')
        //         .contains(`Total: ${videoCount}`);
        //     cy.contains('button', 'Cancel');
        //     cy.get('.cvat-create-multi-tasks-state').should('be.exist')
        //         .contains('Finished');
        //     cy.contains('button', 'Retry failed tasks').should('be.disabled');
        //     cy.contains('button', 'Ok').click();

        //     videoTasksName.forEach((videoTaskName) => {
        //         cy.contains('strong', videoTaskName).should('be.exist');
        //     });
        // });

        it('Trying to create a tasks with videos from the shared storage', () => {
            cy.contains('[role="tab"]', 'Connected file share').click();
            cy.get('.cvat-share-tree')
                .should('be.visible')
                .within(() => {
                    cy.intercept('GET', '/api/server/share?**').as('shareRequest');
                    cy.get('[aria-label="plus-square"]').click();
                    cy.wait('@shareRequest').then((interception) => {
                        expect(interception.response.body
                            .sort((a, b) => a.name.localeCompare(b.name)))
                            .to.deep.equal(expectedTopLevel);
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

            cy.get('.cvat-create-task-content-alert').should('not.be.exist');
            cy.get('.cvat-create-task-content-footer [type="submit"]')
                .should('not.be.disabled')
                .contains(`Submit ${expectedVideosList.length} tasks`)
                .click();

            cy.get('.cvat-create-multi-tasks-progress').should('be.exist')
                .contains(`Total: ${expectedVideosList.length}`);
            cy.contains('button', 'Cancel');
            cy.get('.cvat-create-multi-tasks-state').should('be.exist')
                .contains('Finished');
            cy.contains('button', 'Retry failed tasks').should('be.disabled');
            cy.contains('button', 'Ok').click();

            expectedVideosList.forEach((video) => {
                cy.contains('strong', video.name).should('be.exist');
            });
        });

        it('Trying to create a tasks with remote videos', () => {
            const baseUrl = 'https://raw.githubusercontent.com/cvat-ai/cvat';
            const branch = 'aa/creating-multiple-tasks-uploading-videos/tests';
            const folder = 'tests/mounted_file_share';
            cy.contains('[role="tab"]', 'Remote sources').click();

            expectedVideosList.forEach((video) => {
                const URL = `${baseUrl}/${branch}/${folder}/${expectedTopLevel[1].name}/${video.name}`;
                cy.get('.cvat-file-selector-remote').type(URL).type('{enter}');
            });

            cy.get('.cvat-create-task-content-alert').should('not.be.exist');
            cy.get('.cvat-create-task-content-footer [type="submit"]')
                .should('not.be.disabled')
                .contains(`Submit ${expectedVideosList.length} tasks`)
                .click();
            cy.get('.cvat-create-multi-tasks-progress').should('be.exist')
                .contains(`Total: ${expectedVideosList.length}`);
            cy.contains('button', 'Cancel');
            cy.get('.cvat-create-multi-tasks-state').should('be.exist')
                .contains('Finished');
            cy.contains('button', 'Retry failed tasks').should('be.disabled');
            cy.contains('button', 'Ok').click();

            expectedVideosList.forEach((video) => {
                cy.contains('strong', video.name).should('be.exist');
            });
        });
    });

    after(() => {
        cy.logout();
        cy.getAuthKey().then((authKey) => {
            cy.deleteTasks(authKey, expectedVideosList.map((video) => video.name));
        });
    });
});

// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

function checkFrameNum(frameNum) {
    cy.get('.cvat-player-frame-selector').within(() => {
        cy.get('input[role="spinbutton"]').should('have.value', frameNum);
    });
}

function switchChapter(chapterNumber) {
    cy.contains('.cvat-player-chapter-menu-list-item', `Kapitel ${chapterNumber}`)
        .should('exist')
        .and('be.visible')
        .click();
}

function checkChapterNavigationButtons(direction, expectedSliderPos) {
    cy.get(`.cvat-player-buttons > .cvat-player-${direction}-button`).rightclick();
    cy.get(`.cvat-player-${direction}-chapter-inlined-button`)
        .should('exist')
        .and('be.visible')
        .click();
    cy.get(`.cvat-player-buttons > .cvat-player-${direction}-button-chapter`)
        .should('exist')
        .and('be.visible')
        .click();
    checkFrameNum(expectedSliderPos);
    cy.get(`.cvat-player-buttons > .cvat-player-${direction}-button-chapter`).rightclick();
    cy.get(`.cvat-player-${direction}-inlined-button`)
        .should('exist')
        .and('be.visible')
        .click();
    cy.get(`.cvat-player-${direction}-button`)
        .rightclick();
}

context('Video chapters', () => {
    const taskName = 'Video task with chapters';
    const serverFiles = ['videos/video_with_chapters.mp4'];

    const task = {
        name: taskName,
        project_id: null,
        source_storage: { location: 'local' },
        target_storage: { location: 'local' },
    };

    const storage = {
        server_files: serverFiles,
        image_quality: 70,
        use_cache: true,
    };

    let jobID = null;
    let taskID = null;

    before(() => {
        cy.visit('/auth/login');
        cy.login();
        cy.get('.cvat-tasks-page').should('exist').and('be.visible');
        cy.url().should('contain', '/tasks');
        cy.headlessCreateTask(task, storage).then((response) => {
            taskID = response.taskID;
            [jobID] = response.jobIDs;
        });
    });

    after(() => {
        cy.logout();
    });

    describe('Test chapter navigation buttons', () => {
        it('Chapter forward', () => {
            cy.visit(`/tasks/${taskID}/jobs/${jobID}`);
            cy.get('.cvat-player-buttons').should('exist').and('be.visible');
            checkChapterNavigationButtons('next', '20');
        });
        it('Chapter backwards', () => {
            checkChapterNavigationButtons('previous', '0');
        });
    });

    describe('Test chapter navigation via shortcuts', () => {
        it('Chapter forward (b)', () => {
            cy.realPress('b');
            checkFrameNum('20');
        });
        it('Chapter backwards (x)', () => {
            cy.realPress('x');
            checkFrameNum('0');
        });
    });

    describe('Test chapter menu', () => {
        it('Check menu overview', () => {
            cy.get('.cvat-player-chapters-menu-button').click();
            cy.get('.cvat-player-chapter-menu-wrapper').should('exist').and('be.visible');
            switchChapter(2);
            checkFrameNum('20');
            switchChapter(1);
            checkFrameNum('0');
        });
    });
});

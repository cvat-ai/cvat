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
            cy.get('.cvat-player-buttons > .cvat-player-next-button').rightclick();
            cy.get('.cvat-player-next-chapter-inlined-button')
                .should('exist')
                .and('be.visible')
                .click();
            cy.get('.cvat-player-buttons > .cvat-player-next-button-chapter')
                .should('exist')
                .and('be.visible')
                .click();
            cy.get('.ant-slider-handle')
                .should('have.attr', 'aria-valuenow')
                .and('equal', '20');
            cy.get('.cvat-player-buttons > .cvat-player-next-button-chapter').rightclick();
            cy.get('.cvat-player-next-inlined-button')
                .should('exist')
                .and('be.visible')
                .click();
            cy.get('.cvat-player-next-button')
                .rightclick();
        });
        it('Chapter backwards', () => {
            cy.get('.cvat-player-buttons > .cvat-player-previous-button').rightclick();
            cy.get('.cvat-player-previous-chapter-inlined-button')
                .should('exist')
                .and('be.visible')
                .click();
            cy.get('.cvat-player-buttons > .cvat-player-previous-button-chapter')
                .should('exist')
                .and('be.visible')
                .click();
            cy.get('.ant-slider-handle')
                .should('have.attr', 'aria-valuenow')
                .and('equal', '0');
            cy.get('.cvat-player-buttons > .cvat-player-previous-button-chapter').rightclick();
            cy.get('.cvat-player-previous-inlined-button')
                .should('exist')
                .and('be.visible')
                .click();
            cy.get('.cvat-player-previous-button')
                .rightclick();
        });
    });

    describe('Test chapter navigation via shortcuts', () => {
        it('Chapter forward (b)', () => {
            cy.realPress('b');
            cy.get('.ant-slider-handle')
                .should('have.attr', 'aria-valuenow')
                .and('equal', '20');
        });
        it('Chapter backwards (x)', () => {
            cy.realPress('x');
            cy.get('.ant-slider-handle')
                .should('have.attr', 'aria-valuenow')
                .and('equal', '0');
        });
    });

    describe('Test chapter menu', () => {
        it('Check menu overview', () => {
            cy.get('.cvat-player-chapters-menu-button').click();
            cy.get('.cvat-player-chapter-menu-wrapper').should('exist').and('be.visible');
            cy.contains('.cvat-player-chapter-menu-wrapper', 'Kapitel 2')
                .should('exist')
                .and('be.visible')
                .click();
            cy.get('.ant-slider-handle')
                .should('have.attr', 'aria-valuenow')
                .and('equal', '20');
            cy.contains('.cvat-player-chapter-menu-wrapper', 'Kapitel 1')
                .should('exist')
                .and('be.visible')
                .click();
            cy.get('.ant-slider-handle')
                .should('have.attr', 'aria-valuenow')
                .and('equal', '0');
        });
    });
});

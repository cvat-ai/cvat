// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Customizable Shortcuts', () => {
    const taskName = 'A task with markdown';
    const serverFiles = ['images/image_1.jpg'];
    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName: 'label 1',
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };
    let taskID = null;
    let jobID = null;

    const task = {
        labels: [
            {
                name: 'label 1',
                attributes: [
                    {
                        name: 'attribute 1',
                        mutable: true,
                        input_type: 'checkbox',
                        default_value: 'false',
                        values: ['false'],
                    },
                ],
                type: 'any',
            }, {
                name: 'label 2',
                attributes: [],
                type: 'any',
            }, {
                name: 'label 3',
                attributes: [],
                type: 'any',
            },
        ],
        name: taskName,
        project_id: null,
        source_storage: { location: 'local' },
        target_storage: { location: 'local' },
    };
    const storage = {
        server_files: serverFiles,
        image_quality: 70,
        use_zip_chunks: true,
        use_cache: true,
        sorting_method: 'lexicographical',
    };

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

    function testSearchShortcuts(search) {
        const searchShortcuts = [
            {
                title: 'Save the job',
                description: 'Submit unsaved changes of annotations to the server',
            },
            {
                title: 'Switch automatic bordering',
                description: 'Switch automatic bordering for polygons and polylines during drawing/editing',
            },
        ];
        const searchItemClass = search === 'description' ? '.cvat-shortcuts-settings-item-title' : '.cvat-shortcuts-settings-item-description';
        const randomSearchItem = search === 'description' ? 'random description shortcut' : 'random title shortcut';
        cy.get('.cvat-shortcuts-settings-search input').focus();
        for (const searchShortcut of searchShortcuts) {
            cy.get('.cvat-shortcuts-settings-search input').type(search === 'description' ? searchShortcut.description : searchShortcut.title);
            cy.get(searchItemClass).should('have.length', 1);
            cy.get(searchItemClass).contains(search === 'description' ? searchShortcut.title : searchShortcut.description);
            cy.get('.cvat-shortcuts-settings-search input').clear();
        }
        cy.get('.cvat-shortcuts-settings-search input').type(randomSearchItem);
        cy.get(searchItemClass).should('not.exist');
        cy.get('.cvat-shortcuts-settings-search input').clear();
        cy.get('.cvat-shortcuts-settings-search input').blur();
    }

    function checkShortcutsMounted(label) {
        cy.get('.cvat-shortcuts-modal-window-table').should('exist').and('be.visible');
        for (let i = 1; i < 3; i++) {
            cy.get('.cvat-shortcuts-modal-window-table').contains(label(i));
        }
    }

    function registerF2(shouldExist) {
        cy.get('.cvat-shortcuts-settings-collapse-item .cvat-shortcuts-settings-select').first().click();
        cy.realPress(['F2']);
        cy.get('.ant-modal-content').contains('Conflicting shortcuts detected');
        cy.get(
            shouldExist ?
                '.ant-modal-content .ant-modal-confirm-btns .ant-btn-primary' :
                '.ant-modal-content .ant-modal-confirm-btns .ant-btn-default',
        ).click();
        cy.get('.cvat-shortcuts-settings-collapse-item .cvat-shortcuts-settings-select').first().within(() => {
            cy.get('.ant-select-selection-overflow-item').contains('f2').should(shouldExist ? 'exist' : 'not.exist');
        });
        if (shouldExist) {
            cy.closeSettings();
            cy.realPress(['F2']);
            cy.get('.cvat-shortcuts-modal-window').should('exist').and('be.visible');
            cy.realPress(['F2']);
        }
    }

    after(() => {
        cy.logout();
    });

    describe('Searching for a shortcut', () => {
        it('Search a shortcut by its description', () => {
            cy.openSettings();
            cy.contains('Shortcuts').click();
            cy.get('.cvat-shortcuts-settings-search input').should('exist').and('be.visible');
            testSearchShortcuts('description');
        });
        it('Search a shortcut by its title', () => {
            testSearchShortcuts('title');
        });
    });

    describe('Registration and testing of new shortcuts', () => {
        it('Registering a combination shortcut and testing if it works or not', () => {
            cy.get('.cvat-shortcuts-settings-collapse').should('exist').and('be.visible');
            cy.get('.cvat-shortcuts-settings-label').first().click();
            cy.get('.cvat-shortcuts-settings-collapse-item').should('exist').and('be.visible');
            cy.get('.cvat-shortcuts-settings-collapse-item .cvat-shortcuts-settings-select').first().click();
            cy.realPress(['Control', 'Space']);
            cy.closeSettings();
            cy.realPress(['Control', 'Space']);
            cy.get('.cvat-shortcuts-modal-window').should('exist').and('be.visible');
            cy.realPress(['Control', 'Space']);
            cy.openSettings();
            registerF2(false);
            registerF2(true);
        });
    });

    describe('Saving, Clearing and Restoring to Default', () => {
        it('Saving shortcuts and checking if they persist', () => {
            cy.openSettings();
            cy.saveSettings();
            cy.reload();
            cy.openSettings();
            cy.contains('Shortcuts').click();
            cy.get('.cvat-shortcuts-settings-collapse').should('exist').and('be.visible');
            cy.get('.cvat-shortcuts-settings-label').first().click();
            cy.get('.cvat-shortcuts-settings-collapse-item .cvat-shortcuts-settings-select').first().within(() => {
                cy.get('.ant-select-selection-overflow-item').contains('ctrl+space').should('exist');
            });
        });
        it('Cleaning Shortcuts', () => {
            cy.get('.cvat-shortcuts-settings-collapse-item .cvat-shortcuts-settings-select').first().click();
            cy.get('.cvat-shortcuts-settings-collapse-item .cvat-shortcuts-settings-select .ant-select-selection-item-remove').first().click();
            cy.get('.cvat-shortcuts-settings-collapse-item .cvat-shortcuts-settings-select').first().within(() => {
                cy.get('.ant-select-selection-overflow-item').contains('f1').should('not.exist');
            });
            cy.get('.cvat-shortcuts-settings-collapse-item .cvat-shortcuts-settings-select .ant-select-clear').first().click();
            cy.get('.cvat-shortcuts-settings-collapse-item .cvat-shortcuts-settings-select').first().within(() => {
                cy.get('.ant-select-selection-overflow-item').should('not.have.text');
            });
        });
        it('Restoring Defaults', () => {
            cy.get('.cvat-shortcuts-settings-restore').click();
            cy.get('.cvat-shortcuts-settings-restore-modal .ant-btn-primary').click();
            cy.get(
                '.cvat-shortcuts-settings-collapse-item .cvat-shortcuts-settings-select .ant-select-selection-overflow-item').first().should('exist').and('be.visible');
            cy.get('.cvat-shortcuts-settings-collapse-item .cvat-shortcuts-settings-select .ant-select-selection-overflow-item').first().contains('f1');
            cy.saveSettings();
        });
        it('Modifying a shortcut via local storage and testing if its conflict is resolved', () => {
            cy.window().then((window) => {
                const { localStorage } = window;
                const clientSettings = JSON.parse(localStorage.getItem('clientSettings'));
                clientSettings.shortcuts.keyMap.SWITCH_SHORTCUTS.sequences = ['f2'];
                localStorage.setItem('clientSettings', JSON.stringify(clientSettings));
            });
            cy.reload();
            cy.openSettings();
            cy.contains('Shortcuts').click();
            cy.get('.cvat-shortcuts-settings-collapse').should('exist').and('be.visible');
            cy.get('.cvat-shortcuts-settings-label').first().click();
            cy.get('.cvat-shortcuts-settings-collapse-item .cvat-shortcuts-settings-select .ant-select-selection-overflow-item').first().contains('f2');
            cy.get('.cvat-shortcuts-settings-collapse-item .cvat-shortcuts-settings-select .ant-select-selection-overflow-item').eq(1).should('not.have.text');
            cy.get('.cvat-shortcuts-settings-restore').click();
            cy.get('.cvat-shortcuts-settings-restore-modal .ant-btn-primary').click();
        });
    });

    describe('Tag Annotation, Attribute Annotation and Labels', () => {
        it('Tag Annotation Mode, Dynamic Titles and Description', () => {
            cy.visit(`/tasks/${taskID}/jobs/${jobID}`);
            cy.get('.cvat-canvas-container').should('exist').and('be.visible');
            cy.createRectangle(createRectangleShape2Points);
            cy.changeWorkspace('Tag annotation');
            cy.get('.cvat-canvas-container').click();
            cy.realPress(['F1']);
            cy.get('.cvat-shortcuts-modal-window').should('exist').and('be.visible');
            cy.get('.cvat-shortcuts-modal-window .ant-pagination-item-2').click();
            checkShortcutsMounted((i) => `Create a new tag "label ${i}"`);
            cy.realPress(['F1']);
        });
        it('Attribute Annotation Mode, Dynamic Titles and Description', () => {
            cy.changeWorkspace('Attribute annotation');
            cy.get('.cvat-canvas-container').click();
            cy.realPress(['F1']);
            cy.get('.cvat-shortcuts-modal-window').should('exist').and('be.visible');
            cy.get('.cvat-shortcuts-modal-window .ant-pagination-item-3').click();
            cy.get('.cvat-shortcuts-modal-window-table').should('exist').and('be.visible');
            cy.get('.cvat-shortcuts-modal-window-table').contains('Assign attribute value false');
            cy.get('.cvat-shortcuts-modal-window-table').contains('Assign attribute value true');
            cy.realPress(['F1']);
        });
        it('Labels, Dynamic Titles and Description', () => {
            cy.changeWorkspace('Standard');
            cy.get('.cvat-canvas-container').click();
            cy.realPress(['F1']);
            cy.get('.cvat-shortcuts-modal-window').should('exist').and('be.visible');
            cy.get('.cvat-shortcuts-modal-window .ant-pagination-item-5').click();
            checkShortcutsMounted((i) => `Switch label to label ${i}`);
            cy.realPress(['F1']);
        });
    });
});

// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Customizable Shortcuts', () => {
    const searchShortcuts = [
        {
            title: 'Save the job',
            description: 'Send all changes of annotations to the server',
        },
        {
            title: 'Switch automatic bordering',
            description: 'Switch automatic bordering for polygons and polylines during drawing/editing',
        },
    ];
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
        cy.visit('auth/login');
        cy.login();
        cy.get('.cvat-tasks-page').should('exist').and('be.visible');
        cy.url().should('contain', '/tasks');
        cy.headlessCreateTask(task, storage).then((response) => {
            taskID = response.taskID;
            [jobID] = response.jobIDs;
        });
    });

    function testSearchShortcuts(searchDescription) {
        const searchItemClass = searchDescription ? '.cvat-shortcuts-settings-item-title' : '.cvat-shortcuts-settings-item-description';
        const randomSearchItem = searchDescription ? 'random description shortcut' : 'random title shortcut';
        cy.get('.cvat-shortcuts-settings-search input').focus();
        for (const searchShortcut of searchShortcuts) {
            cy.get('.cvat-shortcuts-settings-search input').type(searchDescription ? searchShortcut.description : searchShortcut.title);
            cy.get(searchItemClass).should('have.length', 1);
            cy.get(searchItemClass).contains(searchDescription ? searchShortcut.title : searchShortcut.description);
            cy.get('.cvat-shortcuts-settings-search input').clear();
        }
        cy.get('.cvat-shortcuts-settings-search input').type(randomSearchItem);
        cy.get(searchItemClass).should('not.exist');
        cy.get('.cvat-shortcuts-settings-search input').clear();
        cy.get('.cvat-shortcuts-settings-search input').blur();
    }

    function registerF2F3(shouldExist) {
        cy.get('.ant-list-item').should('exist').and('be.visible');
        cy.get('.ant-list-item .ant-select').first().click();
        cy.realPress(['F2']);
        cy.wait(200);
        cy.realPress(['F3']);
        cy.get('.ant-modal-content').contains('Conflicting shortcuts detected');
        cy.get(
            shouldExist ?
                '.ant-modal-content .ant-modal-confirm-btns .ant-btn-primary' :
                '.ant-modal-content .ant-modal-confirm-btns .ant-btn-default',
        ).click();
        cy.get('.ant-list-item .ant-select').first().within(() => {
            cy.get('.ant-select-selection-overflow-item').contains('f2 f3').should(shouldExist ? 'exist' : 'not.exist');
        });
    }

    function saveSettings() {
        cy.get('.cvat-settings-modal .ant-modal-footer .ant-btn-primary').click();
    }

    function checkShortcutsMounted(label) {
        cy.get('.cvat-shortcuts-modal-window-table').should('exist').and('be.visible');
        for (let i = 1; i < 4; i++) {
            cy.get('.cvat-shortcuts-modal-window-table').contains(label(i));
        }
    }

    after(() => {
        cy.logout();
    });

    describe('Searching for a shortcut', () => {
        it('Searching according to description', () => {
            cy.openSettings();
            cy.contains('Shortcuts').click();
            cy.get('.cvat-shortcuts-settings-search input').should('exist').and('be.visible');
            testSearchShortcuts(true);
        });
        it('Searching according to title', () => {
            testSearchShortcuts(false);
        });
    });

    describe('Registration and testing of new shortcuts', () => {
        it('Registering a new shortcut', () => {
            cy.get('.cvat-shortcuts-settings-collapse').should('exist').and('be.visible');
            cy.get('.ant-collapse-header').first().click();
            registerF2F3(false);
            registerF2F3(true);
        });
        it('Registering a combination shortcut and testing if it works or not', () => {
            cy.get('.ant-list-item').should('exist').and('be.visible');
            cy.get('.ant-list-item .ant-select').first().click();
            cy.realPress(['Control', 'Space']);
            cy.wait(1050);
            cy.closeSettings();
            cy.realPress(['Control', 'Space']);
            cy.get('.cvat-shortcuts-modal-window').should('exist').and('be.visible');
            cy.wait(150);
            cy.realPress(['Control', 'Space']);
        });
    });

    describe('Saving, Clearing and Restoring to Default', () => {
        it('Saving shortcuts and checking if they persist', () => {
            cy.openSettings();
            saveSettings();
            cy.reload();
            cy.openSettings();
            cy.contains('Shortcuts').click();
            cy.get('.cvat-shortcuts-settings-collapse').should('exist').and('be.visible');
            cy.get('.ant-collapse-header').first().click();
            cy.get('.ant-list-item .ant-select').first().within(() => {
                cy.get('.ant-select-selection-overflow-item').contains('ctrl+space').should('exist');
            });
        });
        it('Cleaning Shortcuts', () => {
            cy.get('.ant-list-item .ant-select').first().click();
            cy.get('.ant-list-item .ant-select .ant-select-selection-item-remove').first().click();
            cy.get('.ant-list-item .ant-select').first().within(() => {
                cy.get('.ant-select-selection-overflow-item').contains('f1').should('not.exist');
            });
            cy.get('.ant-list-item .ant-select .ant-select-clear').first().click();
            cy.get('.ant-list-item .ant-select').first().within(() => {
                cy.get('.ant-select-selection-overflow-item').should('not.have.text');
            });
        });
        it('Restoring Defaults', () => {
            cy.get('.cvat-settings-modal .cvat-shortcuts-setting .ant-btn-lg').eq(1).click();
            cy.get('.ant-modal-confirm .ant-btn-primary').click();
            cy.get('.ant-list-item .ant-select .ant-select-selection-overflow-item').first().should('exist').and('be.visible');
            cy.get('.ant-list-item .ant-select .ant-select-selection-overflow-item').first().contains('f1');
            saveSettings();
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
            cy.get('.ant-collapse-header').first().click();
            cy.get('.ant-list-item .ant-select .ant-select-selection-overflow-item').first().contains('f2');
            cy.get('.ant-list-item .ant-select .ant-select-selection-overflow-item').eq(1).should('not.have.text');
            cy.get('.cvat-settings-modal .cvat-shortcuts-setting .ant-btn-lg').eq(1).click();
            cy.get('.ant-modal-confirm .ant-btn-primary').click();
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

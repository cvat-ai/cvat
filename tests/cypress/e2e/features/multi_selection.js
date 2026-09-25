// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Multi-object selection', { scrollBehavior: false }, () => {
    const taskName = 'Multi-object selection';
    const serverFiles = ['images/image_1.jpg', 'images/image_2.jpg', 'images/image_3.jpg'];
    const labels = {
        car: 'car',
        person: 'person',
    };
    const objectIds = {
        carShape1: 1,
        carShape2: 2,
        personTrack1: 3,
        personTrack2: 4,
        points: 5,
        tag: 6,
    };
    const selectableObjectIds = Object.values(objectIds).filter((clientId) => clientId !== objectIds.tag);
    const rectangleIds = [
        objectIds.carShape1,
        objectIds.carShape2,
        objectIds.personTrack1,
        objectIds.personTrack2,
    ];

    let taskId = null;
    let jobId = null;

    const taskSpec = {
        name: taskName,
        labels: Object.values(labels).map((name) => ({
            name,
            type: 'any',
            attributes: [{
                name: 'quality',
                mutable: true,
                input_type: 'select',
                default_value: 'good',
                values: ['good', 'bad'],
            }],
        })),
        project_id: null,
        source_storage: { location: 'local' },
        target_storage: { location: 'local' },
    };
    const dataSpec = {
        server_files: serverFiles,
        image_quality: 70,
        use_zip_chunks: true,
        use_cache: true,
        sorting_method: 'lexicographical',
    };
    const rectangles = [{
        type: 'Shape',
        labelName: labels.car,
        firstX: 180,
        firstY: 200,
        secondX: 280,
        secondY: 300,
    }, {
        type: 'Shape',
        labelName: labels.car,
        firstX: 380,
        firstY: 200,
        secondX: 480,
        secondY: 300,
    }, {
        type: 'Track',
        labelName: labels.person,
        firstX: 180,
        firstY: 400,
        secondX: 280,
        secondY: 500,
    }, {
        type: 'Track',
        labelName: labels.person,
        firstX: 380,
        firstY: 400,
        secondX: 480,
        secondY: 500,
    }];
    const points = {
        type: 'Shape',
        labelName: labels.car,
        pointsMap: [{ x: 600, y: 250 }, { x: 650, y: 300 }],
        numberOfPoints: 2,
    };

    const sidebarItem = (clientId) => `#cvat-objects-sidebar-state-item-${clientId}`;
    const platformModifier = Cypress.platform === 'darwin' ? { metaKey: true } : { ctrlKey: true };

    function createRectangle(rectangle) {
        cy.interactControlButton('draw-rectangle');
        cy.switchLabel(rectangle.labelName, 'draw-rectangle');
        cy.get('.cvat-draw-rectangle-popover').within(() => {
            cy.contains(/2 Points$/).click();
            cy.contains('button', rectangle.type).click();
        });
        cy.get('.cvat-canvas-container').click(rectangle.firstX, rectangle.firstY);
        cy.get('.cvat-canvas-container').click(rectangle.secondX, rectangle.secondY);
        cy.checkPopoverHidden('draw-rectangle');
    }

    function assertSelection(expectedIds) {
        cy.get('.cvat-objects-sidebar-state-item-multi-selected')
            .should('have.length', expectedIds.length);
        expectedIds.forEach((clientId) => {
            cy.get(sidebarItem(clientId))
                .should('have.class', 'cvat-objects-sidebar-state-item-multi-selected');
        });
        if (expectedIds.length) {
            cy.get('.cvat_canvas_selected_objects_label_title')
                .should('have.text', `SELECTION (${expectedIds.length})`);
            cy.get('.cvat_canvas_selected_objects_box').should('exist').and('be.visible');
        } else {
            cy.get('.cvat_canvas_selected_objects_label').should('not.exist');
            cy.get('.cvat_canvas_selected_objects_box').should('not.exist');
        }
    }

    function selectFromSidebar(clientIds) {
        clientIds.forEach((clientId) => {
            cy.get(sidebarItem(clientId)).click({ ...platformModifier, force: true });
        });
        assertSelection(clientIds);
    }

    function clearSelection() {
        cy.get('body').type('{esc}', { force: true });
        assertSelection([]);
    }

    function openSelectionMenu() {
        cy.get('body').then(($body) => {
            if (!$body.find('.cvat-canvas-selected-objects-menu-content:visible').length) {
                cy.get('.cvat_canvas_selected_objects_box').rightclick({ force: true });
            }
        });
        cy.get('.cvat-canvas-selected-objects-menu-content').should('exist').and('be.visible');
    }

    function openSelectionOverflowMenu() {
        openSelectionMenu();
        cy.get('.cvat-canvas-selected-objects-more-button').click();
        cy.get('.cvat-canvas-selected-objects-overflow-menu').should('exist').and('be.visible');
    }

    function runSelectAllShortcut() {
        cy.pressWithPlatformModifier('a');
    }

    function dragSelectionElement(selector, deltaX, deltaY, modifiers = {}) {
        cy.get(selector).then(($element) => {
            const box = $element[0].getBoundingClientRect();
            const startX = box.left + box.width / 2;
            const startY = box.top + box.height / 2;
            cy.wrap($element).trigger('mousedown', {
                button: 0,
                buttons: 1,
                clientX: startX,
                clientY: startY,
                ...modifiers,
            });
            cy.get('#cvat_canvas_content').trigger('mousemove', {
                button: 0,
                buttons: 1,
                clientX: startX + deltaX,
                clientY: startY + deltaY,
                ...modifiers,
            });
            cy.document().trigger('mouseup', {
                button: 0,
                clientX: startX + deltaX,
                clientY: startY + deltaY,
                ...modifiers,
            });
        });
    }

    function dragSelectionBox(deltaX, deltaY) {
        dragSelectionElement('.cvat_canvas_selected_objects_box', deltaX, deltaY);
    }

    function assertSelectionDragDoesNotPan(selector, modifiers = {}) {
        cy.get('#cvat_canvas_content').then(($content) => {
            const initialBox = $content[0].getBoundingClientRect();
            dragSelectionElement(selector, 30, 20, modifiers);
            cy.get('#cvat_canvas_content').should(($currentContent) => {
                const currentBox = $currentContent[0].getBoundingClientRect();
                expect(currentBox.left).to.be.closeTo(initialBox.left, 0.1);
                expect(currentBox.top).to.be.closeTo(initialBox.top, 0.1);
            });
        });
    }

    function drawSelectionBox(start, end, modifiers = {}) {
        cy.get('#cvat_canvas_content').trigger('mousedown', {
            button: 0,
            buttons: 1,
            clientX: start.x,
            clientY: start.y,
            ...modifiers,
        });
        cy.get('#cvat_canvas_content').trigger('mousemove', {
            button: 0,
            buttons: 1,
            clientX: end.x,
            clientY: end.y,
            ...modifiers,
        });
        cy.document().trigger('mouseup', {
            button: 0,
            clientX: end.x,
            clientY: end.y,
            ...modifiers,
        });
    }

    function shiftDrawSelectionBox(start, end) {
        cy.get('#cvat_canvas_content').then(($canvas) => {
            const canvas = $canvas[0].getBoundingClientRect();
            const startX = start.x - canvas.left;
            const startY = start.y - canvas.top;
            const endX = end.x - canvas.left;
            const endY = end.y - canvas.top;

            cy.wrap($canvas).realMouseDown({
                x: startX,
                y: startY,
                shiftKey: true,
                scrollBehavior: false,
            });
            cy.wrap($canvas).realMouseMove(startX + 4, startY, {
                shiftKey: true,
                scrollBehavior: false,
            });
            cy.wrap($canvas).realMouseMove(endX, endY, {
                shiftKey: true,
                scrollBehavior: false,
            });
            cy.wrap($canvas).realMouseUp({
                x: endX,
                y: endY,
                shiftKey: true,
                scrollBehavior: false,
            });
        });
    }

    before(() => {
        cy.visit('/auth/login');
        cy.login();
        cy.headlessCreateTask(taskSpec, dataSpec).then((response) => {
            taskId = response.taskId;
            [jobId] = response.jobIds;
            cy.visit(`/tasks/${taskId}/jobs/${jobId}`);
            cy.get('.cvat-canvas-container').should('exist').and('be.visible');
        });

        rectangles.forEach((rectangle) => createRectangle(rectangle));
        cy.createPoint(points);
        cy.createTag(labels.car);

        // Drawn objects are pinned by default. Keep this fixture movable for movement tests.
        rectangleIds.forEach((clientId) => {
            cy.get(sidebarItem(clientId)).within(() => {
                cy.get('.cvat-object-item-button-pinned').then(($button) => {
                    if ($button.hasClass('cvat-object-item-button-pinned-enabled')) {
                        cy.wrap($button).click();
                    }
                });
            });
        });
    });

    after(() => {
        if (taskId !== null) {
            cy.saveJob();
            cy.headlessDeleteTask(taskId);
        }
        cy.headlessLogout();
    });

    beforeEach(() => {
        cy.goCheckFrameNumber(0);
        cy.contains('[role="tab"]', 'Objects').click();
        cy.get('.cvat-select-control').then(($control) => {
            if ($control.hasClass('cvat-active-canvas-control')) {
                cy.wrap($control).click();
            }
        });
        cy.get('body').type('{esc}', { force: true });
        cy.get('.cvat_canvas_selected_objects_label').should('not.exist');
    });

    it('Keeps selection control borders at a constant screen size while zooming', () => {
        const strokeVariables = [
            '--cvat-selection-stroke-width',
            '--cvat-selection-point-stroke-width',
        ];
        const readScale = (element) => {
            const view = element.ownerDocument.defaultView;
            const matrix = new view.DOMMatrix(view.getComputedStyle(element).transform);
            return Math.hypot(matrix.a, matrix.b);
        };
        const readStrokeWidths = (element) => {
            const view = element.ownerDocument.defaultView;
            const style = view.getComputedStyle(element);
            return strokeVariables.map((variable) => Number.parseFloat(style.getPropertyValue(variable)));
        };
        let initialScale = 0;
        let initialWidths = [];

        selectFromSidebar([objectIds.points]);
        cy.get('#cvat_canvas_content').then(($content) => {
            initialScale = readScale($content[0]);
        });
        cy.get('.cvat_canvas_shape_selected_object').then(($selectedShape) => {
            initialWidths = readStrokeWidths($selectedShape[0]);
        });
        cy.get('.cvat-canvas-container').trigger('wheel', { deltaY: -5 });
        cy.get('#cvat_canvas_content').should(($zoomedContent) => {
            const zoomedScale = readScale($zoomedContent[0]);
            expect(zoomedScale).not.to.equal(initialScale);
            const selectedShape = $zoomedContent[0]
                .querySelector('.cvat_canvas_shape_selected_object');
            expect(selectedShape).not.to.be.null;
            const zoomedWidths = readStrokeWidths(selectedShape);
            zoomedWidths.forEach((width, index) => {
                expect(width * zoomedScale).to.be.closeTo(initialWidths[index] * initialScale, 0.01);
            });
        });

        clearSelection();
        cy.get('.cvat-fit-control').click({ force: true });
        cy.get('body').trigger('mousemove', { clientX: 0, clientY: 0, force: true });
    });

    it('Adds and removes objects with Mod-click on the canvas and in the Objects tab', () => {
        cy.get(`#cvat_canvas_shape_${objectIds.carShape1}`).click({ ...platformModifier, force: true });
        assertSelection([objectIds.carShape1]);

        cy.get(sidebarItem(objectIds.carShape2)).click({ ...platformModifier });
        assertSelection([objectIds.carShape1, objectIds.carShape2]);

        cy.get(`#cvat_canvas_shape_${objectIds.carShape1}`).click({ ...platformModifier, force: true });
        assertSelection([objectIds.carShape2]);

        cy.get('.cvat-canvas-container').click(700, 600);
        assertSelection([]);

        selectFromSidebar([objectIds.carShape1, objectIds.carShape2]);
        cy.get(sidebarItem(objectIds.personTrack1)).click();
        assertSelection([]);
        cy.get(sidebarItem(objectIds.personTrack1)).should('have.class', 'cvat-objects-sidebar-state-active-item');
    });

    it('Replaces objects selected with Mod-click when starting a Shift-drag selection', () => {
        cy.get(`#cvat_canvas_shape_${objectIds.carShape1}`).click({ ...platformModifier, force: true });
        assertSelection([objectIds.carShape1]);

        cy.get(`#cvat_canvas_shape_${objectIds.carShape2}`).then(($shape) => {
            const box = $shape[0].getBoundingClientRect();
            shiftDrawSelectionBox({
                x: box.left - 5,
                y: box.top - 5,
            }, {
                x: box.right + 5,
                y: box.bottom + 5,
            });
        });

        assertSelection([objectIds.carShape2]);
        cy.get('.cvat-select-control').should('have.class', 'cvat-active-canvas-control');
    });

    it('Selects a sidebar range with Shift and all selectable objects with Mod+A', () => {
        cy.get(sidebarItem(objectIds.carShape1)).click({ ...platformModifier, force: true });
        cy.get(sidebarItem(objectIds.personTrack2)).click({ shiftKey: true, force: true });
        assertSelection([
            objectIds.carShape1,
            objectIds.carShape2,
            objectIds.personTrack1,
            objectIds.personTrack2,
        ]);

        clearSelection();
        runSelectAllShortcut();
        assertSelection(selectableObjectIds);
        cy.get(sidebarItem(objectIds.tag))
            .should('not.have.class', 'cvat-objects-sidebar-state-item-multi-selected');
    });

    it('Selects only objects fully contained by the selection bbox', () => {
        cy.get('.cvat-select-control').click();
        cy.get('.cvat-select-control').should('have.class', 'cvat-active-canvas-control');
        cy.get(`#cvat_canvas_shape_${objectIds.carShape1}`).then(($firstShape) => {
            const first = $firstShape[0].getBoundingClientRect();
            cy.get(`#cvat_canvas_shape_${objectIds.carShape2}`).then(($secondShape) => {
                const second = $secondShape[0].getBoundingClientRect();
                drawSelectionBox({
                    x: first.left - 5,
                    y: Math.min(first.top, second.top) - 5,
                }, {
                    x: second.left + second.width / 2,
                    y: Math.max(first.bottom, second.bottom) + 5,
                });
            });
        });
        assertSelection([objectIds.carShape1]);
        cy.get('.cvat-select-control').should('have.class', 'cvat-active-canvas-control');

        cy.get(`#cvat_canvas_shape_${objectIds.carShape2}`).then(($shape) => {
            const box = $shape[0].getBoundingClientRect();
            drawSelectionBox({
                x: box.left - 5,
                y: box.top - 5,
            }, {
                x: box.right + 5,
                y: box.bottom + 5,
            });
        });
        assertSelection([objectIds.carShape2]);
        cy.get('.cvat-select-control').should('have.class', 'cvat-active-canvas-control');
    });

    it('Ignores the click emitted after a selection drag', () => {
        cy.get('.cvat-select-control').click();
        cy.get(`#cvat_canvas_shape_${objectIds.carShape1}`).then(($shape) => {
            const box = $shape[0].getBoundingClientRect();
            drawSelectionBox({
                x: box.left - 5,
                y: box.top - 5,
            }, {
                x: box.right + 5,
                y: box.bottom + 5,
            });
        });
        assertSelection([objectIds.carShape1]);

        cy.get(`#cvat_canvas_shape_${objectIds.carShape2}`).then(($shape) => {
            const box = $shape[0].getBoundingClientRect();
            cy.wrap($shape).trigger('click', {
                clientX: box.left + box.width / 2,
                clientY: box.top + box.height / 2,
            });
        });
        assertSelection([objectIds.carShape1]);
    });

    it('Toggles semantic object hits with unmodified clicks in Select mode', () => {
        cy.get('.cvat-select-control').click();
        cy.get(`#cvat_canvas_shape_${objectIds.carShape1}`).realClick({ position: 'center' });
        assertSelection([objectIds.carShape1]);

        cy.get(`#cvat_canvas_shape_${objectIds.carShape2}`).realClick({ position: 'center' });
        assertSelection([objectIds.carShape1, objectIds.carShape2]);

        cy.get(`#cvat_canvas_shape_${objectIds.carShape1}`).realClick({ position: 'center' });
        assertSelection([objectIds.carShape2]);
        cy.get(`#cvat_canvas_shape_${objectIds.carShape2}`).realClick({ position: 'center' });
        assertSelection([]);
        cy.get('.cvat-select-control').should('have.class', 'cvat-active-canvas-control');

        cy.get(`#cvat_canvas_shape_${objectIds.points}`).find('circle').first().realClick();
        assertSelection([objectIds.points]);
        cy.get(`#cvat_canvas_shape_${objectIds.points}`).find('circle').first().realClick();
        assertSelection([]);
        cy.get('.cvat-select-control').should('have.class', 'cvat-active-canvas-control');
    });

    it('Keeps Cursor active when a Shift-drag selects no objects', () => {
        cy.get('.cvat-cursor-control').should('have.class', 'cvat-active-canvas-control');
        cy.get(`#cvat_canvas_shape_${objectIds.carShape1}`).click({ ...platformModifier, force: true });
        assertSelection([objectIds.carShape1]);
        cy.get(`#cvat_canvas_shape_${objectIds.carShape1}`).then(($firstShape) => {
            const first = $firstShape[0].getBoundingClientRect();
            cy.get(`#cvat_canvas_shape_${objectIds.carShape2}`).then(($secondShape) => {
                const second = $secondShape[0].getBoundingClientRect();
                const start = { x: first.right + 10, y: first.top };
                const end = { x: second.left - 10, y: first.bottom };
                shiftDrawSelectionBox(start, end);
            });
        });

        assertSelection([]);
        cy.get('.cvat-cursor-control').should('have.class', 'cvat-active-canvas-control');
        cy.get('.cvat-select-control').should('not.have.class', 'cvat-active-canvas-control');
    });

    it('Starts bbox selection with Shift-drag while the Cursor tool is active', () => {
        cy.get('.cvat-cursor-control').should('have.class', 'cvat-active-canvas-control');
        cy.get(`#cvat_canvas_shape_${objectIds.carShape1}`).then(($firstShape) => {
            const first = $firstShape[0].getBoundingClientRect();
            cy.get(`#cvat_canvas_shape_${objectIds.carShape2}`).then(($secondShape) => {
                const second = $secondShape[0].getBoundingClientRect();
                cy.get('#cvat_canvas_content').then(($canvas) => {
                    const canvas = $canvas[0].getBoundingClientRect();
                    const startX = first.left - canvas.left - 5;
                    const startY = Math.min(first.top, second.top) - canvas.top - 5;
                    const endX = second.right - canvas.left + 5;
                    const endY = Math.max(first.bottom, second.bottom) - canvas.top + 5;

                    cy.wrap($canvas).realMouseDown({
                        x: startX,
                        y: startY,
                        shiftKey: true,
                        scrollBehavior: false,
                    });
                    cy.wrap($canvas).realMouseMove(startX + 4, startY, {
                        shiftKey: true,
                        scrollBehavior: false,
                    });
                    cy.wrap($canvas).realMouseMove(endX, endY, {
                        shiftKey: true,
                        scrollBehavior: false,
                    });
                    cy.wrap($canvas).realMouseUp({
                        x: endX,
                        y: endY,
                        shiftKey: true,
                        scrollBehavior: false,
                    });
                });
            });
        });

        assertSelection([objectIds.carShape1, objectIds.carShape2]);
        cy.get('.cvat-select-control').should('have.class', 'cvat-active-canvas-control');
    });

    it('Excludes hidden objects and tags from selection', () => {
        cy.get(sidebarItem(objectIds.carShape1)).within(() => {
            cy.get('.cvat-object-item-button-hidden').click({ force: true });
        });
        runSelectAllShortcut();
        assertSelection(selectableObjectIds.filter((clientId) => clientId !== objectIds.carShape1));

        clearSelection();
        cy.get(sidebarItem(objectIds.carShape1)).within(() => {
            cy.get('.cvat-object-item-button-hidden-enabled').click({ force: true });
        });
        cy.get(sidebarItem(objectIds.tag)).click({ ...platformModifier, force: true });
        assertSelection([]);
    });

    it('Removes an object from the active selection when it is hidden', () => {
        selectFromSidebar([objectIds.carShape1, objectIds.carShape2]);
        cy.get(sidebarItem(objectIds.carShape1)).within(() => {
            cy.get('.cvat-object-item-button-hidden').click({ force: true });
        });
        assertSelection([objectIds.carShape2]);

        cy.pressWithPlatformModifier('z');
        assertSelection([objectIds.carShape1, objectIds.carShape2]);

        cy.pressWithPlatformModifier('{shift}z');
        assertSelection([objectIds.carShape2]);

        cy.get(sidebarItem(objectIds.carShape1)).within(() => {
            cy.get('.cvat-object-item-button-hidden-enabled').click({ force: true });
        });
        assertSelection([objectIds.carShape2]);
        clearSelection();
    });

    it('Toggles a layer selection when the layer contains hidden objects', () => {
        cy.get(sidebarItem(objectIds.carShape1)).within(() => {
            cy.get('.cvat-object-item-button-hidden').click({ force: true });
        });
        cy.sidebarItemSortBy('Layer');

        cy.get('.cvat-objects-sidebar-z-layer-mark').first().click({ ...platformModifier, force: true });
        assertSelection(selectableObjectIds.filter((clientId) => clientId !== objectIds.carShape1));
        cy.get('.cvat-objects-sidebar-z-layer-mark').first().click({ shiftKey: true, force: true });
        assertSelection(selectableObjectIds.filter((clientId) => clientId !== objectIds.carShape1));
        cy.get('.cvat-objects-sidebar-z-layer-mark').first().click({ ...platformModifier, force: true });
        assertSelection([]);

        cy.get(sidebarItem(objectIds.carShape1)).within(() => {
            cy.get('.cvat-object-item-button-hidden-enabled').click({ force: true });
        });
        cy.sidebarItemSortBy('ID - ascent');
    });

    it('Selects complete label and layer groups and works with Layer ordering', () => {
        cy.contains('[role="tab"]', 'Labels').click();
        cy.contains('.cvat-objects-sidebar-label-item', labels.car).click({ ...platformModifier });
        assertSelection([objectIds.carShape1, objectIds.carShape2, objectIds.points]);
        cy.get('.cvat-objects-sidebar-label-item-multi-selected').should('have.length', 1);
        openSelectionMenu();
        cy.get('.cvat-canvas-selected-objects-count').should('have.text', '3 OBJECTS');
        cy.get('.cvat-canvas-selected-objects-type-text').should('have.text', 'RECT + POINTS');

        clearSelection();
        cy.contains('[role="tab"]', 'Objects').click();
        cy.sidebarItemSortBy('Layer');
        cy.get(sidebarItem(objectIds.carShape1)).click({ ...platformModifier, force: true });
        cy.get(sidebarItem(objectIds.carShape2)).click({ ...platformModifier, force: true });
        assertSelection([objectIds.carShape1, objectIds.carShape2]);

        clearSelection();
        cy.get('.cvat-objects-sidebar-z-layer-mark').first().click({ ...platformModifier, force: true });
        assertSelection(selectableObjectIds);
        clearSelection();
        cy.sidebarItemSortBy('ID - ascent');
        assertSelection([]);
    });

    it('Limits Layer Stack Shift-click ranges to one layer', () => {
        cy.get(sidebarItem(objectIds.carShape1)).find('[aria-label="more"]').click({ force: true });
        cy.contains('.cvat-object-item-menu:visible button', 'To foreground').click();
        cy.get(sidebarItem(objectIds.carShape2)).find('[aria-label="more"]').click({ force: true });
        cy.contains('.cvat-object-item-menu:visible button', 'To one layer forward').click();
        cy.sidebarItemSortBy('Layer');

        cy.get(sidebarItem(objectIds.personTrack1)).click({ ...platformModifier, force: true });
        cy.get(sidebarItem(objectIds.carShape1))
            .find('.cvat-objects-sidebar-state-item-object-type-text')
            .click({ shiftKey: true, force: true });
        assertSelection([objectIds.personTrack1, objectIds.carShape1]);

        cy.get(sidebarItem(objectIds.carShape2))
            .find('.cvat-objects-sidebar-state-item-object-type-text')
            .click({ shiftKey: true, force: true });
        assertSelection([objectIds.personTrack1, objectIds.carShape1, objectIds.carShape2]);

        clearSelection();
        cy.get(sidebarItem(objectIds.carShape1)).find('[aria-label="more"]').click({ force: true });
        cy.contains('.cvat-object-item-menu:visible button', 'To one layer backward').click();
        cy.get(sidebarItem(objectIds.carShape2)).find('[aria-label="more"]').click({ force: true });
        cy.contains('.cvat-object-item-menu:visible button', 'To one layer backward').click();
        cy.sidebarItemSortBy('ID - ascent');
    });

    it('Keeps selected tracks across frames and restores the previous selection with Undo', () => {
        selectFromSidebar([objectIds.carShape1, objectIds.personTrack1, objectIds.personTrack2]);
        cy.goCheckFrameNumber(1);
        assertSelection([objectIds.personTrack1, objectIds.personTrack2]);
        cy.goCheckFrameNumber(0);
        assertSelection([objectIds.personTrack1, objectIds.personTrack2]);
        cy.contains('.cvat-annotation-header-button', 'Undo').click();
        assertSelection([objectIds.carShape1, objectIds.personTrack1, objectIds.personTrack2]);
    });

    it('Restores the complete selection when undoing an Escape clear', () => {
        selectFromSidebar([objectIds.carShape1, objectIds.carShape2]);
        clearSelection();
        cy.pressWithPlatformModifier('z');
        assertSelection([objectIds.carShape1, objectIds.carShape2]);
    });

    it('Moves a selection as one action and restores it with Undo', () => {
        selectFromSidebar([objectIds.carShape1, objectIds.carShape2]);
        cy.get(`#cvat_canvas_shape_${objectIds.carShape1}`).invoke('attr', 'x').then((initialX) => {
            dragSelectionBox(30, 20);
            cy.get(`#cvat_canvas_shape_${objectIds.carShape1}`)
                .should('not.have.attr', 'x', initialX);
            cy.contains('.cvat-annotation-header-button', 'Undo').click();
            cy.get(`#cvat_canvas_shape_${objectIds.carShape1}`)
                .should('have.attr', 'x', initialX);
        });
        assertSelection([objectIds.carShape1, objectIds.carShape2]);

        cy.get(`#cvat_canvas_shape_${objectIds.carShape1}`).invoke('attr', 'x').then((initialX) => {
            dragSelectionElement('.cvat_canvas_selected_objects_label_title', 30, 20);
            cy.get(`#cvat_canvas_shape_${objectIds.carShape1}`)
                .should('not.have.attr', 'x', initialX);
            cy.contains('.cvat-annotation-header-button', 'Undo').click();
            cy.get(`#cvat_canvas_shape_${objectIds.carShape1}`)
                .should('have.attr', 'x', initialX);
        });
        assertSelection([objectIds.carShape1, objectIds.carShape2]);
    });

    it('Keeps a rotated shape aligned with selection movement previews', () => {
        const shapeSelector = `#cvat_canvas_shape_${objectIds.carShape1}`;
        cy.get(shapeSelector).trigger('mousemove');
        cy.get(shapeSelector).should('have.class', 'cvat_canvas_shape_activated');
        cy.get('body').type('{ctrl}r');
        cy.get('.cvat-annotation-header-undo-button').trigger('mouseover');
        cy.get('.ant-tooltip-inner').should('contain.text', 'Undo: Object rotated');
        cy.get('.cvat-annotation-header-undo-button').click();
        cy.get('.cvat-annotation-header-redo-button').trigger('mouseover');
        cy.get('.ant-tooltip-inner').should('contain.text', 'Redo: Object rotated');
        cy.get('.cvat-annotation-header-undo-button').trigger('mouseover');
        cy.get('.ant-tooltip-inner').should('not.contain.text', 'Undo: Changed points');
        cy.get('.cvat-annotation-header-redo-button').click();

        cy.get('.svg_select_points_rot').should('be.visible').and('have.length', 1);
        cy.get('.svg_select_points_rot').trigger('mousedown', { button: 0 });
        cy.get('.cvat-canvas-container').trigger('mousemove', 350, 150);
        cy.get('.cvat-canvas-container').trigger('mouseup');
        cy.get('.cvat-annotation-header-undo-button').trigger('mouseover');
        cy.get('.ant-tooltip-inner').should('contain.text', 'Undo: Object rotated');
        cy.get('.cvat-annotation-header-undo-button').click();
        cy.get('.cvat-annotation-header-redo-button').trigger('mouseover');
        cy.get('.ant-tooltip-inner').should('contain.text', 'Redo: Object rotated');
        cy.get('.cvat-annotation-header-undo-button').trigger('mouseover');
        cy.get('.ant-tooltip-inner').should('not.contain.text', 'Undo: Changed points');
        cy.get('.cvat-annotation-header-redo-button').click();

        selectFromSidebar([objectIds.carShape1]);
        cy.get(shapeSelector).then(($shape) => {
            const initialBox = $shape[0].getBoundingClientRect();
            cy.get('.cvat_canvas_selected_objects_box').then(($selectionBox) => {
                const selectionBox = $selectionBox[0].getBoundingClientRect();
                const startX = selectionBox.left + selectionBox.width / 2;
                const startY = selectionBox.top + selectionBox.height / 2;

                cy.wrap($selectionBox).trigger('mousedown', {
                    button: 0,
                    buttons: 1,
                    clientX: startX,
                    clientY: startY,
                });
                cy.get('#cvat_canvas_content').trigger('mousemove', {
                    button: 0,
                    buttons: 1,
                    clientX: startX + 30,
                    clientY: startY + 20,
                });
                cy.get(shapeSelector).then(($movedShape) => {
                    const movedBox = $movedShape[0].getBoundingClientRect();
                    expect(movedBox.left).to.be.closeTo(initialBox.left + 30, 1);
                    expect(movedBox.top).to.be.closeTo(initialBox.top + 20, 1);
                });
                cy.document().trigger('mouseup', {
                    button: 0,
                    clientX: startX + 30,
                    clientY: startY + 20,
                });
            });
        });

        cy.contains('.cvat-annotation-header-button', 'Undo').click();
        cy.get(sidebarItem(objectIds.carShape2)).click({ ...platformModifier, force: true });
        assertSelection([objectIds.carShape1, objectIds.carShape2]);
        cy.pressWithPlatformModifier('c');
        cy.pressWithPlatformModifier('v');
        cy.get('.cvat_canvas_shape_drawing').should('have.length', 2).then(($previews) => {
            const initialBoxes = [...$previews].map((preview) => preview.getBoundingClientRect());
            cy.get('.cvat-canvas-container').realMouseMove(600, 500);
            cy.get('.cvat_canvas_shape_drawing').should(($movedPreviews) => {
                const movedBoxes = [...$movedPreviews].map((preview) => preview.getBoundingClientRect());
                const dx = movedBoxes[0].left - initialBoxes[0].left;
                const dy = movedBoxes[0].top - initialBoxes[0].top;
                expect(movedBoxes[1].left - initialBoxes[1].left).to.be.closeTo(dx, 1);
                expect(movedBoxes[1].top - initialBoxes[1].top).to.be.closeTo(dy, 1);
            });
        });
        cy.get('body').type('{esc}', { force: true });
        cy.get('.cvat_canvas_shape_drawing').should('not.exist');

        clearSelection();
        cy.get(shapeSelector).trigger('mousemove');
        cy.get(shapeSelector).should('have.class', 'cvat_canvas_shape_activated');
        cy.get('body').type('{ctrl}r{ctrl}r{ctrl}r');
    });

    it('Moves unlocked members while locked members stay selected and stationary', () => {
        cy.get(sidebarItem(objectIds.carShape1)).within(() => {
            cy.get('.cvat-object-item-button-lock').click();
        });
        selectFromSidebar([objectIds.carShape1, objectIds.carShape2]);

        cy.get(`#cvat_canvas_shape_${objectIds.carShape1}`).invoke('attr', 'x').then((lockedX) => {
            cy.get(`#cvat_canvas_shape_${objectIds.carShape2}`).invoke('attr', 'x').then((movableX) => {
                dragSelectionBox(30, 20);
                cy.get(`#cvat_canvas_shape_${objectIds.carShape1}`).should('have.attr', 'x', lockedX);
                cy.get(`#cvat_canvas_shape_${objectIds.carShape2}`).should('not.have.attr', 'x', movableX);
                assertSelection([objectIds.carShape1, objectIds.carShape2]);
                cy.contains('.cvat-annotation-header-button', 'Undo').click();
                cy.get(`#cvat_canvas_shape_${objectIds.carShape2}`).should('have.attr', 'x', movableX);
            });
        });

        clearSelection();
        cy.get(sidebarItem(objectIds.carShape1)).within(() => {
            cy.get('.cvat-object-item-button-lock-enabled').click();
        });
    });

    it('Locks, unlocks, pins, and unpins every selected object', () => {
        selectFromSidebar([objectIds.carShape1, objectIds.carShape2]);
        openSelectionMenu();
        cy.get('.cvat-canvas-selected-objects-menu-content button[aria-label="Lock selection"]').click();
        [objectIds.carShape1, objectIds.carShape2].forEach((clientId) => {
            cy.get(sidebarItem(clientId)).find('.cvat-object-item-button-lock-enabled').should('exist');
        });
        cy.get('.cvat-canvas-selected-objects-menu-content').should('be.visible');

        cy.get('.cvat-canvas-selected-objects-menu-content button[aria-label="Unlock selection"]').click();
        cy.get('.cvat-canvas-selected-objects-menu-content').should('be.visible');
        cy.get('.cvat-canvas-selected-objects-menu-content button[aria-label="Pin selection"]').click();
        [objectIds.carShape1, objectIds.carShape2].forEach((clientId) => {
            cy.get(sidebarItem(clientId)).find('.cvat-object-item-button-pinned-enabled').should('exist');
        });
        cy.get('.cvat-canvas-selected-objects-menu-content').should('be.visible');

        cy.get('.cvat-canvas-selected-objects-menu-content button[aria-label="Unpin selection"]').click();
        cy.get('.cvat-canvas-selected-objects-menu-content').should('be.visible');
    });

    it('Occludes and hides the selection with quick actions, shortcuts, and batch history', () => {
        const selectedIds = [objectIds.carShape1, objectIds.carShape2];
        selectFromSidebar(selectedIds);
        openSelectionMenu();
        cy.get('.cvat-canvas-selected-objects-menu-content button[aria-label="Occlude selection"]').click();
        selectedIds.forEach((clientId) => {
            cy.get(sidebarItem(clientId)).find('.cvat-object-item-button-occluded-enabled').should('exist');
        });
        assertSelection(selectedIds);

        cy.contains('.cvat-annotation-header-button', 'Undo').click();
        selectedIds.forEach((clientId) => {
            cy.get(sidebarItem(clientId)).find('.cvat-object-item-button-occluded-enabled').should('not.exist');
        });
        assertSelection(selectedIds);

        cy.get('body').type('q');
        selectedIds.forEach((clientId) => {
            cy.get(sidebarItem(clientId)).find('.cvat-object-item-button-occluded-enabled').should('exist');
        });
        cy.contains('.cvat-annotation-header-button', 'Undo').click();

        openSelectionMenu();
        cy.get('.cvat-canvas-selected-objects-menu-content button[aria-label="Hide selection"]').click();
        selectedIds.forEach((clientId) => {
            cy.get(sidebarItem(clientId)).find('.cvat-object-item-button-hidden-enabled').should('exist');
        });
        assertSelection([]);

        cy.contains('.cvat-annotation-header-button', 'Undo').click();
        selectedIds.forEach((clientId) => {
            cy.get(sidebarItem(clientId)).find('.cvat-object-item-button-hidden-enabled').should('not.exist');
        });
        assertSelection(selectedIds);

        cy.contains('.cvat-annotation-header-button', 'Redo').click();
        selectedIds.forEach((clientId) => {
            cy.get(sidebarItem(clientId)).find('.cvat-object-item-button-hidden-enabled').should('exist');
        });
        assertSelection([]);

        cy.contains('.cvat-annotation-header-button', 'Undo').click();
        assertSelection(selectedIds);
        cy.get('body').type('h');
        selectedIds.forEach((clientId) => {
            cy.get(sidebarItem(clientId)).find('.cvat-object-item-button-hidden-enabled').should('exist');
        });
        assertSelection([]);
        cy.contains('.cvat-annotation-header-button', 'Undo').click();
        assertSelection(selectedIds);
    });

    it('Keeps selection actions open while hiding and showing selected objects', () => {
        const selectedIds = [objectIds.carShape1, objectIds.carShape2];
        selectFromSidebar(selectedIds);
        openSelectionMenu();
        cy.get('.cvat-canvas-selected-objects-menu-content button[aria-label="Hide selection"]').click();

        assertSelection([]);
        cy.get('.cvat-canvas-selected-objects-menu-content').should('be.visible');
        cy.get('.cvat-canvas-selected-objects-menu-content button[aria-label="Show selection"]').click();
        selectedIds.forEach((clientId) => {
            cy.get(sidebarItem(clientId)).find('.cvat-object-item-button-hidden-enabled').should('not.exist');
        });
        cy.get('.cvat-canvas-selected-objects-menu-content').should('be.visible');

        cy.get('body').type('{esc}', { force: true });
        cy.get('.cvat-canvas-selected-objects-menu-content').should('not.exist');
    });

    it('Disables incompatible actions and normalizes a mixed lock state', () => {
        cy.get(sidebarItem(objectIds.carShape1)).within(() => {
            cy.get('.cvat-object-item-button-lock').click();
        });
        selectFromSidebar([objectIds.carShape1, objectIds.carShape2]);
        openSelectionMenu();

        cy.get('.cvat-canvas-selected-objects-label-selector .ant-select-disabled').should('exist');
        cy.get('.cvat-canvas-selected-objects-menu-content button[aria-label="Pin selection"]')
            .should('be.disabled');
        cy.get('.cvat-canvas-selected-objects-menu-content button[aria-label="Occlude selection"]')
            .should('be.disabled');
        cy.get('.cvat-canvas-selected-objects-menu-content button[aria-label="Hide selection"]')
            .should('be.disabled');
        cy.get('.cvat-canvas-selected-objects-menu-content .ant-collapse-header-text .ant-typography')
            .should('have.text', 'DETAILS');
        cy.get('.cvat-canvas-selected-objects-menu-content .ant-collapse-header').click();
        cy.get('.cvat-canvas-selected-objects-menu-content .cvat-object-item-select-attribute')
            .should('have.class', 'ant-select-disabled');

        cy.get('.cvat-canvas-selected-objects-menu-content button[aria-label="Lock selection"]').click();
        [objectIds.carShape1, objectIds.carShape2].forEach((clientId) => {
            cy.get(sidebarItem(clientId)).find('.cvat-object-item-button-lock-enabled').should('exist');
        });
        cy.get('.cvat_canvas_selected_objects_box')
            .should('have.class', 'cvat_canvas_selected_objects_box_not_draggable');
        assertSelectionDragDoesNotPan('.cvat_canvas_selected_objects_box', { force: true });

        openSelectionMenu();
        cy.get('.cvat-canvas-selected-objects-menu-content button[aria-label="Unlock selection"]').click();
        [objectIds.carShape1, objectIds.carShape2].forEach((clientId) => {
            cy.get(sidebarItem(clientId)).find('.cvat-object-item-button-lock-enabled').should('not.exist');
        });
    });

    it('Does not pan the canvas when a modified selection-header drag is rejected', () => {
        selectFromSidebar([objectIds.carShape1, objectIds.carShape2]);
        assertSelectionDragDoesNotPan('.cvat_canvas_selected_objects_label_title', platformModifier);
        assertSelection([objectIds.carShape1, objectIds.carShape2]);
    });

    it('Keeps selection actions open after a Shift-drag selection', () => {
        cy.get(`#cvat_canvas_shape_${objectIds.carShape2}`).then(($shape) => {
            const box = $shape[0].getBoundingClientRect();
            shiftDrawSelectionBox({
                x: box.left - 5,
                y: box.top - 5,
            }, {
                x: box.right + 5,
                y: box.bottom + 5,
            });
        });

        assertSelection([objectIds.carShape2]);
        cy.get('.cvat-select-control').should('have.class', 'cvat-active-canvas-control');
        cy.get('.cvat_canvas_selected_objects_box').rightclick({ force: true });
        cy.get('.cvat-canvas-selected-objects-menu-content').should('be.visible');
        assertSelection([objectIds.carShape2]);

        cy.get('#cvat_canvas_content').click(5, 5, { force: true });
        cy.get('.cvat-canvas-selected-objects-menu-content').should('not.exist');
    });

    it('Opens selection actions by right-clicking the selection bbox', () => {
        selectFromSidebar([objectIds.carShape1, objectIds.carShape2]);
        let contextPosition = null;
        let reopenPosition = null;
        let stableMenuPosition = null;
        cy.get('.cvat_canvas_selected_objects_box').then(($box) => {
            const box = $box[0].getBoundingClientRect();
            contextPosition = {
                x: box.left + box.width / 2,
                y: box.top + box.height / 2,
            };
            reopenPosition = {
                x: box.right - 10,
                y: box.bottom - 10,
            };
            cy.wrap($box).rightclick({ force: true });
        });
        cy.get('.cvat-canvas-selected-objects-menu-content').should('exist').and('be.visible');
        cy.get('.cvat-canvas-selected-objects-count').should('have.text', '2 OBJECTS');
        cy.get('.cvat-canvas-selected-objects-type-text').should('have.text', 'RECTANGLE SHAPES');
        cy.get('.cvat-canvas-selected-objects-menu-content button[aria-label="Delete selection"]')
            .should('be.visible');
        cy.get('.cvat-canvas-selection-context-menu').should(($menu) => {
            expect($menu[0].scrollWidth).to.be.at.most($menu[0].clientWidth);
        });
        cy.get('.cvat-canvas-selected-objects-menu-content:visible').then(($menu) => {
            const initialBox = $menu[0].getBoundingClientRect();
            expect(initialBox.left).to.be.closeTo(contextPosition.x, 8);
            expect(initialBox.top).to.be.closeTo(contextPosition.y, 8);
        });
        cy.then(() => {
            cy.get('.cvat_canvas_selected_objects_box').trigger('contextmenu', {
                button: 2,
                clientX: reopenPosition.x,
                clientY: reopenPosition.y,
                force: true,
            });
        });
        cy.get('.cvat-canvas-selected-objects-menu-content:visible').should(($reopenedMenu) => {
            const reopenedBox = $reopenedMenu[0].getBoundingClientRect();
            expect(reopenedBox.left).to.be.closeTo(reopenPosition.x, 8);
            expect(reopenedBox.top).to.be.closeTo(reopenPosition.y, 8);
            stableMenuPosition = { left: reopenedBox.left, top: reopenedBox.top };
        });
        cy.get('.cvat-canvas-container').trigger('wheel', { deltaY: -5, force: true });
        cy.get('.cvat-canvas-selected-objects-menu-content:visible').should(($zoomedMenu) => {
            const zoomedBox = $zoomedMenu[0].getBoundingClientRect();
            const viewport = $zoomedMenu[0].ownerDocument.defaultView;
            expect(zoomedBox.left).to.be.closeTo(stableMenuPosition.left, 0.1);
            expect(zoomedBox.top).to.be.closeTo(stableMenuPosition.top, 0.1);
            expect(zoomedBox.right).to.be.at.most(viewport.innerWidth);
            expect(zoomedBox.bottom).to.be.at.most(viewport.innerHeight);
        });
        assertSelection([objectIds.carShape1, objectIds.carShape2]);
        cy.get('.cvat-fit-control').click({ force: true });

        cy.window().then((window) => {
            const edgePosition = {
                x: window.innerWidth - 4,
                y: window.innerHeight - 4,
            };
            cy.get('.cvat_canvas_selected_objects_box').trigger('contextmenu', {
                button: 2,
                clientX: edgePosition.x,
                clientY: edgePosition.y,
                force: true,
            });
            cy.get('.cvat-canvas-selected-objects-menu-content:visible').should(($menu) => {
                const menuBox = $menu[0].getBoundingClientRect();
                expect(menuBox.left).to.be.lessThan(edgePosition.x);
                expect(menuBox.top).to.be.lessThan(edgePosition.y);
                expect(menuBox.right).to.be.at.most(window.innerWidth);
                expect(menuBox.bottom).to.be.at.most(window.innerHeight);
            });
        });
    });

    it('Does not reopen selection actions after clearing and starting a new selection', () => {
        selectFromSidebar([objectIds.carShape1, objectIds.carShape2]);
        cy.get('.cvat_canvas_selected_objects_box').rightclick({ force: true });
        cy.get('.cvat-canvas-selected-objects-menu-content').should('be.visible');

        clearSelection();
        cy.get('.cvat-canvas-selected-objects-menu-content').should('not.exist');

        cy.get(`#cvat_canvas_shape_${objectIds.carShape1}`).click({ ...platformModifier, force: true });
        assertSelection([objectIds.carShape1]);
        cy.get('.cvat-canvas-selected-objects-menu-content').should('not.exist');
    });

    it('Closes an object menu before opening selection actions', () => {
        cy.get(sidebarItem(objectIds.carShape1)).within(() => {
            cy.get('[aria-label="more"]').click();
        });
        cy.get('.cvat-object-item-menu:visible').should('have.length', 1);

        cy.get(`#cvat_canvas_shape_${objectIds.carShape2}`).click({ ...platformModifier, force: true });
        assertSelection([objectIds.carShape2]);
        openSelectionMenu();

        cy.get('.cvat-object-item-menu:visible').should('have.length', 1);
        cy.get('.cvat-canvas-selected-objects-menu-content button[aria-label="Delete selection"]')
            .should('be.visible');
    });

    it('Runs layer and annotation actions for the complete selection', () => {
        selectFromSidebar([objectIds.carShape1, objectIds.carShape2]);
        openSelectionOverflowMenu();
        cy.contains('.cvat-canvas-selected-objects-overflow-menu button', 'Move to layer ...').click();
        cy.get('.cvat-object-item-menu-to-layer-popover').should('be.visible');
        cy.get('.cvat-object-item-menu-to-layer-close-button').click();

        cy.get(`#cvat_canvas_shape_${objectIds.carShape1}`).invoke('attr', 'data-z-order').then((initialZOrder) => {
            openSelectionOverflowMenu();
            cy.contains('.cvat-canvas-selected-objects-overflow-menu button', 'To one layer forward').click();
            [objectIds.carShape1, objectIds.carShape2].forEach((clientId) => {
                cy.get(`#cvat_canvas_shape_${clientId}`)
                    .should('not.have.attr', 'data-z-order', initialZOrder);
            });
            cy.contains('.cvat-annotation-header-button', 'Undo').click();
        });

        openSelectionOverflowMenu();
        cy.contains('.cvat-canvas-selected-objects-overflow-menu button', 'Run annotation action').click();
        cy.get('.cvat-action-runner-list').should('exist').and('be.visible');
        cy.closeAnnotationsActionsModal();
    });

    it('Applies layer actions only to editable selection members', () => {
        cy.get(sidebarItem(objectIds.carShape1)).within(() => {
            cy.get('.cvat-object-item-button-lock').click();
        });
        selectFromSidebar([objectIds.carShape1, objectIds.carShape2]);

        cy.get(`#cvat_canvas_shape_${objectIds.carShape1}`).invoke('attr', 'data-z-order').then((lockedZOrder) => {
            cy.get(`#cvat_canvas_shape_${objectIds.carShape2}`).invoke('attr', 'data-z-order').then((editableZOrder) => {
                openSelectionOverflowMenu();
                cy.contains('.cvat-canvas-selected-objects-overflow-menu button',
                    'To one layer forward').click();
                cy.get(`#cvat_canvas_shape_${objectIds.carShape1}`)
                    .should('have.attr', 'data-z-order', lockedZOrder);
                cy.get(`#cvat_canvas_shape_${objectIds.carShape2}`)
                    .should('not.have.attr', 'data-z-order', editableZOrder);
                assertSelection([objectIds.carShape1, objectIds.carShape2]);
                cy.pressWithPlatformModifier('z');
                cy.get(`#cvat_canvas_shape_${objectIds.carShape2}`)
                    .should('have.attr', 'data-z-order', editableZOrder);
            });
        });

        clearSelection();
        cy.get(sidebarItem(objectIds.carShape1)).within(() => {
            cy.get('.cvat-object-item-button-lock-enabled').click();
        });
    });

    it('Changes common labels and attributes and groups the selection', () => {
        selectFromSidebar([objectIds.carShape1, objectIds.carShape2]);
        openSelectionMenu();
        const labelSelector = '.cvat-canvas-selected-objects-label-selector';
        cy.get(`${labelSelector} .ant-select-arrow`).should('have.css', 'display', 'flex')
            .find('.anticon-down').should('exist');
        cy.get(`${labelSelector} .ant-select-selector`).trigger('mouseover');
        cy.get(`${labelSelector} .ant-select-arrow`).should('have.css', 'display', 'flex')
            .find('.anticon-down').should('exist');
        cy.get(`${labelSelector} .ant-select-selector`).click();
        cy.get(`${labelSelector} .ant-select-arrow`).should('have.css', 'display', 'flex')
            .find('.anticon').should('exist');
        cy.contains(
            '.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option',
            labels.person,
        ).click();
        [objectIds.carShape1, objectIds.carShape2].forEach((clientId) => {
            cy.get(sidebarItem(clientId))
                .find('.cvat-objects-sidebar-state-item-label-selector .ant-select-selection-item')
                .should('have.text', labels.person);
        });

        openSelectionMenu();
        cy.get(`${labelSelector} .ant-select-arrow`).should('have.css', 'display', 'flex')
            .find('.anticon-down').should('exist');
        cy.get(`${labelSelector} .ant-select-selector`).trigger('mouseover');
        cy.get(`${labelSelector} .ant-select-arrow`).should('have.css', 'display', 'flex')
            .find('.anticon-down').should('exist');
        cy.get('.cvat-canvas-selected-objects-menu-content .ant-collapse-header').click();
        cy.get('.cvat-object-item-menu .cvat-object-item-select-attribute').click();
        cy.contains(
            '.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option',
            'bad',
        ).click();

        openSelectionOverflowMenu();
        cy.contains('.cvat-canvas-selected-objects-overflow-menu button', 'Group selection').click();
        openSelectionOverflowMenu();
        cy.contains('.cvat-canvas-selected-objects-overflow-menu button', 'Ungroup selection')
            .should('not.be.disabled').click();

        openSelectionMenu();
        cy.get('.cvat-canvas-selected-objects-label-selector .ant-select-selector').click();
        cy.contains(
            '.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option',
            labels.car,
        ).click();
    });

    it('Copies and pastes a selection with platform modifier shortcuts', () => {
        selectFromSidebar([objectIds.carShape1, objectIds.carShape2]);
        cy.pressWithPlatformModifier('c');
        cy.pressWithPlatformModifier('v');
        cy.get('.cvat_canvas_shape_drawing').should('have.length', 2);
        cy.get('.cvat-canvas-container').click(600, 500);
        cy.get('.cvat_canvas_shape').should('have.length', selectableObjectIds.length + 2);

        cy.pressWithPlatformModifier('z');
        cy.get('.cvat_canvas_shape').should('have.length', selectableObjectIds.length);
        assertSelection([]);

        cy.pressWithPlatformModifier('{shift}z');
        cy.get('.cvat_canvas_shape').should('have.length', selectableObjectIds.length + 2);

        cy.pressWithPlatformModifier('z');
        cy.get('.cvat_canvas_shape').should('have.length', selectableObjectIds.length);
        assertSelection([]);
    });

    it('Uses single-object copy for a one-object selection', () => {
        selectFromSidebar([objectIds.carShape1]);
        cy.pressWithPlatformModifier('c');
        cy.pressWithPlatformModifier('v');
        cy.get('.cvat_canvas_shape_drawing').should('have.length', 1);
        cy.get('.cvat-canvas-container').click(600, 500);
        cy.get('.cvat_canvas_shape').should('have.length', selectableObjectIds.length + 1);
        assertSelection([]);
        cy.pressWithPlatformModifier('z');
        cy.get('.cvat_canvas_shape').should('have.length', selectableObjectIds.length);

        selectFromSidebar([objectIds.carShape1]);
        openSelectionOverflowMenu();
        cy.contains('.cvat-canvas-selected-objects-overflow-menu button', 'Make a copy').click();
        cy.get('.cvat_canvas_shape_drawing').should('have.length', 1);
        cy.get('.cvat-canvas-container').click(600, 500);
        cy.get('.cvat_canvas_shape').should('have.length', selectableObjectIds.length + 1);
        assertSelection([]);
        cy.pressWithPlatformModifier('z');
        cy.get('.cvat_canvas_shape').should('have.length', selectableObjectIds.length);
    });

    it('Uses normal client-state defaults for pasted selection objects', () => {
        cy.get(sidebarItem(objectIds.carShape1)).within(() => {
            cy.get('.cvat-object-item-button-lock').click();
        });
        cy.get(sidebarItem(objectIds.carShape2)).within(() => {
            cy.get('.cvat-object-item-button-pinned').click();
        });
        selectFromSidebar([objectIds.carShape1, objectIds.carShape2]);

        cy.pressWithPlatformModifier('c');
        cy.pressWithPlatformModifier('v');
        cy.get('.cvat_canvas_shape_drawing').should('have.length', 2);
        cy.get('.cvat-canvas-container').click(600, 500);

        cy.get('.cvat-objects-sidebar-state-item-multi-selected').should('have.length', 2).each(($item) => {
            cy.wrap($item).find('.cvat-object-item-button-lock-enabled').should('not.exist');
            cy.wrap($item).find('.cvat-object-item-button-pinned-enabled').should('not.exist');
        });

        cy.pressWithPlatformModifier('z');
        assertSelection([]);
        cy.get(sidebarItem(objectIds.carShape1)).within(() => {
            cy.get('.cvat-object-item-button-lock-enabled').click();
        });
        cy.get(sidebarItem(objectIds.carShape2)).within(() => {
            cy.get('.cvat-object-item-button-pinned-enabled').click();
        });
    });

    it('Places a copied selection partially outside the frame', () => {
        selectFromSidebar([objectIds.carShape1, objectIds.carShape2]);
        openSelectionOverflowMenu();
        cy.contains('.cvat-canvas-selected-objects-overflow-menu button', 'Make a copy').click();
        cy.get('.cvat_canvas_shape_drawing').should('have.length', 2);

        cy.get('#cvat_canvas_background').then(($background) => {
            const x = $background[0].getBoundingClientRect().width - 100;
            const y = $background[0].getBoundingClientRect().height / 2;
            cy.wrap($background).realMouseMove(x, y);
            cy.wrap($background).realClick({ x, y });
        });
        cy.get('.cvat_canvas_shape').should('have.length', selectableObjectIds.length + 2);
        cy.get('#cvat_canvas_background').then(($background) => {
            const frame = $background[0].getBoundingClientRect();
            cy.get('.cvat_canvas_shape_selected_object').should(($shapes) => {
                expect($shapes).to.have.length(2);
                [...$shapes].forEach((shape) => {
                    expect(shape.getBoundingClientRect().right).to.be.at.most(frame.right + 1);
                });
                const right = Math.max(...[...$shapes].map((shape) => shape.getBoundingClientRect().right));
                expect(right).to.be.closeTo(frame.right, 1);
            });
        });

        cy.pressWithPlatformModifier('z');
        cy.get('.cvat_canvas_shape').should('have.length', selectableObjectIds.length);
        assertSelection([]);
    });

    it('Copies and deletes a selection as batch history actions', () => {
        selectFromSidebar([objectIds.carShape1, objectIds.carShape2]);
        openSelectionOverflowMenu();
        cy.contains('.cvat-canvas-selected-objects-overflow-menu button', 'Make a copy').click();
        cy.get('.cvat_canvas_shape_drawing').should('have.length', 2);
        cy.get('.cvat-canvas-container').click(600, 500);
        cy.get('.cvat_canvas_shape').should('have.length', selectableObjectIds.length + 2);
        cy.contains('.cvat-annotation-header-button', 'Undo').click();
        cy.get('.cvat_canvas_shape').should('have.length', selectableObjectIds.length);
        assertSelection([]);
        cy.get(`#cvat_canvas_shape_${objectIds.carShape1}`).trigger('mousemove');
        cy.get(`#cvat_canvas_shape_${objectIds.carShape1}`)
            .should('have.class', 'cvat_canvas_shape_activated');

        selectFromSidebar([objectIds.carShape1, objectIds.carShape2]);
        openSelectionMenu();
        cy.get('.cvat-canvas-selected-objects-menu-content button[aria-label="Delete selection"]').click();
        cy.get(`#cvat_canvas_shape_${objectIds.carShape1}`).should('not.exist');
        cy.get(`#cvat_canvas_shape_${objectIds.carShape2}`).should('not.exist');

        cy.contains('.cvat-annotation-header-button', 'Undo').click();
        cy.get(`#cvat_canvas_shape_${objectIds.carShape1}`).should('exist');
        cy.get(`#cvat_canvas_shape_${objectIds.carShape2}`).should('exist');
        assertSelection([objectIds.carShape1, objectIds.carShape2]);
    });

    it('Can redo a selection deletion after visiting another frame', () => {
        const selectedIds = [objectIds.carShape1, objectIds.carShape2];
        selectFromSidebar(selectedIds);
        openSelectionMenu();
        cy.get('.cvat-canvas-selected-objects-menu-content button[aria-label="Delete selection"]').click();
        selectedIds.forEach((clientId) => {
            cy.get(`#cvat_canvas_shape_${clientId}`).should('not.exist');
        });

        cy.contains('.cvat-annotation-header-button', 'Undo').click();
        selectedIds.forEach((clientId) => {
            cy.get(`#cvat_canvas_shape_${clientId}`).should('exist');
        });
        assertSelection(selectedIds);

        cy.goCheckFrameNumber(1);
        assertSelection([]);
        cy.goCheckFrameNumber(0);
        assertSelection([]);

        cy.contains('.cvat-annotation-header-button', 'Redo').click();
        selectedIds.forEach((clientId) => {
            cy.get(`#cvat_canvas_shape_${clientId}`).should('not.exist');
        });

        cy.contains('.cvat-annotation-header-button', 'Undo').click();
        selectedIds.forEach((clientId) => {
            cy.get(`#cvat_canvas_shape_${clientId}`).should('exist');
        });
    });

    it('Skips locked objects when deleting a selection', () => {
        cy.get(sidebarItem(objectIds.carShape1)).within(() => {
            cy.get('.cvat-object-item-button-lock').click();
        });
        selectFromSidebar([objectIds.carShape1, objectIds.carShape2]);
        openSelectionMenu();
        cy.get('.cvat-canvas-selected-objects-menu-content button[aria-label="Delete selection"]').click();

        cy.get(`#cvat_canvas_shape_${objectIds.carShape1}`).should('exist');
        cy.get(`#cvat_canvas_shape_${objectIds.carShape2}`).should('not.exist');
        assertSelection([objectIds.carShape1]);

        cy.contains('.cvat-annotation-header-button', 'Undo').click();
        cy.get(`#cvat_canvas_shape_${objectIds.carShape2}`).should('exist');
        assertSelection([objectIds.carShape1, objectIds.carShape2]);

        cy.contains('.cvat-annotation-header-button', 'Redo').click();
        cy.get(`#cvat_canvas_shape_${objectIds.carShape1}`).should('exist');
        cy.get(`#cvat_canvas_shape_${objectIds.carShape2}`).should('not.exist');
        assertSelection([objectIds.carShape1]);

        cy.contains('.cvat-annotation-header-button', 'Undo').click();
        clearSelection();
        cy.get(sidebarItem(objectIds.carShape1)).within(() => {
            cy.get('.cvat-object-item-button-lock-enabled').click();
        });
    });

    it('Removes an individually deleted object from the selection', () => {
        selectFromSidebar([objectIds.carShape1, objectIds.carShape2, objectIds.personTrack1]);
        cy.interactAnnotationObjectMenu(sidebarItem(objectIds.carShape2), 'Remove');
        cy.get(`#cvat_canvas_shape_${objectIds.carShape2}`).should('not.exist');
        assertSelection([objectIds.carShape1, objectIds.personTrack1]);

        cy.pressWithPlatformModifier('z');
        cy.get(`#cvat_canvas_shape_${objectIds.carShape2}`).should('exist');
        assertSelection([objectIds.carShape1, objectIds.carShape2, objectIds.personTrack1]);

        cy.contains('.cvat-annotation-header-button', 'Redo').click();
        cy.get(`#cvat_canvas_shape_${objectIds.carShape2}`).should('not.exist');
        assertSelection([objectIds.carShape1, objectIds.personTrack1]);
    });
});

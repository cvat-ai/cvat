// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { defaultTaskSpec } from '../../support/default-specs';

context('Quality requirements UI', {
    // Keep form controls clear of the sticky Save/Cancel buttons during actionability scrolling.
    scrollBehavior: 'center',
}, () => {
    const taskName = 'Quality requirements UI task';
    const labelName = 'quality_requirement_label';
    const serverFiles = ['images/image_1.jpg', 'images/image_2.jpg', 'images/image_3.jpg'];
    const childRequirementName = 'E2E rectangle accuracy';
    const grandchildRequirementName = 'E2E precise rectangle accuracy';
    const copiedRequirementName = `Copy of ${childRequirementName}`;
    const defaultRectangleRequirementName = 'Base rectangle';
    const thresholdEditor = '.cvat-threshold-policy-editor';
    const thresholdRows = `${thresholdEditor} .cvat-threshold-policy-row`;
    const linearIouPolicy = {
        type: 'iou',
        mode: 'linear',
        input: 'gt.shape_area',
        extrapolation: 'clamp',
        points: [{ x: 100, y: 0.4 }, { x: 1000, y: 0.9 }],
    };
    const validationParams = {
        frameCount: 2,
        mode: 'gt',
        frameSelectionMethod: 'random_uniform',
    };
    let taskId = null;

    function openSettingsTab() {
        cy.visit(`/tasks/${taskId}/quality-control#settings`);
        cy.get('.cvat-quality-control-settings-tab').should('be.visible');
        // Visiting the current #settings URL can preserve an editor left open by a previous test.
        cy.get('body').then(($body) => {
            if ($body.find('.cvat-quality-requirement-form').length) {
                cy.get('.cvat-quality-requirement-form-actions').contains('button', 'Cancel').click();
            }
        });
        cy.get('.cvat-quality-requirements-configuration-table').should('be.visible');
    }

    function requirementRow(name) {
        return cy.contains('.cvat-quality-requirements-configuration-table tr', name);
    }

    // The constructor persists expanded rows in localStorage, so a row may already be
    // expanded on a later visit. Expand only when it is currently collapsed.
    function ensureRowExpanded(name) {
        requirementRow(name).then(($row) => {
            const expandIcon = $row.find('.anticon-caret-down');
            const iconIsCollapsed = expandIcon.find('svg').attr('style')?.includes('rotate(-90deg)');

            if (iconIsCollapsed) {
                cy.wrap(expandIcon).click();
            }
        });
    }

    function clickRowAction(name, ariaLabel) {
        requirementRow(name).within(() => {
            cy.get(`[aria-label="${ariaLabel}"]`).closest('button').click();
        });
    }

    function setFormName(name) {
        cy.get('.cvat-quality-requirement-form #name').clear();
        cy.get('.cvat-quality-requirement-form #name').type(name);
    }

    function setFormThreshold(value) {
        cy.get('.cvat-quality-requirement-form #requiredScore').clear();
        cy.get('.cvat-quality-requirement-form #requiredScore').type(`${value}`);
        cy.get('.cvat-quality-requirement-form #requiredScore').blur();
    }

    function submitForm() {
        cy.get('.cvat-quality-requirement-form-actions').contains('button', 'Save').click();
    }

    function selectThresholdMode(mode) {
        cy.get(`${thresholdEditor} .ant-select-selector`).click();
        cy.get('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
            .contains('.ant-select-item-option-content', mode).click();
    }

    function expectLinearThreshold(points = linearIouPolicy.points) {
        cy.get(`${thresholdEditor} .ant-select-selection-item`).should('have.text', 'Linear interpolation');
        cy.get(thresholdRows).should('have.length', points.length);
        points.forEach((point, index) => {
            cy.get(thresholdRows).eq(index).find('input[id*="area"]').should('have.value', `${point.x}`);
            cy.get(thresholdRows).eq(index).find('input[id*="iou"]').should('have.value', `${point.y * 100}`);
        });
    }

    function expectPolicyRequest(alias, policy, status = 200) {
        cy.wait(alias).then(({ request, response }) => {
            expect(response.statusCode).to.equal(status);
            expect(request.body.iou_threshold).to.deep.equal(policy?.mode === 'constant' ? policy.value : policy);
            expect(request.body).not.to.have.property('similarity_threshold_policy');
        });
    }

    function setRectangleThresholdPolicy(policy) {
        cy.window().then((win) => win.cvat.server.request(`/api/quality/settings?task_id=${taskId}`)
            .then(({ data }) => {
                const settings = data.results.find((item) => item.task_id === taskId);
                const parent = settings.requirements.find((item) => item.is_base && item.annotation_type === 'rectangle');
                return win.cvat.server.request(`/api/quality/settings/requirements/${parent.id}`, {
                    method: 'PATCH', data: { iou_threshold: policy },
                });
            }));
        cy.reload();
        cy.get('.cvat-quality-requirements-configuration-table').should('be.visible');
    }

    function saveSettings() {
        cy.get('.cvat-quality-settings-save-btn').contains('button', 'Save').click();
    }

    function expectNotification(message) {
        cy.contains('.ant-notification-notice-message', message).should('be.visible');
        cy.closeNotification('.ant-notification-notice');
    }

    before(() => {
        cy.visit('/auth/login');
        cy.login();

        const { taskSpec, dataSpec, extras } = defaultTaskSpec({
            taskName,
            labelName,
            serverFiles,
            validationParams,
        });

        cy.headlessCreateTask(taskSpec, dataSpec, extras).then((response) => {
            taskId = response.taskId;
        }).then(() => {
            // Start every run with a clean expansion state so persistence assertions are deterministic.
            cy.window().then((win) => {
                Object.keys(win.localStorage)
                    .filter((key) => key.startsWith('qualityRequirementsConstructorExpandedRows'))
                    .forEach((key) => win.localStorage.removeItem(key));
            });
        });
    });

    after(() => {
        if (taskId !== null) {
            cy.headlessDeleteTask(taskId);
        }
    });

    it('Retains frame table preferences through validation updates and quality tab switches', () => {
        cy.visit(`/tasks/${taskId}/quality-control#management`);
        const table = '.cvat-table-wrapper:has(.cvat-frame-allocation-table)';
        cy.get(`${table} .ant-table-row`).should('have.length', 2);
        cy.get(`${table} .cvat-table-search-bar input`).type('image{enter}');
        cy.contains(`${table} th`, 'Frame').click();
        cy.contains(`${table} th`, 'Frame').click();
        cy.get(`${table} .anticon-more`).click();
        cy.contains('.cvat-table-columns-settings-menu:visible .ant-checkbox-wrapper', 'Name')
            .find('input').uncheck();
        cy.get(`${table} .anticon-more`).click();

        function checkPreferences() {
            cy.get(`${table} .cvat-table-search-bar input`).should('have.value', 'image');
            cy.contains(`${table} th`, 'Frame').should('have.attr', 'aria-sort', 'descending');
            cy.get(`${table} thead`).should('not.contain.text', 'Name');
        }

        cy.get(`${table} .ant-table-row`).first().invoke('attr', 'data-row-key').then((frame) => {
            cy.get(`${table} tr[data-row-key="${frame}"] .cvat-allocation-frame-delete`).click();
            cy.get(`${table} tr[data-row-key="${frame}"] .cvat-allocation-frame-restore`).should('be.visible');
            checkPreferences();
            cy.get(`${table} tr[data-row-key="${frame}"] .cvat-allocation-frame-restore`).click();
            cy.get(`${table} tr[data-row-key="${frame}"] .cvat-allocation-frame-delete`).should('be.visible');
            checkPreferences();
        });

        cy.get(`${table} .ant-table-filter-trigger`).click();
        cy.contains('.ant-table-filter-dropdown:visible .ant-dropdown-menu-item', 'Active')
            .find('input').check();
        cy.contains('.ant-table-filter-dropdown:visible button', 'OK').click();
        cy.contains('.cvat-quality-control-page-tabs [role="tab"]', 'Settings').click();
        cy.get('.cvat-quality-control-settings-tab').should('be.visible');
        cy.contains('.cvat-quality-control-page-tabs [role="tab"]', 'Management').click();
        checkPreferences();
        cy.get(`${table} .ant-table-filter-trigger`).should('have.class', 'active');
        cy.get(`${table} .ant-table-row`).should('have.length', 2);

        cy.reload();
        cy.get(`${table} .cvat-table-search-bar input`).should('have.value', '');
        cy.get(`${table} thead`).should('contain.text', 'Name');
        cy.get(`${table} .ant-table-filter-trigger`).should('not.have.class', 'active');
    });

    it('Default requirement row is read-only and disabled by default', () => {
        openSettingsTab();

        requirementRow(defaultRectangleRequirementName).within(() => {
            cy.contains('Rectangle').should('exist');
            cy.contains('Accuracy').should('exist');
            // Default requirements may not be copied or deleted.
            cy.get('[aria-label="copy"]').should('not.exist');
            cy.get('[aria-label="delete"]').should('not.exist');
            // But may be created from, edited and toggled.
            cy.get('[aria-label="plus"]').should('exist');
            cy.get('[aria-label="edit"]').should('exist');
            cy.get('.ant-switch').should('not.have.class', 'ant-switch-checked');
        });
        requirementRow(defaultRectangleRequirementName).should('have.class', 'cvat-quality-requirements-disabled-row');
    });

    it('Saves requirement enabled changes from the main settings form', () => {
        openSettingsTab();

        requirementRow(defaultRectangleRequirementName).find('.ant-switch').click();
        requirementRow(defaultRectangleRequirementName).find('.ant-switch').should('have.class', 'ant-switch-checked');
        requirementRow(defaultRectangleRequirementName).should('not.have.class', 'cvat-quality-requirements-disabled-row');

        // The constructor switch is a draft until the main settings form is saved.
        cy.reload();
        cy.get('.cvat-quality-requirements-configuration-table').should('be.visible');
        requirementRow(defaultRectangleRequirementName).find('.ant-switch').should('not.have.class', 'ant-switch-checked');
        requirementRow(defaultRectangleRequirementName).should('have.class', 'cvat-quality-requirements-disabled-row');

        requirementRow(defaultRectangleRequirementName).find('.ant-switch').click();
        saveSettings();
        expectNotification('Settings have been updated');

        cy.reload();
        cy.get('.cvat-quality-requirements-configuration-table').should('be.visible');
        requirementRow(defaultRectangleRequirementName).find('.ant-switch').should('have.class', 'ant-switch-checked');
        requirementRow(defaultRectangleRequirementName).should('not.have.class', 'cvat-quality-requirements-disabled-row');
    });

    it('Creates a child requirement through the form', () => {
        openSettingsTab();

        clickRowAction(defaultRectangleRequirementName, 'plus');

        cy.get('.cvat-quality-requirement-form').should('be.visible');
        cy.contains('Create requirement').should('exist');
        // Parent and target are fixed when creating from an existing requirement.
        cy.contains('.ant-form-item', 'Parent requirement').find('.ant-select-disabled').should('exist');
        cy.contains('.ant-form-item', 'Target').find('.ant-select-disabled').should('exist');

        setFormName(childRequirementName);
        setFormThreshold(80);
        submitForm();

        expectNotification('Requirement has been created');

        // Back in the list, the new child appears under the default requirement with inherited type/metric.
        cy.get('.cvat-quality-requirements-configuration-table').should('be.visible');
        ensureRowExpanded(defaultRectangleRequirementName);
        requirementRow(childRequirementName).within(() => {
            cy.contains('Rectangle').should('exist');
            cy.contains('Accuracy').should('exist');
            cy.contains('80%').should('exist');
            // Non-default requirements expose the full set of actions.
            cy.get('[aria-label="copy"]').should('exist');
            cy.get('[aria-label="delete"]').should('exist');
            cy.get('[aria-label="edit"]').should('exist');
        });
    });

    it('Creates a grandchild requirement that inherits parent values', () => {
        openSettingsTab();

        ensureRowExpanded(defaultRectangleRequirementName);
        clickRowAction(childRequirementName, 'plus');

        cy.get('.cvat-quality-requirement-form').should('be.visible');
        setFormName(grandchildRequirementName);
        // Leave the threshold untouched so it is inherited from the parent.
        submitForm();

        expectNotification('Requirement has been created');

        cy.get('.cvat-quality-requirements-configuration-table').should('be.visible');
        ensureRowExpanded(defaultRectangleRequirementName);
        ensureRowExpanded(childRequirementName);
        requirementRow(grandchildRequirementName).within(() => {
            cy.contains('Rectangle').should('exist');
            cy.contains('Accuracy').should('exist');
            cy.contains('80%').should('exist');
        });
    });

    it('Validates the requirement form', () => {
        openSettingsTab();

        clickRowAction(defaultRectangleRequirementName, 'plus');
        cy.get('.cvat-quality-requirement-form').should('be.visible');

        // Empty name is rejected.
        cy.get('.cvat-quality-requirement-form #name').clear();
        submitForm();
        cy.contains('.ant-form-item-explain-error', 'This field is required').should('exist');

        // Duplicate names are rejected.
        setFormName(childRequirementName);
        submitForm();
        cy.contains('.ant-form-item-explain-error', 'Requirement name must be unique').should('exist');

        // A valid unique name clears the name error.
        setFormName('E2E temporary requirement');
        cy.contains('.ant-form-item-explain-error', 'Requirement name must be unique').should('not.exist');

        // Empty threshold is rejected.
        cy.get('.cvat-quality-requirement-form #requiredScore').clear();
        cy.get('.cvat-quality-requirement-form #requiredScore').blur();
        submitForm();
        cy.contains('.ant-form-item-explain-error', 'This field is required').should('exist');

        // Cancelling discards the form and returns to the list without creating anything.
        cy.get('.cvat-quality-requirement-form-actions').contains('button', 'Cancel').click();
        cy.get('.cvat-quality-requirements-configuration-table').should('be.visible');
        requirementRow('E2E temporary requirement').should('not.exist');
    });

    it('Edits a requirement threshold and propagates it to inheritors', () => {
        openSettingsTab();

        ensureRowExpanded(defaultRectangleRequirementName);
        clickRowAction(childRequirementName, 'edit');

        cy.get('.cvat-quality-requirement-form').should('be.visible');
        cy.contains('Edit requirement').should('exist');
        setFormThreshold(90);
        submitForm();

        expectNotification('Requirement has been updated');

        cy.get('.cvat-quality-requirements-configuration-table').should('be.visible');
        ensureRowExpanded(defaultRectangleRequirementName);
        requirementRow(childRequirementName).contains('90%').should('exist');

        // The grandchild inherits the new threshold.
        ensureRowExpanded(childRequirementName);
        requirementRow(grandchildRequirementName).contains('90%').should('exist');
    });

    it('Copies a requirement from an existing one', () => {
        openSettingsTab();

        ensureRowExpanded(defaultRectangleRequirementName);
        clickRowAction(childRequirementName, 'copy');

        cy.get('.cvat-quality-requirement-form').should('be.visible');
        cy.contains('Create requirement').should('exist');
        // The copy form prefills the name with a "Copy of" prefix and the source threshold.
        cy.get('.cvat-quality-requirement-form #name').should('have.value', copiedRequirementName);
        cy.get('.cvat-quality-requirement-form #requiredScore').should('have.value', '90');
        submitForm();

        expectNotification('Requirement has been created');

        cy.get('.cvat-quality-requirements-configuration-table').should('be.visible');
        ensureRowExpanded(defaultRectangleRequirementName);
        requirementRow(copiedRequirementName).within(() => {
            cy.contains('Rectangle').should('exist');
            cy.contains('90%').should('exist');
        });
    });

    it('Deletes a requirement with confirmation', () => {
        openSettingsTab();

        ensureRowExpanded(defaultRectangleRequirementName);
        clickRowAction(copiedRequirementName, 'delete');

        cy.get('.ant-modal-confirm').should('be.visible');
        cy.contains('.ant-modal-confirm-title', `Delete "${copiedRequirementName}" requirement?`).should('exist');
        cy.get('.ant-modal-confirm-btns').contains('button', 'Delete').click();

        cy.get('.cvat-quality-requirements-configuration-table').should('be.visible');
        requirementRow(copiedRequirementName).should('not.exist');
    });

    it('Persists expanded rows across reloads', () => {
        openSettingsTab();

        ensureRowExpanded(defaultRectangleRequirementName);
        ensureRowExpanded(childRequirementName);
        requirementRow(childRequirementName).should('be.visible');
        requirementRow(grandchildRequirementName).should('be.visible');

        cy.reload();
        cy.get('.cvat-quality-requirements-configuration-table').should('be.visible');
        // The previously expanded rows stay expanded, so their descendants are still rendered.
        requirementRow(childRequirementName).should('be.visible');
        requirementRow(grandchildRequirementName).should('be.visible');
    });

    it('Selects Jaccard Index and propagates it to inheritors', () => {
        openSettingsTab();

        clickRowAction(defaultRectangleRequirementName, 'edit');
        cy.get('.cvat-quality-requirement-form').should('be.visible');
        cy.contains('.ant-form-item', 'Target metric').find('.ant-form-item-tooltip').trigger('mouseover');
        cy.get('.ant-tooltip').contains('View metric formulas in the documentation')
            .should('have.attr', 'href')
            .and('include', '/docs/qa-analytics/auto-qa/#quality-target-metrics');
        cy.contains('.ant-form-item', 'Target metric').find('.ant-select-selector').click();
        cy.get('.ant-select-dropdown').within(() => {
            cy.contains('.ant-select-item-group', 'Micro average').should('exist');
            cy.contains('.ant-select-item-group', 'Macro average')
                .should('have.css', 'color', 'rgb(24, 144, 255)');
            cy.contains('.ant-select-item-group', 'Worst label').should('exist');
            cy.contains('.ant-select-item-option-content', /\((micro|macro\/mean|worst label)\)/)
                .should('not.exist');
            cy.contains('.ant-select-item-group', 'Macro average')
                .nextAll('.ant-select-item-option')
                .contains('.ant-select-item-option-content', /^Jaccard Index$/)
                .first()
                .click();
        });
        cy.contains('.ant-form-item', 'Target metric').find('.ant-select-selection-item')
            .should('have.text', 'Jaccard Index (macro/mean)');
        submitForm();

        expectNotification('Requirement has been updated');
        cy.get('.cvat-quality-requirements-configuration-table').should('be.visible');
        requirementRow(defaultRectangleRequirementName).contains('Jaccard Index (macro/mean)').should('exist');
        ensureRowExpanded(defaultRectangleRequirementName);
        requirementRow(childRequirementName).contains('Jaccard Index (macro/mean)').should('exist');
        ensureRowExpanded(childRequirementName);
        requirementRow(grandchildRequirementName).contains('Jaccard Index (macro/mean)').should('exist');
    });

    it('Renames a base requirement without sending empty inherited fields', () => {
        openSettingsTab();

        clickRowAction(defaultRectangleRequirementName, 'edit');
        cy.get('.cvat-quality-requirement-form').should('be.visible');
        setFormName('Base rectangle renamed');
        submitForm();

        expectNotification('Requirement has been updated');
        cy.get('.cvat-quality-requirements-configuration-table').should('be.visible');
        requirementRow('Base rectangle renamed').should('be.visible');
    });

    it('Edits and persists interpolated IoU', () => {
        openSettingsTab();
        clickRowAction('Base rectangle renamed', 'edit');
        const editor = '.cvat-threshold-policy-editor';
        const rows = `${editor} .cvat-threshold-policy-row`;
        const canvas = `${editor} .cvat-threshold-policy-chart canvas`;
        const pointer = (type, x, y, buttons = 0) => {
            cy.get(canvas).then(($canvas) => {
                const { width, height } = $canvas[0].getBoundingClientRect();
                cy.wrap($canvas).trigger(type, width * x, height * y, {
                    eventConstructor: 'PointerEvent',
                    pointerId: 1,
                    button: 0,
                    buttons,
                });
            });
        };
        cy.get(`${editor} input.ant-input-number-input`).should('have.length', 1).and('have.value', '40');
        cy.get(`${editor} .cvat-threshold-policy-chart`).should('not.exist');
        selectThresholdMode('Linear interpolation');
        cy.get(rows).should('have.length', 2);
        cy.get(rows).last().find('input[id*="iou"]').clear();
        cy.get(rows).last().find('input[id*="iou"]').type('90');
        cy.get(rows).last().find('input[id*="iou"]').blur();
        cy.get(rows).last().find('input[id*="area"]').clear();
        cy.get(`${rows}.selected`).find('input[id*="area"]').type('100');
        cy.get(`${rows}.selected`).find('input[id*="area"]').blur();
        submitForm();
        cy.contains('.ant-form-item-explain-error', 'Correct the IoU threshold fields before saving.')
            .scrollIntoView();
        cy.contains('.ant-form-item-explain-error', 'Correct the IoU threshold fields before saving.')
            .should('be.visible');
        cy.get(`${rows}.selected`).find('input[id*="area"]').clear();
        cy.get(`${rows}.selected`).find('input[id*="area"]').type('1000');
        cy.get(`${rows}.selected`).find('input[id*="area"]').blur();
        cy.get(canvas).scrollIntoView();
        cy.get(canvas).should('be.visible');
        pointer('pointermove', 0.5, 0.5);
        cy.get(`${editor} .cvat-threshold-policy-tooltip`).should('contain', 'GT area:')
            .and('contain', 'px²').and('contain', 'IoU threshold:').and('contain', '%');
        cy.get(`${editor} button[aria-label="Add point"]`).click();
        cy.get(rows).should('have.length', 3);
        cy.get(rows).eq(1).find('button').click();
        cy.get(rows).should('have.length', 2);
        if (Cypress.isBrowser({ family: 'chromium' })) {
            // Native pointer events are needed for canvas pointer capture during a drag.
            cy.get(canvas).scrollIntoView();
            cy.get(canvas).realClick({ position: 'center', scrollBehavior: false });
            cy.get(rows).should('have.length', 3);
            cy.get(`${rows}.selected`).then(($row) => {
                const coordinate = (value) => Number(String(value).replace(',', '.'));
                const area = $row.find('input[id*="area"]').val();
                const iou = $row.find('input[id*="iou"]').val();
                let previousArea = coordinate(area);
                cy.get(canvas).then(($canvas) => {
                    const { width, height } = $canvas[0].getBoundingClientRect();
                    cy.wrap($canvas).realMouseDown({ x: width / 2, y: height / 2, scrollBehavior: false });
                    Array.from({ length: 10 }, (_, index) => index + 1).forEach((step) => {
                        cy.wrap($canvas).realMouseMove(
                            width * (0.5 + step * 0.01), height * (0.5 - step * 0.01), { scrollBehavior: false },
                        );
                        cy.get(canvas).should(($current) => {
                            expect($current[0]).to.equal($canvas[0]);
                        });
                        cy.get(`${rows}.selected`).find('input[id*="area"]').should(($input) => {
                            expect(coordinate($input.val())).to.be.greaterThan(previousArea);
                        }).then(($input) => { previousArea = coordinate($input.val()); });
                        cy.get(`${rows}.selected`).then(($currentRow) => {
                            const format = (field) => coordinate($currentRow.find(`input[id*="${field}"]`).val())
                                .toLocaleString(undefined, { maximumFractionDigits: 2 });
                            cy.get(`${editor} .cvat-threshold-policy-tooltip`).should('be.visible')
                                .and('contain', `GT area: ${format('area')} px²`)
                                .and('contain', `IoU threshold: ${format('iou')}%`);
                        });
                    });
                    cy.wrap($canvas).realMouseUp({ x: width * 0.6, y: height * 0.4, scrollBehavior: false });
                });
                cy.contains(`${editor} button`, 'Undo').should('be.enabled').click({ scrollBehavior: 'center' });
                cy.get(rows).eq(1).find('input[id*="area"]').should('have.value', `${area}`);
                cy.get(rows).eq(1).find('input[id*="iou"]').should('have.value', iou);
                cy.get(canvas).scrollIntoView();
                cy.get(canvas).then(($canvas) => {
                    const { width, height } = $canvas[0].getBoundingClientRect();
                    cy.wrap($canvas).realMouseDown({ x: width / 2, y: height / 2, scrollBehavior: false });
                    cy.wrap($canvas).then(() => {
                        const element = $canvas[0];
                        const rect = element.getBoundingClientRect();
                        const event = {
                            bubbles: true,
                            pointerId: 1,
                            button: 0,
                            clientX: rect.left + width * 0.6,
                            clientY: rect.top + height * 0.4,
                        };
                        const { PointerEvent } = element.ownerDocument.defaultView;
                        // Finish before React renders the last move, to catch stale coordinates in Undo.
                        element.dispatchEvent(new PointerEvent('pointermove', { ...event, buttons: 1 }));
                        element.dispatchEvent(new PointerEvent('pointerup', { ...event, buttons: 0 }));
                    });
                    cy.wrap($canvas).realMouseUp({ x: width * 0.6, y: height * 0.4, scrollBehavior: false });
                });
                cy.get(`${rows}.selected`).find('input[id*="area"]').should(($input) => {
                    expect(coordinate($input.val())).to.be.greaterThan(coordinate(area));
                });
                cy.contains(`${editor} button`, 'Undo').should('be.enabled').click({ scrollBehavior: 'center' });
                cy.get(rows).should('have.length', 3);
                cy.get(rows).eq(1).find('input[id*="area"]').should('have.value', `${area}`);
                cy.get(rows).eq(1).find('input[id*="iou"]').should('have.value', iou);
            });
            cy.get(canvas).scrollIntoView();
            cy.get(canvas).realClick({ button: 'right', position: 'center', scrollBehavior: false });
            cy.get(rows).should('have.length', 2);
        }
        cy.get(rows).first().find('button').should('be.disabled');

        cy.intercept('PATCH', '**/api/quality/settings/requirements/*').as('saveIouPolicy');
        submitForm();
        expectPolicyRequest('@saveIouPolicy', linearIouPolicy);
        expectNotification('Requirement has been updated');
        cy.reload();
        cy.get('.cvat-quality-requirements-configuration-table').should('be.visible');
        clickRowAction('Base rectangle renamed', 'edit');
        expectLinearThreshold();
        cy.get('.cvat-quality-requirement-form-actions').contains('button', 'Cancel').click();
    });

    it('Shows cell errors and undoes whole numeric edits with a local action description', () => {
        openSettingsTab();
        clickRowAction('Base rectangle renamed', 'edit');
        const undo = `${thresholdEditor} .cvat-threshold-policy-undo button`;
        cy.get(undo).should('be.disabled');
        cy.get(thresholdRows).last().find('input[id*="area"]').clear();
        cy.get(thresholdRows).last().find('input[id*="area"]').type('100');
        cy.get(thresholdRows).last().find('input[id*="area"]').blur();
        cy.get(thresholdRows).last().find('.ant-form-item-explain-error')
            .should('be.visible').and('contain', 'GT area must be unique.');
        cy.get(thresholdRows).last().find('input[id*="iou"]').clear();
        cy.get(thresholdRows).last().find('input[id*="iou"]').type('50');
        cy.get(thresholdRows).last().find('input[id*="iou"]').blur();
        submitForm();
        cy.contains('.ant-form-item-explain-error', 'Correct the IoU threshold fields before saving.')
            .scrollIntoView();
        cy.contains('.ant-form-item-explain-error', 'Correct the IoU threshold fields before saving.')
            .should('be.visible');
        cy.get(undo).trigger('mouseover');
        cy.contains('.ant-tooltip-inner', 'Undo: change IoU of point 2.')
            .should('contain', 'Only changes in this curve editor are undone.');
        cy.get(undo).click();
        cy.get(thresholdRows).last().find('input[id*="iou"]').should('have.value', '90');
        cy.get(thresholdRows).last().find('.ant-form-item-explain-error')
            .should('contain', 'GT area must be unique.');
        cy.get(undo).click();
        cy.get(undo).should('be.disabled');
        expectLinearThreshold();
        cy.get(`${thresholdRows} input[aria-invalid="true"]`).should('not.exist');
        cy.contains('.ant-form-item-explain-error', 'Correct the IoU threshold fields before saving.')
            .should('not.exist');
        cy.get(thresholdRows).last().find('input[id*="iou"]').clear();
        cy.get(thresholdRows).last().find('input[id*="iou"]').type('101');
        cy.get(thresholdRows).last().find('input[id*="iou"]').blur();
        cy.get(thresholdRows).last().find('input[id*="iou"]').should('have.value', '101');
        cy.get(thresholdRows).last().find('.ant-form-item-explain-error')
            .should('contain', 'IoU must be between 0 and 100%.');
        cy.get(undo).click();
        cy.get(undo).should('be.disabled');
        openSettingsTab();
    });

    it('Displays rounded coordinates without changing the saved precision', () => {
        const precisePolicy = {
            ...linearIouPolicy,
            points: [{ x: 0.000001, y: 0.269534050179211 }, { x: 206.53247034924306, y: 0.4 }],
        };
        openSettingsTab();
        setRectangleThresholdPolicy(precisePolicy);
        clickRowAction('Base rectangle renamed', 'edit');
        cy.window().then((win) => {
            const rounded = (number) => number.toLocaleString(win.navigator.language, {
                maximumFractionDigits: 2, useGrouping: false,
            });
            cy.get(thresholdRows).first().find('input[id*="iou"]')
                .should('have.value', rounded(precisePolicy.points[0].y * 100));
            cy.get(thresholdRows).last().find('input[id*="area"]')
                .should('have.value', rounded(precisePolicy.points[1].x));
        });
        cy.get(thresholdRows).first().find('input[id*="area"]').focus();
        cy.get(thresholdRows).first().find('input[id*="area"]').should('have.value', '0');
        cy.get(thresholdRows).first().find('input[id*="area"]').blur();
        cy.get(thresholdRows).last().find('input[id*="area"]').focus();
        cy.window().then((win) => {
            cy.get(thresholdRows).last().find('input[id*="area"]').should('have.value',
                precisePolicy.points[1].x.toLocaleString(win.navigator.language, {
                    maximumFractionDigits: 2, useGrouping: false,
                }));
        });
        cy.get(thresholdRows).last().find('input[id*="area"]').blur();
        cy.get(`${thresholdEditor} .cvat-threshold-policy-undo button`).should('be.disabled');
        cy.intercept('PATCH', '**/api/quality/settings/requirements/*').as('savePreciseIou');
        submitForm();
        cy.wait('@savePreciseIou').then(({ response }) => {
            expect(response.statusCode).to.equal(200);
            expect(response.body.iou_threshold).to.deep.equal(precisePolicy);
        });
        expectNotification('Requirement has been updated');
        setRectangleThresholdPolicy(linearIouPolicy);
    });

    it('Limits numeric input and paste to two decimal places', () => {
        openSettingsTab();
        clickRowAction('Base rectangle renamed', 'edit');
        const area = `${thresholdRows}:first input[id*="area"]`;
        const iou = `${thresholdRows}:first input[id*="iou"]`;
        cy.get(area).clear();
        cy.get(area).type('101.444444');
        cy.get(area).invoke('val').should('match', /^101[.,]44$/);
        cy.get(iou).clear();
        cy.get(iou).type('40,125');
        cy.get(iou).invoke('val').should('match', /^40[.,]12$/);
        cy.get(area).then(($input) => {
            const input = $input[0];
            input.select();
            const { ClipboardEvent, DataTransfer } = input.ownerDocument.defaultView;
            const clipboardData = new DataTransfer();
            clipboardData.setData('text', '206.5324');
            const accepted = input.dispatchEvent(new ClipboardEvent('paste', {
                bubbles: true, cancelable: true, clipboardData,
            }));
            expect(accepted).to.equal(false);
        });
        cy.get(area).invoke('val').should('match', /^101[.,]44$/);
        cy.intercept('PATCH', '**/api/quality/settings/requirements/*').as('saveRoundedIou');
        submitForm();
        expectPolicyRequest('@saveRoundedIou', {
            ...linearIouPolicy, points: [{ x: 101.44, y: 0.4012 }, linearIouPolicy.points[1]],
        });
        expectNotification('Requirement has been updated');
        setRectangleThresholdPolicy(linearIouPolicy);
    });

    it('Searches and paginates 200 editable points and enforces the point limit', () => {
        const largePolicy = {
            ...linearIouPolicy,
            points: Array.from({ length: 200 }, (_, index) => ({ x: (index + 1) * 100, y: 0.4 })),
        };
        openSettingsTab();
        setRectangleThresholdPolicy(largePolicy);
        clickRowAction('Base rectangle renamed', 'edit');
        cy.get(thresholdRows).should('have.length', 10);
        cy.get(`${thresholdEditor} button[aria-label="Add point"]`).should('be.disabled');
        cy.get(`${thresholdEditor} input[aria-label="Search key points"]`).type('19900');
        cy.get(thresholdRows).should('have.length', 1).find('input[id*="area"]')
            .should('have.value', '19900');
        cy.get(thresholdRows).find('button[aria-label^="Delete point"]').click();
        cy.get(`${thresholdEditor} .cvat-threshold-policy-undo button`).click();
        cy.get(`${thresholdEditor} button[aria-label="Add point"]`).should('be.disabled');
        cy.get(`${thresholdEditor} input[aria-label="Search key points"]`).clear();
        cy.get(`${thresholdEditor} .ant-pagination-item-20`).click();
        cy.get(thresholdRows).last().find('input[id*="area"]').should('have.value', '20000');
        cy.get('.cvat-quality-requirement-form-actions').contains('button', 'Cancel').click();
        setRectangleThresholdPolicy(linearIouPolicy);
    });

    it('Edits and persists an ellipse IoU curve through the threshold field', () => {
        openSettingsTab();
        clickRowAction('Base ellipse', 'edit');
        selectThresholdMode('Linear interpolation');
        cy.get(thresholdRows).last().find('input[id*="iou"]').clear();
        cy.get(thresholdRows).last().find('input[id*="iou"]').type('90');
        cy.get(thresholdRows).last().find('input[id*="iou"]').blur();
        cy.intercept('PATCH', '**/api/quality/settings/requirements/*').as('saveEllipseIou');
        submitForm();
        expectPolicyRequest('@saveEllipseIou', linearIouPolicy);
        expectNotification('Requirement has been updated');
        cy.reload();
        cy.get('.cvat-quality-requirements-configuration-table').should('be.visible');
        clickRowAction('Base ellipse', 'edit');
        expectLinearThreshold();
        cy.get('.cvat-quality-requirement-form-actions').contains('button', 'Cancel').click();
    });

    it('Preserves inherited IoU when another field changes, overrides it and resets the whole policy', () => {
        openSettingsTab();
        ensureRowExpanded('Base rectangle renamed');
        clickRowAction(childRequirementName, 'edit');
        expectLinearThreshold();
        setFormThreshold(91);
        cy.intercept('PATCH', '**/api/quality/settings/requirements/*').as('saveInheritedIou');
        submitForm();
        cy.wait('@saveInheritedIou').then(({ request, response }) => {
            expect(response.statusCode).to.equal(200);
            expect(request.body).not.to.have.property('iou_threshold');
            expect(response.body.iou_threshold).to.equal(null);
            expect(response.body.effective.iou_threshold).to.deep.equal(linearIouPolicy);
        });
        expectNotification('Requirement has been updated');

        clickRowAction(childRequirementName, 'edit');
        expectLinearThreshold();
        selectThresholdMode('Constant');
        cy.get(`${thresholdEditor} input.ant-input-number-input`).clear();
        cy.get(`${thresholdEditor} input.ant-input-number-input`).type('65');
        cy.get(`${thresholdEditor} input.ant-input-number-input`).blur();
        submitForm();
        expectPolicyRequest('@saveInheritedIou', { type: 'iou', mode: 'constant', value: 0.65 });
        expectNotification('Requirement has been updated');

        clickRowAction(childRequirementName, 'edit');
        cy.get(`${thresholdEditor} input.ant-input-number-input`).should('have.value', '65');
        cy.contains('.ant-form-item', 'IoU threshold')
            .find('.ant-form-item-label .cvat-quality-requirement-revert-button').click();
        expectLinearThreshold();
        submitForm();
        expectPolicyRequest('@saveInheritedIou', null);
        expectNotification('Requirement has been updated');
        cy.reload();
        cy.get('.cvat-quality-requirements-configuration-table').should('be.visible');
        clickRowAction(childRequirementName, 'edit');
        expectLinearThreshold();
        cy.get('.cvat-quality-requirement-form-actions').contains('button', 'Cancel').click();
    });

    it('Reverts all editor state when the inherited policy equals the published value', () => {
        openSettingsTab();
        ensureRowExpanded('Base rectangle renamed');
        clickRowAction(childRequirementName, 'edit');
        expectLinearThreshold();
        selectThresholdMode('Constant');
        cy.get(`${thresholdEditor} input.ant-input-number-input`).clear();
        cy.get(`${thresholdEditor} input.ant-input-number-input`).type('65');
        cy.get(`${thresholdEditor} input.ant-input-number-input`).blur();
        selectThresholdMode('Linear interpolation');
        cy.get(`${thresholdEditor} button[aria-label="Zoom out on GT area"]`).click();
        cy.get(thresholdRows).last().find('input[id*="area"]').clear();
        cy.get(thresholdRows).last().find('input[id*="area"]').type('100');
        cy.get(thresholdRows).last().find('input[id*="area"]').blur();
        cy.get(`${thresholdEditor} input[aria-label="Search key points"]`).type('no matching point');
        submitForm();
        cy.contains('.ant-form-item-explain-error', 'Correct the IoU threshold fields before saving.')
            .scrollIntoView();
        cy.contains('.ant-form-item-explain-error', 'Correct the IoU threshold fields before saving.')
            .should('be.visible');
        cy.contains('.ant-form-item', 'IoU threshold')
            .find('.ant-form-item-label .cvat-quality-requirement-revert-button').click();
        expectLinearThreshold();
        cy.get(`${thresholdEditor} input[aria-label="Search key points"]`).should('have.value', '');
        cy.get(`${thresholdRows}.selected`).should('not.exist');
        cy.get(`${thresholdEditor} .cvat-threshold-policy-undo button`).should('be.disabled');
        cy.get(`${thresholdEditor} [aria-invalid="true"]`).should('not.exist');
        cy.contains('.ant-form-item-explain-error', 'Correct the IoU threshold fields before saving.')
            .should('not.exist');
        selectThresholdMode('Constant');
        cy.get(`${thresholdEditor} input.ant-input-number-input`).should('have.value', '40');
        selectThresholdMode('Linear interpolation');
        expectLinearThreshold();
        cy.contains('.ant-form-item', 'IoU threshold')
            .find('.ant-form-item-label .cvat-quality-requirement-revert-button').click();
        cy.intercept('PATCH', '**/api/quality/settings/requirements/*').as('saveRevertedIou');
        submitForm();
        cy.wait('@saveRevertedIou').then(({ request, response }) => {
            expect(response.statusCode).to.equal(200);
            expect(request.body).not.to.have.property('iou_threshold');
            expect(response.body.iou_threshold).to.equal(null);
            expect(response.body.effective.iou_threshold).to.deep.equal(linearIouPolicy);
        });
        expectNotification('Requirement has been updated');
    });

    it('Copies a local IoU curve without changing the source requirement', () => {
        openSettingsTab();
        ensureRowExpanded('Base rectangle renamed');
        clickRowAction(childRequirementName, 'edit');
        expectLinearThreshold();
        cy.get(thresholdRows).last().find('input[id*="iou"]').clear();
        cy.get(thresholdRows).last().find('input[id*="iou"]').type('85');
        cy.get(thresholdRows).last().find('input[id*="iou"]').blur();
        const sourcePolicy = { ...linearIouPolicy, points: [{ x: 100, y: 0.4 }, { x: 1000, y: 0.85 }] };
        cy.intercept('PATCH', '**/api/quality/settings/requirements/*').as('saveLocalIou');
        submitForm();
        expectPolicyRequest('@saveLocalIou', sourcePolicy);
        expectNotification('Requirement has been updated');

        clickRowAction(childRequirementName, 'copy');
        expectLinearThreshold(sourcePolicy.points);
        cy.get(thresholdRows).last().find('input[id*="iou"]').clear();
        cy.get(thresholdRows).last().find('input[id*="iou"]').type('75');
        cy.get(thresholdRows).last().find('input[id*="iou"]').blur();
        const copiedPolicy = { ...linearIouPolicy, points: [{ x: 100, y: 0.4 }, { x: 1000, y: 0.75 }] };
        cy.intercept('POST', '**/api/quality/settings/requirements*').as('copyIouPolicy');
        submitForm();
        expectPolicyRequest('@copyIouPolicy', copiedPolicy, 201);
        expectNotification('Requirement has been created');

        cy.reload();
        cy.get('.cvat-quality-requirements-configuration-table').should('be.visible');
        clickRowAction(copiedRequirementName, 'edit');
        expectLinearThreshold(copiedPolicy.points);
        cy.get('.cvat-quality-requirement-form-actions').contains('button', 'Cancel').click();
        clickRowAction(childRequirementName, 'edit');
        expectLinearThreshold(sourcePolicy.points);
        cy.get('.cvat-quality-requirement-form-actions').contains('button', 'Cancel').click();
    });

    it('Keeps the curve draft when switching modes and saves a constant IoU', () => {
        openSettingsTab();
        clickRowAction('Base rectangle renamed', 'edit');
        expectLinearThreshold();
        selectThresholdMode('Constant');
        cy.get(`${thresholdEditor} .cvat-threshold-policy-chart`).should('not.exist');
        cy.get(`${thresholdEditor} input.ant-input-number-input`).should('have.length', 1).clear();
        cy.get(`${thresholdEditor} input.ant-input-number-input`).type('70');
        cy.get(`${thresholdEditor} input.ant-input-number-input`).blur();
        selectThresholdMode('Linear interpolation');
        expectLinearThreshold();
        selectThresholdMode('Constant');
        cy.get(`${thresholdEditor} input.ant-input-number-input`).should('have.value', '70');
        cy.intercept('PATCH', '**/api/quality/settings/requirements/*').as('saveConstantIou');
        submitForm();
        expectPolicyRequest('@saveConstantIou', { type: 'iou', mode: 'constant', value: 0.7 });
        expectNotification('Requirement has been updated');
        cy.reload();
        cy.get('.cvat-quality-requirements-configuration-table').should('be.visible');
        clickRowAction('Base rectangle renamed', 'edit');
        cy.get(`${thresholdEditor} .cvat-threshold-policy-chart`).should('not.exist');
        cy.get(`${thresholdEditor} input.ant-input-number-input`).should('have.length', 1).and('have.value', '70');
        // Tests share the page; visiting the same #settings URL does not close this form.
        cy.get('.cvat-quality-requirement-form-actions').contains('button', 'Cancel').click();
        cy.get('.cvat-quality-requirements-configuration-table').should('be.visible');
    });

    it('Fits an inherited large curve on reset and preserves point identity and manual zoom', () => {
        const largePolicy = {
            ...linearIouPolicy, points: [{ x: 100000, y: 0.4 }, { x: 1000000, y: 0.9 }],
        };
        const canvas = `${thresholdEditor} canvas`;
        const hoverArea = () => {
            cy.get(canvas).scrollIntoView();
            cy.get(canvas).then(($canvas) => {
                const { width, height } = $canvas[0].getBoundingClientRect();
                // Cypress resolves canvas-relative coordinates after its actionability scrolling.
                cy.wrap($canvas).trigger('pointermove', width * 0.9, height * 0.5, {
                    eventConstructor: 'PointerEvent',
                    pointerId: 1,
                });
            });
            return cy.get(`${thresholdEditor} .cvat-threshold-policy-tooltip div`).invoke('text')
                .then((text) => cy.window().then((win) => {
                    const parts = new win.Intl.NumberFormat().formatToParts(12345.6);
                    const group = parts.find((part) => part.type === 'group').value;
                    const decimal = parts.find((part) => part.type === 'decimal').value;
                    return Number(text.replace('GT area:', '').replace('px²', '')
                        .split(group).join('').replace(decimal, '.').trim());
                }));
        };
        openSettingsTab();
        cy.window().then((win) => win.cvat.server.request(`/api/quality/settings?task_id=${taskId}`)
            .then(({ data }) => {
                const settings = data.results.find((item) => item.task_id === taskId);
                const parent = settings.requirements.find((item) => item.is_base && item.annotation_type === 'rectangle');
                const child = settings.requirements.find((item) => item.name === childRequirementName);
                return Promise.all([
                    [parent, largePolicy], [child, linearIouPolicy],
                ].map(([requirement, policy]) => win.cvat.server.request(
                    `/api/quality/settings/requirements/${requirement.id}`,
                    { method: 'PATCH', data: { iou_threshold: policy } },
                )));
            }));
        // Reload to fetch API changes; visiting the same #settings URL preserves the current page.
        cy.reload();
        cy.get('.cvat-quality-requirements-configuration-table').should('be.visible');
        ensureRowExpanded('Base rectangle renamed');
        clickRowAction(childRequirementName, 'edit');
        expectLinearThreshold();
        cy.get(thresholdRows).first().find('input[id*="area"]').then(($input) => {
            const input = $input[0];
            cy.wrap($input).clear();
            cy.wrap($input).type('1500');
            cy.get(thresholdRows).first().find('input[id*="area"]').should(($first) => {
                expect($first[0]).to.equal(input);
                expect($first.val()).to.equal('1500');
                expect(input.ownerDocument.activeElement).to.equal(input);
            });
            cy.wrap($input).blur();
            cy.get(thresholdRows).last().find('input[id*="area"]').should(($last) => {
                expect($last[0]).to.equal(input);
            });
            cy.contains(`${thresholdEditor} button`, 'Undo').click();
            cy.get(thresholdRows).first().find('input[id*="area"]').should(($first) => {
                expect($first[0]).to.equal(input);
                expect($first.val()).to.equal('100');
            });
        });
        cy.contains(`${thresholdEditor} button`, '−').click();
        cy.contains('.ant-form-item', 'IoU threshold')
            .find('.ant-form-item-label .cvat-quality-requirement-revert-button').click();
        expectLinearThreshold(largePolicy.points);
        hoverArea().should('be.greaterThan', 1000000).and('be.lessThan', 1150000);
        cy.contains(`${thresholdEditor} button`, '−').click();
        hoverArea().then((zoomedArea) => {
            cy.get(thresholdRows).first().find('input[id*="iou"]').clear();
            cy.get(thresholdRows).first().find('input[id*="iou"]').type('50');
            cy.get(thresholdRows).first().find('input[id*="iou"]').blur();
            hoverArea().should('be.closeTo', zoomedArea, 0.1);
        });
        cy.contains(`${thresholdEditor} button`, 'Fit').click();
        hoverArea().should('be.greaterThan', 1000000).and('be.lessThan', 1150000);
        cy.intercept('PATCH', '**/api/quality/settings/requirements/*').as('saveLargeIou');
        submitForm();
        expectPolicyRequest('@saveLargeIou', {
            ...largePolicy, points: [{ x: 100000, y: 0.5 }, { x: 1000000, y: 0.9 }],
        });
        expectNotification('Requirement has been updated');
    });
});

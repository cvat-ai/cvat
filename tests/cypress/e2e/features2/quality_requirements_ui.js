// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { defaultTaskSpec } from '../../support/default-specs';

context('Quality requirements UI', () => {
    const taskName = 'Quality requirements UI task';
    const labelName = 'quality_requirement_label';
    const serverFiles = ['images/image_1.jpg', 'images/image_2.jpg', 'images/image_3.jpg'];
    const childRequirementName = 'E2E rectangle accuracy';
    const grandchildRequirementName = 'E2E precise rectangle accuracy';
    const validationParams = {
        frameCount: 2,
        mode: 'gt',
        frameSelectionMethod: 'random_uniform',
    };
    let taskId = null;

    function qualityRequest(method, path, data) {
        return cy.window().its('cvat').then((cvat) => (
            cvat.server.request(path, { method, data }).then((response) => response.data)
        ));
    }

    function getTaskQualitySettings() {
        return qualityRequest('GET', `/api/quality/settings?task_id=${taskId}`).then((data) => {
            expect(data.results).to.have.length(1);
            return data.results[0];
        });
    }

    function createRequirement(data) {
        return qualityRequest('POST', '/api/quality/settings/requirements', data);
    }

    function patchRequirement(requirementId, data) {
        return qualityRequest('PATCH', `/api/quality/settings/requirements/${requirementId}`, data);
    }

    function openSettingsTab() {
        cy.visit(`/tasks/${taskId}/quality-control#settings`);
        cy.get('.cvat-quality-control-settings-tab').should('be.visible');
        cy.get('.cvat-quality-requirements-configuration-table').should('be.visible');
    }

    function expandRequirementRow(name) {
        cy.contains('tr', name).within(() => {
            cy.get('.ant-table-row-expand-icon-collapsed').click();
        });
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
            cy.window().then((win) => {
                Object.keys(win.localStorage)
                    .filter((key) => key.startsWith('qualityRequirementsConstructorExpandedRows'))
                    .forEach((key) => win.localStorage.removeItem(key));
            });
        }).then(() => {
            getTaskQualitySettings().then((settings) => {
                const rectangleRequirement = settings.requirements.find((requirement) => (
                    requirement.is_default && requirement.annotation_type === 'rectangle'
                ));

                expect(rectangleRequirement).to.exist;

                patchRequirement(rectangleRequirement.id, { enabled: true });
                createRequirement({
                    settings_id: settings.id,
                    parent_requirement: rectangleRequirement.id,
                    name: childRequirementName,
                    enabled: true,
                    required_score: 0.8,
                }).then((childRequirement) => {
                    createRequirement({
                        settings_id: settings.id,
                        parent_requirement: childRequirement.id,
                        name: grandchildRequirementName,
                        enabled: true,
                    });
                });
            });
        });
    });

    after(() => {
        if (taskId !== null) {
            cy.headlessDeleteTask(taskId);
        }
    });

    it('Shows inherited values in settings constructor and persists expanded rows', () => {
        openSettingsTab();

        cy.get('.cvat-quality-requirements-configuration-table').within(() => {
            cy.contains('default:rectangle').should('exist');
            cy.contains('tr', 'default:rectangle').within(() => {
                cy.contains('Rectangle').should('exist');
                cy.contains('Accuracy').should('exist');
                cy.get('[aria-label="copy"]').should('not.exist');
                cy.get('[aria-label="delete"]').should('not.exist');
            });
        });

        expandRequirementRow('default:rectangle');
        cy.contains('tr', childRequirementName).within(() => {
            cy.contains('Rectangle').should('exist');
            cy.contains('Accuracy').should('exist');
            cy.contains('80%').should('exist');
            cy.get('[aria-label="copy"]').should('exist');
            cy.get('[aria-label="delete"]').should('exist');
        });

        expandRequirementRow(childRequirementName);
        cy.contains('tr', grandchildRequirementName).within(() => {
            cy.contains('Rectangle').should('exist');
            cy.contains('Accuracy').should('exist');
            cy.contains('80%').should('exist');
        });

        cy.reload();
        cy.get('.cvat-quality-control-settings-tab').should('be.visible');
        cy.get('.cvat-quality-requirements-configuration-table').should('be.visible');
        cy.contains('tr', childRequirementName).should('exist');
        cy.contains('tr', grandchildRequirementName).should('exist');
    });

    it('Opens the create requirement form from an existing parent requirement', () => {
        openSettingsTab();
        cy.contains('tr', 'default:rectangle').within(() => {
            cy.get('[aria-label="plus"]').closest('button').click();
        });

        cy.get('.cvat-quality-requirement-form').should('be.visible');
        cy.contains('Create requirement').should('exist');
        cy.contains('Parent requirement').should('exist');
        cy.contains('Target metric').should('exist');
        cy.contains('Shape comparison').should('exist');
        cy.contains('.ant-form-item', 'Parent requirement')
            .find('.ant-select-disabled')
            .should('exist');
        cy.contains('.ant-form-item', 'Target')
            .find('.ant-select-disabled')
            .should('exist');
        cy.contains('button', 'Cancel').click();
        cy.get('.cvat-quality-requirements-configuration-table').should('be.visible');
    });
});

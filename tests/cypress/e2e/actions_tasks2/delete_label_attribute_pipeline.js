// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Delete saved label attribute pipeline.', () => {
    const regularLabelName = 'car';
    const regularAttrName = 'model';
    const skeletonLabelName = 'skeleton';
    const skeletonSublabelName = 'head';
    const skeletonAttrName = 'visibility';
    const dataSpec = {
        server_files: ['bigArchive.zip'],
        image_quality: 70,
        use_zip_chunks: true,
        use_cache: true,
        sorting_method: 'lexicographical',
    };
    const labels = [
        {
            name: regularLabelName,
            attributes: [
                {
                    name: regularAttrName,
                    mutable: false,
                    input_type: 'text',
                    default_value: 'mazda',
                    values: ['mazda'],
                },
            ],
            type: 'any',
        },
        {
            name: skeletonLabelName,
            type: 'skeleton',
            sublabels: [
                {
                    name: skeletonSublabelName,
                    type: 'points',
                    attributes: [
                        {
                            name: skeletonAttrName,
                            mutable: false,
                            input_type: 'select',
                            default_value: 'visible',
                            values: ['visible', 'hidden'],
                        },
                    ],
                },
            ],
            svg: '<circle r="1.5" cx="20" cy="20" data-type="element node" ' +
                `data-element-id="1" data-node-id="1" data-label-name="${skeletonSublabelName}"></circle>`,
        },
    ];
    let taskID = null;
    let taskJobID = null;
    let projectID = null;
    let projectTaskID = null;
    let projectJobID = null;

    function createRegularAnnotation(taskId, jobId, labelSource) {
        return cy.request(`/api/labels?${labelSource}_id=${taskId}`).then((response) => {
            const label = response.body.results.find((_label) => _label.name === regularLabelName);
            const attribute = label.attributes.find((_attr) => _attr.name === regularAttrName);

            return cy.headlessCreateObjects([
                {
                    objectType: 'shape',
                    type: 'rectangle',
                    frame: 0,
                    labelName: regularLabelName,
                    points: [10, 10, 100, 100],
                    attributes: [{ spec_id: attribute.id, value: 'toyota' }],
                },
            ], jobId);
        });
    }

    function openResource(resourceType, resourceID) {
        cy.visit(`/${resourceType}s/${resourceID}`);
        cy.get(`.cvat-${resourceType}-details`).should('exist').and('be.visible');
    }

    function openLabel(labelName) {
        cy.contains('.cvat-constructor-viewer-item', labelName)
            .find('[aria-label="edit"]')
            .click();
    }

    function deleteRegularAttributeFromConstructor(resourceType, resourceID) {
        openResource(resourceType, resourceID);
        openLabel(regularLabelName);

        cy.intercept('PATCH', '/api/labels/*').as('updateLabel');
        cy.contains('.cvat-attribute-inputs-wrapper', regularAttrName)
            .find('.cvat-delete-attribute-button')
            .click();
        cy.get('.cvat-modal-delete-label-attribute')
            .should('be.visible')
            .and('contain', 'Corresponding attribute annotation values will be removed')
            .within(() => {
                cy.contains('button', 'OK').click();
            });
        cy.contains('.cvat-attribute-inputs-wrapper', regularAttrName).should('not.exist');
        cy.get('.cvat-label-constructor-updater').contains('button', 'Done').click();
        cy.wait('@updateLabel').its('response.statusCode').should('equal', 200);

        openLabel(regularLabelName);
        cy.get('.cvat-attribute-inputs-wrapper').should('not.exist');
        cy.get('.cvat-label-constructor-updater').contains('button', 'Cancel').click();
    }

    function deleteSkeletonAttributeFromRawEditor(resourceType, resourceID) {
        openResource(resourceType, resourceID);
        cy.contains('.ant-tabs-tab', 'Raw').click();
        cy.get('.cvat-raw-labels-viewer').invoke('val').then((value) => {
            const parsedLabels = JSON.parse(value);
            const skeleton = parsedLabels.find((_label) => _label.name === skeletonLabelName);
            const sublabel = skeleton.sublabels.find((_label) => _label.name === skeletonSublabelName);
            sublabel.attributes = [];
            const labelsText = JSON.stringify(parsedLabels, null, 2);

            cy.get('.cvat-raw-labels-viewer').clear();
            cy.get('.cvat-raw-labels-viewer')
                .type(labelsText, { parseSpecialCharSequences: false, delay: 0 });
        });

        cy.intercept('PATCH', '/api/labels/*').as('updateLabel');
        cy.get('.cvat-submit-raw-labels-conf-button').click();
        cy.get('.cvat-modal-confirm-remove-existing-labels')
            .should('be.visible')
            .and('contain', skeletonAttrName)
            .and('contain', 'All related annotations will be destroyed');
        cy.contains('button', 'Delete existing data').click();
        cy.wait('@updateLabel').its('response.statusCode').should('equal', 200);

        cy.contains('.ant-tabs-tab', 'Constructor').click();
        openLabel(skeletonLabelName);
        cy.get('.cvat-skeleton-configurator-svg circle[data-type*="element"]').rightclick({ force: true });
        cy.contains('.cvat-skeleton-configurator-context-menu button', 'Configure').click();
        cy.get('.ant-modal').should('be.visible').and('not.contain', skeletonAttrName);
        cy.get('.ant-modal').contains('button', 'Cancel').click();
        cy.get('.cvat-label-constructor-updater').contains('button', 'Cancel').click();
    }

    function deleteSkeletonAttributeFromSkeletonEditor(resourceType, resourceID) {
        openResource(resourceType, resourceID);
        openLabel(skeletonLabelName);
        cy.get('.cvat-skeleton-configurator-svg circle[data-type*="element"]').rightclick({ force: true });
        cy.contains('.cvat-skeleton-configurator-context-menu button', 'Configure').click();

        cy.contains('.ant-modal .cvat-attribute-inputs-wrapper', skeletonAttrName)
            .find('.cvat-delete-attribute-button')
            .click();
        cy.get('.cvat-modal-delete-label-attribute')
            .should('be.visible')
            .and('contain', 'Corresponding attribute annotation values will be removed')
            .within(() => {
                cy.contains('button', 'OK').click();
            });
        cy.contains('.ant-modal .cvat-attribute-inputs-wrapper', skeletonAttrName).should('not.exist');
        cy.get('.ant-modal').contains('button', 'Done').click();

        cy.intercept('PATCH', '/api/labels/*').as('updateLabel');
        cy.get('.cvat-label-constructor-updater').contains('button', 'Done').click();
        cy.wait('@updateLabel').its('response.statusCode').should('equal', 200);

        openLabel(skeletonLabelName);
        cy.get('.cvat-skeleton-configurator-svg circle[data-type*="element"]').rightclick({ force: true });
        cy.contains('.cvat-skeleton-configurator-context-menu button', 'Configure').click();
        cy.get('.ant-modal').should('be.visible').and('not.contain', skeletonAttrName);
        cy.get('.ant-modal').contains('button', 'Cancel').click();
        cy.get('.cvat-label-constructor-updater').contains('button', 'Cancel').click();
    }

    before(() => {
        cy.prepareUserSession();
        cy.headlessCreateTask({
            name: 'Delete saved label attribute pipeline task',
            labels,
            project_id: null,
            source_storage: { location: 'local' },
            target_storage: { location: 'local' },
        }, dataSpec).then(({ taskID: tid, jobIDs }) => {
            taskID = tid;
            [taskJobID] = jobIDs;
            return createRegularAnnotation(taskID, taskJobID, 'task');
        });

        cy.headlessCreateProject({
            name: 'Delete saved label attribute pipeline project',
            labels,
        }).then(({ projectID: pid }) => {
            projectID = pid;
            return cy.headlessCreateTask({
                name: 'Delete saved label attribute pipeline project task',
                project_id: projectID,
                source_storage: { location: 'local' },
                target_storage: { location: 'local' },
            }, dataSpec).then(({ taskID: tid, jobIDs }) => {
                projectTaskID = tid;
                [projectJobID] = jobIDs;
                return createRegularAnnotation(projectID, projectJobID, 'project');
            });
        });
    });

    after(() => {
        if (taskID !== null) {
            cy.headlessDeleteTask(taskID);
        }

        if (projectID !== null) {
            cy.headlessDeleteProject(projectID);
        } else if (projectTaskID !== null) {
            cy.headlessDeleteTask(projectTaskID);
        }
    });

    it('removes saved regular and skeleton element attributes from task and project labels', () => {
        cy.visit(`/tasks/${taskID}/jobs/${taskJobID}`);
        cy.get('.cvat-canvas-container').should('exist').and('be.visible');
        cy.get('.cvat-object-item-text-attribute').should('exist');

        deleteRegularAttributeFromConstructor('task', taskID);

        cy.visit(`/tasks/${taskID}/jobs/${taskJobID}`);
        cy.get('.cvat-canvas-container').should('exist').and('be.visible');
        cy.get('.cvat-object-item-text-attribute').should('not.exist');

        deleteSkeletonAttributeFromRawEditor('task', taskID);
        deleteRegularAttributeFromConstructor('project', projectID);

        cy.visit(`/tasks/${projectTaskID}/jobs/${projectJobID}`);
        cy.get('.cvat-canvas-container').should('exist').and('be.visible');
        cy.get('.cvat-object-item-text-attribute').should('not.exist');

        deleteSkeletonAttributeFromSkeletonEditor('project', projectID);
    });
});

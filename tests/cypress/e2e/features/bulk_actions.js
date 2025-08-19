// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />
/// <reference types="../../support/index.d.ts" />

import { defaultTaskSpec } from '../../support/default-specs';

context('This is your test project title', () => {
    const taskName = 'task_bulk_actions';
    const projectName = 'project_bulk_actions';
    const serverFiles = ['smallArchive.zip'];
    const labelName = 'car';
    const project = {
        name: projectName,
        label: 'car',
        attrName: 'color',
        attrValue: 'red',
        multiAttrParams: false,
    };
    const projectSpec = {
        name: project.name,
        labels: [{
            name: labelName,
            attributes: [{
                name: project.attrName,
                mutable: false,
                input_type: 'text',
                default_value: project.attrValue,
                values: [project.attrValue],
            }],
        }],
    };
    const projects = [];
    before(() => {
        cy.visit('/auth/login');
        cy.headlessLogin();

        /* minimal setup:
            two projects:
                one with which with two tasks,
                    one of which with two jobs
        */
        const framesPerJob = 1;
        const stringID = (i, str) => str.concat(`_${i}`);
        const createTaskInProject = (i, projectID, taskParams) => {
            const { taskSpec, dataSpec, extras } = defaultTaskSpec({
                ...taskParams,
                projectID,
                taskName: stringID(i, taskParams.taskName),
            });
            return cy.headlessCreateTask(taskSpec, dataSpec, extras);
        };
        const createProject = (i) => cy.headlessCreateProject({
            ...projectSpec,
            name: stringID(i, projectName),
        });
        createProject(2).then(({ projectID }) => {
            // default task with 1 job
            createTaskInProject(1, projectID, { taskName, labelName, serverFiles });

            // default task with 2 jobs
            createTaskInProject(2, projectID, {
                taskName, labelName, serverFiles, segmentSize: framesPerJob,
            });
            projects.push(projectID);
        });
        createProject(1).then(({ projectID }) => projects.push(projectID)); // empty project
    });

    after(() => {
        projects.forEach(cy.headlessDeleteProject);
    });

    describe('This is your test suite title', () => {
        it('This is your test case two title', () => {
            // cy.
        });
    });
});

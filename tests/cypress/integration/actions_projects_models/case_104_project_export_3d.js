// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { projectName, labelName } from '../../support/const_project';

context('Export project dataset with 3D task.', { browser: '!firefox' }, () => {
    const caseID = 104;
    const task = {
        name3d: `Case ${caseID}`,
        label3d: labelName,
        attrName3d: 'Kind',
        attrValue3d: 'Oak',
        archiveName: '../../cypress/integration/canvas3d_functionality/assets/test_canvas3d.zip',
        advancedConfigurationParams: false,
        forProject: true,
        attachToProject: false,
        multiAttrParams: false,
    };
    let projectID = '';

    function getProjectID(projectName) {
        cy.contains('.cvat-project-name', projectName)
            .parents('.cvat-project-details')
            .should('have.attr', 'cvat-project-id')
            .then(($projectID) => {
                projectID = $projectID;
            });
    }

    function testCheckFile(file) {
        cy.task('listFiles', 'cypress/fixtures').each((fileName) => {
            if (fileName.match(file)) {
               cy.readFile(`cypress/fixtures/${fileName}`).should('exist');
            }
        });
    }

    before(() => {
        cy.openProject(projectName);
        getProjectID(projectName);
        cy.createAnnotationTask(
            task.name3d,
            task.label3d,
            task.attrName3d,
            task.attrValue3d,
            task.archiveName,
            task.multiAttrParams,
            task.advancedConfigurationParams,
            task.forProject,
            task.attachToProject,
            projectName,
        );
    });

    after(() => {
        cy.goToProjectsList();
        cy.deleteProject(projectName, projectID);
    });

    describe(`Testing "Case ${caseID}"`, () => {
        it('Export project with 3D task. Annotation.', () => {
            cy.goToProjectsList();
            const exportAnnotation3d = {
                projectName: projectName,
                as: 'exportAnnotations3d',
                type: 'annotations',
                dumpType: 'Kitti Raw Format',
            };
            cy.exportProject(exportAnnotation3d);
            const regex = new RegExp(`^project_${projectName.toLowerCase()}-.*-${exportAnnotation3d.dumpType.toLowerCase()}.*.zip$`);
            testCheckFile(regex);
        });

        it('Export project with 3D task. Dataset.', () => {
            cy.goToProjectsList();
            const exportDataset3d = {
                projectName: projectName,
                as: 'exportDataset3d',
                type: 'dataset',
                dumpType: 'Sly Point Cloud Format',
            };
            cy.exportProject(exportDataset3d);
            const regex = new RegExp(`^project_${projectName.toLowerCase()}-.*-${exportDataset3d.dumpType.toLowerCase()}.*.zip$`);
            testCheckFile(regex);
        });

        it('Export project with 3D task. Annotation. Rename a archive.', () => {
            cy.goToProjectsList();
            const exportAnnotations3dRenameArchive = {
                projectName: projectName,
                as: 'exportAnnotations3dRenameArchive',
                type: 'annotations',
                dumpType: 'Kitti Raw Format',
                archiveCustomeName: 'export_project_3d_annotation',
            };
            cy.exportProject(exportAnnotations3dRenameArchive);
            const regex = new RegExp(`^${exportAnnotations3dRenameArchive.archiveCustomeName}.zip$`);
            testCheckFile(regex);
        });
    });
});

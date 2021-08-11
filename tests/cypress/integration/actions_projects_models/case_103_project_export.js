// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { projectName, labelName } from '../../support/const_project';

context('Export project dataset.', { browser: '!firefox' }, () => {
    const caseID = 103;
    const taskName = `Task case ${caseID}`;
    const attrName = `Attr for ${labelName}`;
    const textDefaultValue = 'Some value for type Text';
    const imagesCount = 1;
    const imageFileName = `image_${taskName.replace(/\s+/g, '_').toLowerCase()}`;
    const width = 800;
    const height = 800;
    const posX = 10;
    const posY = 10;
    const color = 'white';
    const archiveName = `${imageFileName}.zip`;
    const archivePath = `cypress/fixtures/${archiveName}`;
    const imagesFolder = `cypress/fixtures/${imageFileName}`;
    const directoryToArchive = imagesFolder;
    const advancedConfigurationParams = false;
    const forProject = true;
    const attachToProject = false;
    const multiAttrParams = false;
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
        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
        cy.createZipArchive(directoryToArchive, archivePath);
        cy.openProject(projectName);
        getProjectID(projectName);
        cy.createAnnotationTask(
            taskName,
            labelName,
            attrName,
            textDefaultValue,
            archiveName,
            multiAttrParams,
            advancedConfigurationParams,
            forProject,
            attachToProject,
            projectName,
        );
    });

    after(() => {
        cy.goToProjectsList();
        cy.deleteProject(projectName, projectID);
    });

    describe(`Testing "Case ${caseID}"`, () => {
        it('Export project dataset. Annotation.', () => {
            cy.goToProjectsList();
            const exportAnnotation = {
                projectName: projectName,
                as: 'exportAnnotations',
                type: 'annotations',
                dumpType: 'CVAT for images',
            };
            cy.exportProject(exportAnnotation);
            const regex = new RegExp(`^project_${projectName.toLowerCase()}-.*-${exportAnnotation.dumpType.toLowerCase()}.*.zip$`);
            testCheckFile(regex);
        });

        it('Export project dataset. Dataset.', () => {
            cy.goToProjectsList();
            const exportDataset = {
                projectName: projectName,
                as: 'exportDataset',
                type: 'dataset',
                dumpType: 'CVAT for video',
            };
            cy.exportProject(exportDataset);
            const regex = new RegExp(`^project_${projectName.toLowerCase()}-.*-${exportDataset.dumpType.toLowerCase()}.*.zip$`);
            testCheckFile(regex);
        });

        it('Export project dataset. Annotation. Rename a archive.', () => {
            cy.goToProjectsList();
            const exportAnnotationsRenameArchive = {
                projectName: projectName,
                as: 'exportAnnotationsRenameArchive',
                type: 'annotations',
                dumpType: 'CVAT for images',
                archiveCustomeName: 'export_project_annotation',
            };
            cy.exportProject(exportAnnotationsRenameArchive);
            const regex = new RegExp(`^${exportAnnotationsRenameArchive.archiveCustomeName}.zip$`);
            testCheckFile(regex);
        });
    });
});

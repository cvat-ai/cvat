// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

const caseId = '114';
let projectID = '';
let projectBackupArchiveFullName;

function getProjectID() {
    cy.url().then((url) => {
        projectID = Number(url.split('/').slice(-1)[0].split('?')[0]);
    });
}

const project = {
    name: `Case ${caseId}`,
    label: 'Tree',
    attrName: 'Kind',
    attrVaue: 'Oak',
};

const task = {
    name: `Case ${caseId}`,
    multiAttrParams: false,
    advancedConfigurationParams: false,
    forProject: true,
    attachToProject: false,
};

context('Backup, restore a project.', { browser: '!firefox' }, () => {
    const imagesCount = 1;
    const imageFileName = `image_${task.name.replace(' ', '_').toLowerCase()}`;
    const width = 800;
    const height = 800;
    const posX = 10;
    const posY = 10;
    const color = 'gray';
    const archiveName = `${imageFileName}.zip`;
    const archivePath = `cypress/fixtures/${archiveName}`;
    const imagesFolder = `cypress/fixtures/${imageFileName}`;
    const directoryToArchive = imagesFolder;

    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName: project.label,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };

    before(() => {
        cy.visit('/');
        cy.login();
        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, project.label, imagesCount);
        cy.createZipArchive(directoryToArchive, archivePath);
        cy.goToProjectsList();
        cy.createProjects(project.name, project.label, project.attrName, project.attrVaue);
        cy.openProject(project.name);
        getProjectID();
        cy.createAnnotationTask(
            task.name,
            task.label,
            task.attrName,
            task.attrValue,
            archiveName,
            task.multiAttrParams,
            task.advancedConfigurationParams,
            task.forProject,
            task.attachToProject,
            project.name,
        );
        cy.openProject(project.name);
        cy.openTaskJob(task.name);
        cy.createRectangle(createRectangleShape2Points);
        cy.saveJob();
        cy.goToProjectsList();
    });

    after(() => {
        cy.goToProjectsList();
        cy.deleteProject(project.name, projectID);
    });

    describe(`Testing "${caseId}"`, () => {
        it('Export the project.', () => {
            cy.backupProject(project.name);
            cy.getDownloadFileName().then((file) => {
                projectBackupArchiveFullName = file;
                cy.verifyDownload(projectBackupArchiveFullName);
            });
        });

        it('Remove and restore the project from backup.', () => {
            cy.deleteProject(project.name, projectID);
            cy.restoreProject(projectBackupArchiveFullName);
        });

        it('Checking the availability of a project, task, shape.', () => {
            cy.contains('.cvat-projects-project-item-title', project.name).should('exist');
            cy.openProject(project.name);
            getProjectID();
            cy.contains('.cvat-constructor-viewer-item', project.label).should('exist');
            cy.get('.cvat-tasks-list-item').should('have.length', 1);
            cy.openTaskJob(task.name, 0, false);
            cy.get('#cvat_canvas_shape_1').should('exist');
        });
    });
});

context('Backup, restore a project with a 3D task.', { browser: '!firefox' }, () => {
    const archiveName3d = '../../cypress/integration/canvas3d_functionality/assets/test_canvas3d.zip';

    const cuboidCreationParams = {
        labelName: project.label,
        x: 480,
        y: 160,
    };

    before(() => {
        cy.goToProjectsList();
        cy.createProjects(project.name, project.label, project.attrName, project.attrVaue);
        cy.openProject(project.name);
        getProjectID();
        cy.createAnnotationTask(
            task.name,
            task.label,
            task.attrName,
            task.attrValue,
            archiveName3d,
            task.multiAttrParams,
            task.advancedConfigurationParams,
            task.forProject,
            task.attachToProject,
            project.name,
        );
        cy.openProject(project.name);
        cy.openTaskJob(task.name);
        cy.create3DCuboid(cuboidCreationParams);
        cy.saveJob();
        cy.goToProjectsList();
    });

    after(() => {
        cy.goToProjectsList();
        cy.deleteProject(project.name, projectID);
    });

    describe(`Testing "${caseId}"`, () => {
        it('Export the project.', () => {
            cy.backupProject(project.name);
            cy.getDownloadFileName().then((file) => {
                projectBackupArchiveFullName = file;
                cy.verifyDownload(projectBackupArchiveFullName);
            });
        });

        it('Remove and restore the project from backup.', () => {
            cy.deleteProject(project.name, projectID);
            cy.restoreProject(projectBackupArchiveFullName);
        });

        it('Checking the availability of a project, task, shape.', () => {
            cy.contains('.cvat-projects-project-item-title', project.name).should('exist');
            cy.openProject(project.name);
            getProjectID();
            cy.contains('.cvat-constructor-viewer-item', project.label).should('exist');
            cy.get('.cvat-tasks-list-item').should('have.length', 1);
            cy.openTaskJob(task.name, 0, false);
            cy.get('#cvat-objects-sidebar-state-item-1').should('exist');
        });
    });
});

// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

context('Webhooks pipeline.', () => {
    const organizationParams = {
        shortName: 'WebhooksOrg',
        fullName: 'Organization full name. Only for test.',
        description: 'This organization was created to test the functionality.',
        email: 'testorganization@local.local',
        phoneNumber: '+70000000000',
        location: 'Country, State, Address, 000000',
    };
    const orgWebhookParams = {
        targetURL: 'https://localhost:3001/organization',
        description: 'Sample description',
        secret: 'Super secret',
        enableSSL: true,
        isActive: true,
        events: [
            'project', 'job', 'task',
        ],
    };
    const projectWebhookParams = {
        targetURL: 'https://localhost:3001/project',
        description: 'Sample description',
        secret: 'Super secret',
        enableSSL: true,
        isActive: true,
    };
    const newOrganizationWebhookParams = {
        targetURL: 'https://localhost:3001/edited',
        description: 'Edited description',
        secret: 'Super secret',
        enableSSL: true,
        isActive: false,
        events: [
            'job',
        ],
    };

    const project = {
        name: 'Project for webhooks',
        label: 'car',
        attrName: 'color',
        attrVaue: 'red',
        multiAttrParams: false,
    };

    before(() => {
        cy.visit('auth/login');
        cy.login();
        cy.createOrganization(organizationParams);
        cy.visit('/projects');
        cy.createProjects(
            project.name,
            project.label,
            project.attrName,
            project.attrVaue,
            project.multiAttrParams,
        );
    });

    after(() => {
        cy.logout();
        cy.getAuthKey().then((authKey) => {
            cy.deleteProjects(authKey, [project.name]);
            cy.deleteOrganizations(authKey, [organizationParams.shortName]);
        });
    });

    describe('Test organization webhook', () => {
        it('Open the organization. Create/update/delete webhook.', () => {
            cy.openOrganization(organizationParams.shortName);
            cy.openOrganizationWebhooks();
            cy.createWebhook(orgWebhookParams);
            cy.get('.cvat-webhooks-list').within(() => {
                cy.contains(orgWebhookParams.description).should('exist');
                cy.contains(orgWebhookParams.targetURL).should('exist');
            });

            cy.editWebhook(orgWebhookParams.description, newOrganizationWebhookParams);
            cy.get('.cvat-webhooks-list').within(() => {
                cy.contains(newOrganizationWebhookParams.description).should('exist');
                cy.contains(newOrganizationWebhookParams.targetURL).should('exist');
            });

            cy.deleteWebhook(newOrganizationWebhookParams.description);
        });
    });

    describe('Test project webhook', () => {
        it('Open the project. Create webhook.', () => {
            cy.goToProjectsList();
            cy.openProject(project.name);
            cy.openProjectWebhooks();
            cy.createWebhook(projectWebhookParams);
            cy.get('.cvat-webhooks-list').within(() => {
                cy.contains(projectWebhookParams.description).should('exist');
                cy.contains(projectWebhookParams.targetURL).should('exist');
            });
        });
    });
});

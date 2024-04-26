// Copyright (C) 2022-2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

// Setup mock for a server
jest.mock('../../src/server-proxy', () => {
    return {
        __esModule: true,
        default: require('../mocks/server-proxy.mock'),
    };
});

const cvat = require('../../src/api').default;
const Webhook = require('../../src/webhook').default;
const { webhooksDummyData, webhooksEventsDummyData } = require('../mocks/dummy-data.mock.cjs');
const { WebhookSourceType } = require('../../src/enums');

describe('Feature: get webhooks', () => {
    test('get all webhooks', async () => {
        const result = await cvat.webhooks.get({});
        expect(Array.isArray(result)).toBeTruthy();
        expect(result).toHaveLength(webhooksDummyData.count);
        for (const item of result) {
            expect(item).toBeInstanceOf(Webhook);
        }
    });

    test('get webhook events', async () => {
        function checkEvents(events) {
            expect(Array.isArray(result)).toBeTruthy();
            for (const event of events) {
                expect(event).toMatch(/((create)|(update)|(delete)):/);
            }
        }
        let result = await Webhook.availableEvents(WebhookSourceType.PROJECT);
        checkEvents(result);

        result = await Webhook.availableEvents(WebhookSourceType.ORGANIZATION);
        checkEvents(result);
    });

    test('get webhook by id', async () => {
        const result = await cvat.webhooks.get({
            id: 1,
        });
        const [webhook] = result;

        expect(Array.isArray(result)).toBeTruthy();
        expect(result).toHaveLength(1);
        expect(webhook).toBeInstanceOf(Webhook);
        expect(webhook.id).toBe(1);
        expect(webhook.targetURL).toBe('https://localhost:3001/project/hook');
        expect(webhook.description).toBe('Project webhook');
        expect(webhook.contentType).toBe('application/json');
        expect(webhook.enableSSL).toBeTruthy();
        expect(webhook.events).toEqual(webhooksEventsDummyData[WebhookSourceType.PROJECT].events);
    });
});



describe('Feature: create a webhook', () => {
    test('create new webhook', async () => {
        const webhook = new cvat.classes.Webhook({
            description: 'New webhook',
            target_url: 'https://localhost:3001/hook',
            content_type: 'application/json',
            secret: 'secret',
            enable_ssl: true,
            is_active: true,
            events: webhooksEventsDummyData[WebhookSourceType.PROJECT].events,
            project_id: 1,
            type:WebhookSourceType.PROJECT,
        });

        const result = await webhook.save();
        expect(typeof result.id).toBe('number');
    });
});

describe('Feature: update a webhook', () => {
    test('update some webhook fields', async () => {
        const newValues = new Map([
            ['description', 'New description'],
            ['isActive', false],
            ['targetURL', 'https://localhost:3001/new/url'],
        ]);

        let result = await cvat.webhooks.get({
            id: 1,
        });
        let [webhook] = result;
        for (const [key, value] of newValues) {
            webhook[key] = value;
        }
        webhook.save();

        result = await cvat.webhooks.get({
            id: 1,
        });
        [webhook] = result;
        newValues.forEach((value, key) => {
            expect(webhook[key]).toBe(value);
        });
    });
});

describe('Feature: delete a webhook', () => {
    test('delete a webhook', async () => {
        let result = await cvat.webhooks.get({
            id: 2,
        });
        const [webhook] = result;
        await webhook.delete();

        result = await cvat.webhooks.get({
            id: 2,
        });
        expect(Array.isArray(result)).toBeTruthy();
        expect(result).toHaveLength(0);
    });
});

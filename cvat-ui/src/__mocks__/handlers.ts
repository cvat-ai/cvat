// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { http, HttpResponse } from 'msw';

// Mock data for Google Drive Model Registry
export const mockModels = [
    {
        id: 1,
        name: 'yolov8-detection',
        displayName: 'YOLOv8 Object Detection',
        version: '1.0.0',
        driveFolderId: 'folder-id-1',
        driveFileId: 'file-id-1',
        framework: 'PYTORCH',
        modelType: 'DETECTOR',
        description: 'YOLOv8 object detection model',
        labels: ['person', 'car', 'dog'],
        owner: 1,
        createdDate: '2025-01-15T10:00:00Z',
        updatedDate: '2025-01-15T10:00:00Z',
    },
    {
        id: 2,
        name: 'sam-segmentation',
        displayName: 'SAM Segmentation',
        version: '2.1.0',
        driveFolderId: 'folder-id-2',
        driveFileId: 'file-id-2',
        framework: 'PYTORCH',
        modelType: 'INTERACTOR',
        description: 'Segment Anything Model for interactive segmentation',
        labels: [],
        owner: 1,
        createdDate: '2025-01-10T14:30:00Z',
        updatedDate: '2025-01-16T09:15:00Z',
    },
];

// MSW request handlers
export const handlers = [
    // GET /api/models - List all models
    http.get('/api/models', ({ request }) => {
        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get('page') || '1', 10);
        const pageSize = parseInt(url.searchParams.get('page_size') || '10', 10);
        const search = url.searchParams.get('search') || '';
        const framework = url.searchParams.get('framework');
        const modelType = url.searchParams.get('model_type');

        let filteredModels = [...mockModels];

        // Apply search filter
        if (search) {
            filteredModels = filteredModels.filter((model) =>
                model.name.toLowerCase().includes(search.toLowerCase()) ||
                model.displayName.toLowerCase().includes(search.toLowerCase()),
            );
        }

        // Apply framework filter
        if (framework) {
            filteredModels = filteredModels.filter((model) => model.framework === framework);
        }

        // Apply model type filter
        if (modelType) {
            filteredModels = filteredModels.filter((model) => model.modelType === modelType);
        }

        // Pagination
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        const paginatedModels = filteredModels.slice(start, end);

        return HttpResponse.json({
            count: filteredModels.length,
            next: end < filteredModels.length ? `/api/models?page=${page + 1}` : null,
            previous: page > 1 ? `/api/models?page=${page - 1}` : null,
            results: paginatedModels,
        });
    }),

    // GET /api/models/:id - Get model details
    http.get('/api/models/:id', ({ params }) => {
        const { id } = params;
        const model = mockModels.find((m) => m.id === parseInt(id as string, 10));

        if (!model) {
            return new HttpResponse(null, {
                status: 404,
                statusText: 'Not Found',
            });
        }

        return HttpResponse.json(model);
    }),

    // POST /api/models - Create new model
    http.post('/api/models', async ({ request }) => {
        const body = await request.json() as any;

        const newModel = {
            id: mockModels.length + 1,
            ...body,
            owner: 1,
            createdDate: new Date().toISOString(),
            updatedDate: new Date().toISOString(),
        };

        mockModels.push(newModel);

        return HttpResponse.json(newModel, { status: 201 });
    }),

    // PATCH /api/models/:id - Update model
    http.patch('/api/models/:id', async ({ params, request }) => {
        const { id } = params;
        const body = await request.json() as any;
        const modelIndex = mockModels.findIndex((m) => m.id === parseInt(id as string, 10));

        if (modelIndex === -1) {
            return new HttpResponse(null, {
                status: 404,
                statusText: 'Not Found',
            });
        }

        mockModels[modelIndex] = {
            ...mockModels[modelIndex],
            ...body,
            updatedDate: new Date().toISOString(),
        };

        return HttpResponse.json(mockModels[modelIndex]);
    }),

    // DELETE /api/models/:id - Delete model
    http.delete('/api/models/:id', ({ params }) => {
        const { id } = params;
        const modelIndex = mockModels.findIndex((m) => m.id === parseInt(id as string, 10));

        if (modelIndex === -1) {
            return new HttpResponse(null, {
                status: 404,
                statusText: 'Not Found',
            });
        }

        mockModels.splice(modelIndex, 1);

        return new HttpResponse(null, { status: 204 });
    }),

    // POST /api/models/:id/download - Download model
    http.post('/api/models/:id/download', ({ params }) => {
        const { id } = params;
        const model = mockModels.find((m) => m.id === parseInt(id as string, 10));

        if (!model) {
            return new HttpResponse(null, {
                status: 404,
                statusText: 'Not Found',
            });
        }

        return HttpResponse.json({
            downloadUrl: `https://drive.google.com/uc?id=${model.driveFileId}`,
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
        });
    }),

    // GET /api/models/:id/versions - Get model versions
    http.get('/api/models/:id/versions', ({ params }) => {
        const { id } = params;
        const model = mockModels.find((m) => m.id === parseInt(id as string, 10));

        if (!model) {
            return new HttpResponse(null, {
                status: 404,
                statusText: 'Not Found',
            });
        }

        return HttpResponse.json({
            count: 1,
            next: null,
            previous: null,
            results: [
                {
                    id: 1,
                    version: model.version,
                    modelId: model.id,
                    driveFileId: model.driveFileId,
                    createdDate: model.createdDate,
                },
            ],
        });
    }),

    // POST /api/models/sync - Sync models from Google Drive
    http.post('/api/models/sync', () => HttpResponse.json({
        status: 'success',
        synced: 2,
        updated: 1,
        created: 1,
    })),
];

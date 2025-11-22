// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import { AnyAction, Store } from 'redux';

// Configure mock store with middleware
const middlewares = [thunk];
const mockStore = configureStore(middlewares);

// Default initial state for tests
export const defaultMockState = {
    auth: {
        initialized: true,
        fetching: false,
        user: {
            id: 1,
            username: 'testuser',
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            isStaff: false,
            isSuperuser: false,
        },
    },
    models: {
        initialized: false,
        fetching: false,
        models: [],
        current: null,
        count: 0,
        error: null,
    },
    notifications: {
        errors: {
            models: {
                fetching: null,
                creating: null,
                updating: null,
                deleting: null,
                downloading: null,
            },
        },
        messages: {
            models: {
                created: null,
                updated: null,
                deleted: null,
            },
        },
    },
};

interface ExtendedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
    initialState?: any;
    store?: Store<any, AnyAction>;
}

// Custom render function that wraps components with providers
export function renderWithProviders(
    ui: ReactElement,
    {
        initialState = defaultMockState,
        store = mockStore(initialState),
        ...renderOptions
    }: ExtendedRenderOptions = {},
) {
    function Wrapper({ children }: { children: React.ReactNode }) {
        return (
            <Provider store={store}>
                <BrowserRouter>
                    {children}
                </BrowserRouter>
            </Provider>
        );
    }

    return {
        store,
        ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    };
}

// Helper to wait for async updates
export const waitForLoadingToFinish = () =>
    new Promise((resolve) => {
        setTimeout(resolve, 0);
    });

// Helper to create mock file for upload testing
export const createMockFile = (
    name = 'test.json',
    size = 1024,
    type = 'application/json',
): File => {
    const content = JSON.stringify({ test: 'data' });
    const blob = new Blob([content], { type });
    return new File([blob], name, { type });
};

// Helper to create mock model data
export const createMockModel = (overrides = {}) => ({
    id: 1,
    name: 'test-model',
    displayName: 'Test Model',
    version: '1.0.0',
    driveFolderId: 'folder-id-1',
    driveFileId: 'file-id-1',
    framework: 'PYTORCH',
    modelType: 'DETECTOR',
    description: 'Test model description',
    labels: ['person', 'car'],
    owner: 1,
    createdDate: '2025-01-15T10:00:00Z',
    updatedDate: '2025-01-15T10:00:00Z',
    ...overrides,
});

// Helper to verify API call payloads
export const getDispatchedActions = (store: Store) => {
    const mockStoreInstance = store as any;
    return mockStoreInstance.getActions ? mockStoreInstance.getActions() : [];
};

// Helper to clear dispatched actions
export const clearDispatchedActions = (store: Store) => {
    const mockStoreInstance = store as any;
    if (mockStoreInstance.clearActions) {
        mockStoreInstance.clearActions();
    }
};

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

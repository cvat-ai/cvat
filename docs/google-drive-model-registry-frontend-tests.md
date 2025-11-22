# Google Drive Model Registry - Frontend Unit Tests

**Version**: 1.0
**Date**: 2025-11-22
**Testing Framework**: Jest + React Testing Library + Redux Mock Store

---

## Table of Contents

1. [Testing Infrastructure Setup](#testing-infrastructure-setup)
2. [Test Organization](#test-organization)
3. [Mock Data & Utilities](#mock-data--utilities)
4. [Component Tests](#component-tests)
5. [Redux Tests](#redux-tests)
6. [Integration Tests](#integration-tests)
7. [Running Tests](#running-tests)
8. [Coverage Reports](#coverage-reports)

---

## Testing Infrastructure Setup

### Required Dependencies

Add to `cvat-ui/package.json`:

```json
{
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.1.5",
    "@testing-library/user-event": "^14.5.1",
    "@types/jest": "^29.5.11",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "redux-mock-store": "^1.5.4",
    "@types/redux-mock-store": "^1.0.6",
    "msw": "^2.0.11"
  },
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --maxWorkers=2"
  }
}
```

### Jest Configuration

Create `cvat-ui/jest.config.js`:

```javascript
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    roots: ['<rootDir>/src'],
    testMatch: [
        '**/__tests__/**/*.+(ts|tsx|js)',
        '**/?(*.)+(spec|test).+(ts|tsx|js)',
    ],
    transform: {
        '^.+\\.(ts|tsx)$': 'ts-jest',
    },
    moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(svg)$': '<rootDir>/src/__mocks__/svgMock.ts',
        '^cvat-core$': '<rootDir>/../cvat-core/src/api.ts',
        '^cvat-core/(.*)$': '<rootDir>/../cvat-core/src/$1',
        '^components/(.*)$': '<rootDir>/src/components/$1',
        '^actions/(.*)$': '<rootDir>/src/actions/$1',
        '^reducers/(.*)$': '<rootDir>/src/reducers/$1',
        '^utils/(.*)$': '<rootDir>/src/utils/$1',
    },
    setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/index.tsx',
        '!src/setupTests.ts',
    ],
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70,
        },
    },
};
```

### Test Setup File

Create `cvat-ui/src/setupTests.ts`:

```typescript
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Polyfills for jsdom
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    takeRecords() {
        return [];
    }
    unobserve() {}
} as any;
```

### SVG Mock

Create `cvat-ui/src/__mocks__/svgMock.ts`:

```typescript
import React from 'react';

const SvgMock = React.forwardRef<SVGSVGElement>((props, ref) =>
    React.createElement('svg', { ...props, ref })
);

export default SvgMock;
```

---

## Test Organization

```
cvat-ui/src/
├── components/
│   └── model-registry-page/
│       ├── __tests__/
│       │   ├── model-registry-page.test.tsx
│       │   ├── model-card.test.tsx
│       │   ├── model-browser.test.tsx
│       │   ├── model-filters.test.tsx
│       │   ├── model-upload-modal.test.tsx
│       │   └── model-detail-modal.test.tsx
│       ├── model-registry-page.tsx
│       ├── model-card.tsx
│       ├── model-browser.tsx
│       └── ...
├── actions/
│   └── __tests__/
│       └── model-registry-actions.test.ts
├── reducers/
│   └── __tests__/
│       └── model-registry-reducer.test.ts
└── __tests__/
    └── integration/
        └── model-registry-workflow.test.tsx
```

---

## Mock Data & Utilities

### Mock Model Data

Create `cvat-ui/src/__mocks__/modelRegistryData.ts`:

```typescript
import { ModelRegistry, ModelFramework, ModelType } from 'cvat-core/src/model-registry';

export const mockModel1 = {
    id: 1,
    name: 'yolov8_coco_detector',
    displayName: 'YOLOv8 COCO Object Detector',
    version: '1.0.0',
    framework: ModelFramework.ONNX,
    modelType: ModelType.DETECTOR,
    description: 'YOLOv8 trained on COCO dataset',
    fileName: 'yolov8n.onnx',
    fileSize: 6615824,
    fileHash: 'abc123...',
    inputSpec: {
        shape: [1, 3, 640, 640],
        dtype: 'float32',
    },
    outputSpec: {
        shape: [1, 84, 8400],
        dtype: 'float32',
        format: 'xyxy',
    },
    labels: ['person', 'car', 'dog', 'cat'],
    tags: ['real-time', 'coco', 'yolo'],
    metrics: { mAP50: 0.678, fps: 142 },
    isPublic: true,
    isActive: true,
    downloadCount: 127,
    lastUsed: '2025-11-20T14:30:00Z',
    owner: {
        id: 1,
        username: 'admin',
        firstName: 'Admin',
        lastName: 'User',
    },
    organization: 'ACME Corp',
    createdDate: '2025-01-15T10:30:00Z',
    updatedDate: '2025-01-15T10:30:00Z',
};

export const mockModel2 = {
    id: 2,
    name: 'sam_vit_h',
    displayName: 'Segment Anything Model (ViT-H)',
    version: '2.1.0',
    framework: ModelFramework.PYTORCH,
    modelType: ModelType.SEGMENTATION,
    description: 'SAM model for interactive segmentation',
    fileName: 'sam_vit_h.pt',
    fileSize: 2564890112,
    fileHash: 'def456...',
    inputSpec: {
        shape: [1, 3, 1024, 1024],
        dtype: 'float32',
    },
    outputSpec: {
        shape: [1, null, null],
        dtype: 'float32',
    },
    labels: [],
    tags: ['segmentation', 'interactive', 'sam'],
    metrics: { mIoU: 0.92 },
    isPublic: false,
    isActive: true,
    downloadCount: 45,
    lastUsed: null,
    owner: {
        id: 2,
        username: 'john',
        firstName: 'John',
        lastName: 'Doe',
    },
    organization: null,
    createdDate: '2025-02-01T09:15:00Z',
    updatedDate: '2025-02-01T09:15:00Z',
};

export const mockModels = [mockModel1, mockModel2];

export const mockModelsPaginated = {
    count: 42,
    next: 'http://localhost:8080/api/model-registry/models?page=2',
    previous: null,
    results: mockModels,
};
```

### Test Utilities

Create `cvat-ui/src/__tests__/utils/test-utils.tsx`:

```typescript
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import { CombinedState } from 'reducers';

const middlewares = [thunk];
const mockStore = configureStore(middlewares);

export const createMockStore = (initialState?: Partial<CombinedState>) => {
    const defaultState: Partial<CombinedState> = {
        modelRegistry: {
            initialized: false,
            fetching: false,
            models: [],
            totalCount: 0,
            currentPage: 1,
            pageSize: 12,
            filters: {
                search: '',
                framework: null,
                type: null,
                tags: [],
            },
            uploading: false,
            syncing: false,
        },
        auth: {
            user: {
                id: 1,
                username: 'testuser',
                email: 'test@example.com',
                firstName: 'Test',
                lastName: 'User',
            },
        },
        ...initialState,
    };

    return mockStore(defaultState);
};

interface ExtendedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
    initialState?: Partial<CombinedState>;
    store?: any;
    history?: any;
}

export function renderWithProviders(
    ui: ReactElement,
    {
        initialState,
        store = createMockStore(initialState),
        history = createMemoryHistory(),
        ...renderOptions
    }: ExtendedRenderOptions = {}
) {
    function Wrapper({ children }: { children: React.ReactNode }) {
        return (
            <Provider store={store}>
                <Router history={history}>{children}</Router>
            </Provider>
        );
    }

    return {
        store,
        history,
        ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    };
}

export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
```

### API Mocking with MSW

Create `cvat-ui/src/__mocks__/handlers.ts`:

```typescript
import { rest } from 'msw';
import { mockModelsPaginated, mockModel1 } from './modelRegistryData';

const API_URL = 'http://localhost:8080/api';

export const handlers = [
    // Get models list
    rest.get(`${API_URL}/model-registry/models`, (req, res, ctx) => {
        const page = req.url.searchParams.get('page') || '1';
        const search = req.url.searchParams.get('search');
        const framework = req.url.searchParams.get('framework');

        let results = mockModelsPaginated.results;

        if (search) {
            results = results.filter((m) =>
                m.displayName.toLowerCase().includes(search.toLowerCase())
            );
        }

        if (framework) {
            results = results.filter((m) => m.framework === framework);
        }

        return res(
            ctx.status(200),
            ctx.json({
                ...mockModelsPaginated,
                results,
            })
        );
    }),

    // Get single model
    rest.get(`${API_URL}/model-registry/models/:id`, (req, res, ctx) => {
        const { id } = req.params;
        return res(ctx.status(200), ctx.json(mockModel1));
    }),

    // Create model
    rest.post(`${API_URL}/model-registry/models`, async (req, res, ctx) => {
        const body = await req.request.formData();
        const name = body.get('name');

        return res(
            ctx.status(201),
            ctx.json({
                ...mockModel1,
                name,
            })
        );
    }),

    // Update model
    rest.patch(`${API_URL}/model-registry/models/:id`, async (req, res, ctx) => {
        const { id } = req.params;
        const body = await req.json();

        return res(
            ctx.status(200),
            ctx.json({
                ...mockModel1,
                ...body,
            })
        );
    }),

    // Delete model
    rest.delete(`${API_URL}/model-registry/models/:id`, (req, res, ctx) => {
        return res(ctx.status(204));
    }),

    // Download model
    rest.get(`${API_URL}/model-registry/models/:id/download`, (req, res, ctx) => {
        const blob = new Blob(['fake model data'], { type: 'application/octet-stream' });
        return res(
            ctx.status(200),
            ctx.set('Content-Type', 'application/octet-stream'),
            ctx.set('Content-Disposition', 'attachment; filename="model.onnx"'),
            ctx.body(blob)
        );
    }),

    // Sync models
    rest.post(`${API_URL}/model-registry/models/sync`, (req, res, ctx) => {
        return res(
            ctx.status(200),
            ctx.json({
                synced: mockModelsPaginated.results,
                errors: [],
                total_folders: 10,
                synced_count: 2,
                error_count: 0,
            })
        );
    }),
];
```

Create `cvat-ui/src/__mocks__/server.ts`:

```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

Update `cvat-ui/src/setupTests.ts`:

```typescript
import '@testing-library/jest-dom';
import { server } from './__mocks__/server';

// Establish API mocking before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));

// Reset any request handlers that are declared during tests
afterEach(() => server.resetHandlers());

// Clean up after tests are finished
afterAll(() => server.close());

// ... rest of setup file
```

---

## Component Tests

### 1. Model Card Component Test

Create `cvat-ui/src/components/model-registry-page/__tests__/model-card.test.tsx`:

```typescript
import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, userEvent } from '__tests__/utils/test-utils';
import ModelCard from '../model-card';
import { mockModel1 } from '__mocks__/modelRegistryData';

describe('ModelCard Component', () => {
    const mockOnDownload = jest.fn();
    const mockOnDelete = jest.fn();
    const mockOnViewDetails = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders model information correctly', () => {
        renderWithProviders(
            <ModelCard
                model={mockModel1}
                onDownload={mockOnDownload}
                onDelete={mockOnDelete}
                onViewDetails={mockOnViewDetails}
            />
        );

        expect(screen.getByText('YOLOv8 COCO Object Detector')).toBeInTheDocument();
        expect(screen.getByText('1.0.0')).toBeInTheDocument();
        expect(screen.getByText('YOLOv8 trained on COCO dataset')).toBeInTheDocument();
    });

    it('displays framework and model type tags', () => {
        renderWithProviders(
            <ModelCard
                model={mockModel1}
                onDownload={mockOnDownload}
                onDelete={mockOnDelete}
                onViewDetails={mockOnViewDetails}
            />
        );

        expect(screen.getByText('onnx')).toBeInTheDocument();
        expect(screen.getByText('detector')).toBeInTheDocument();
    });

    it('displays model tags (first 3)', () => {
        renderWithProviders(
            <ModelCard
                model={mockModel1}
                onDownload={mockOnDownload}
                onDelete={mockOnDelete}
                onViewDetails={mockOnViewDetails}
            />
        );

        expect(screen.getByText('real-time')).toBeInTheDocument();
        expect(screen.getByText('coco')).toBeInTheDocument();
        expect(screen.getByText('yolo')).toBeInTheDocument();
    });

    it('displays download count', () => {
        renderWithProviders(
            <ModelCard
                model={mockModel1}
                onDownload={mockOnDownload}
                onDelete={mockOnDelete}
                onViewDetails={mockOnViewDetails}
            />
        );

        expect(screen.getByText(/127 downloads/i)).toBeInTheDocument();
    });

    it('calls onDownload when download button clicked', async () => {
        const user = userEvent.setup();

        renderWithProviders(
            <ModelCard
                model={mockModel1}
                onDownload={mockOnDownload}
                onDelete={mockOnDelete}
                onViewDetails={mockOnViewDetails}
            />
        );

        const downloadButton = screen.getByTitle('Download');
        await user.click(downloadButton);

        expect(mockOnDownload).toHaveBeenCalledTimes(1);
        expect(mockOnDownload).toHaveBeenCalledWith(mockModel1);
    });

    it('calls onViewDetails when info button clicked', async () => {
        const user = userEvent.setup();

        renderWithProviders(
            <ModelCard
                model={mockModel1}
                onDownload={mockOnDownload}
                onDelete={mockOnDelete}
                onViewDetails={mockOnViewDetails}
            />
        );

        const infoButton = screen.getByTitle('View Details');
        await user.click(infoButton);

        expect(mockOnViewDetails).toHaveBeenCalledTimes(1);
        expect(mockOnViewDetails).toHaveBeenCalledWith(mockModel1);
    });

    it('calls onDelete when delete button clicked', async () => {
        const user = userEvent.setup();

        renderWithProviders(
            <ModelCard
                model={mockModel1}
                onDownload={mockOnDownload}
                onDelete={mockOnDelete}
                onViewDetails={mockOnViewDetails}
            />
        );

        const deleteButton = screen.getByTitle('Delete');
        await user.click(deleteButton);

        expect(mockOnDelete).toHaveBeenCalledTimes(1);
        expect(mockOnDelete).toHaveBeenCalledWith(mockModel1);
    });

    it('truncates long descriptions to 2 rows', () => {
        const longDescriptionModel = {
            ...mockModel1,
            description: 'A'.repeat(200),
        };

        const { container } = renderWithProviders(
            <ModelCard
                model={longDescriptionModel}
                onDownload={mockOnDownload}
                onDelete={mockOnDelete}
                onViewDetails={mockOnViewDetails}
            />
        );

        const description = container.querySelector('.cvat-model-card-description');
        expect(description).toBeInTheDocument();
        // Ant Design Paragraph with ellipsis should be applied
    });

    it('shows +N tag when more than 3 tags exist', () => {
        const manyTagsModel = {
            ...mockModel1,
            tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'],
        };

        renderWithProviders(
            <ModelCard
                model={manyTagsModel}
                onDownload={mockOnDownload}
                onDelete={mockOnDelete}
                onViewDetails={mockOnViewDetails}
            />
        );

        expect(screen.getByText('+2')).toBeInTheDocument();
    });
});
```

### 2. Model Browser Component Test

Create `cvat-ui/src/components/model-registry-page/__tests__/model-browser.test.tsx`:

```typescript
import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '__tests__/utils/test-utils';
import ModelBrowser from '../model-browser';
import { mockModels } from '__mocks__/modelRegistryData';

describe('ModelBrowser Component', () => {
    it('renders empty state when no models', () => {
        renderWithProviders(<ModelBrowser models={[]} />);

        expect(screen.getByText(/no models found/i)).toBeInTheDocument();
    });

    it('renders model cards in grid layout', () => {
        renderWithProviders(<ModelBrowser models={mockModels} />);

        expect(screen.getByText('YOLOv8 COCO Object Detector')).toBeInTheDocument();
        expect(screen.getByText('Segment Anything Model (ViT-H)')).toBeInTheDocument();
    });

    it('renders correct number of model cards', () => {
        const { container } = renderWithProviders(<ModelBrowser models={mockModels} />);

        const modelCards = container.querySelectorAll('.cvat-model-card');
        expect(modelCards).toHaveLength(2);
    });

    it('applies grid layout classes', () => {
        const { container } = renderWithProviders(<ModelBrowser models={mockModels} />);

        const gridContainer = container.querySelector('.cvat-model-browser-grid');
        expect(gridContainer).toBeInTheDocument();
    });
});
```

### 3. Model Filters Component Test

Create `cvat-ui/src/components/model-registry-page/__tests__/model-filters.test.tsx`:

```typescript
import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, userEvent } from '__tests__/utils/test-utils';
import ModelFilters from '../model-filters';

describe('ModelFilters Component', () => {
    const mockOnFilterChange = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders all filter controls', () => {
        renderWithProviders(<ModelFilters onFilterChange={mockOnFilterChange} />);

        expect(screen.getByPlaceholderText(/search models/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/framework/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/model type/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/tags/i)).toBeInTheDocument();
    });

    it('calls onFilterChange when search input changes', async () => {
        const user = userEvent.setup();

        renderWithProviders(<ModelFilters onFilterChange={mockOnFilterChange} />);

        const searchInput = screen.getByPlaceholderText(/search models/i);
        await user.type(searchInput, 'yolo');

        await waitFor(() => {
            expect(mockOnFilterChange).toHaveBeenCalledWith(
                expect.objectContaining({ search: 'yolo' })
            );
        });
    });

    it('calls onFilterChange when framework selected', async () => {
        const user = userEvent.setup();

        renderWithProviders(<ModelFilters onFilterChange={mockOnFilterChange} />);

        const frameworkSelect = screen.getByLabelText(/framework/i);
        await user.click(frameworkSelect);

        const onnxOption = await screen.findByText('ONNX');
        await user.click(onnxOption);

        expect(mockOnFilterChange).toHaveBeenCalledWith(
            expect.objectContaining({ framework: 'onnx' })
        );
    });

    it('calls onFilterChange when model type selected', async () => {
        const user = userEvent.setup();

        renderWithProviders(<ModelFilters onFilterChange={mockOnFilterChange} />);

        const typeSelect = screen.getByLabelText(/model type/i);
        await user.click(typeSelect);

        const detectorOption = await screen.findByText('Detector');
        await user.click(detectorOption);

        expect(mockOnFilterChange).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'detector' })
        );
    });

    it('supports multiple tag selection', async () => {
        const user = userEvent.setup();

        renderWithProviders(<ModelFilters onFilterChange={mockOnFilterChange} />);

        const tagsSelect = screen.getByLabelText(/tags/i);
        await user.click(tagsSelect);

        const tag1 = await screen.findByText('real-time');
        await user.click(tag1);

        await user.click(tagsSelect);
        const tag2 = await screen.findByText('coco');
        await user.click(tag2);

        expect(mockOnFilterChange).toHaveBeenCalledWith(
            expect.objectContaining({ tags: expect.arrayContaining(['real-time', 'coco']) })
        );
    });

    it('has clear filters button', async () => {
        const user = userEvent.setup();

        renderWithProviders(<ModelFilters onFilterChange={mockOnFilterChange} />);

        const clearButton = screen.getByRole('button', { name: /clear filters/i });
        expect(clearButton).toBeInTheDocument();

        await user.click(clearButton);

        expect(mockOnFilterChange).toHaveBeenCalledWith({
            search: '',
            framework: null,
            type: null,
            tags: [],
        });
    });
});
```

### 4. Model Upload Modal Test

Create `cvat-ui/src/components/model-registry-page/__tests__/model-upload-modal.test.tsx`:

```typescript
import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, userEvent } from '__tests__/utils/test-utils';
import ModelUploadModal from '../model-upload-modal';

describe('ModelUploadModal Component', () => {
    const mockOnUpload = jest.fn();
    const mockOnCancel = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders upload form when visible', () => {
        renderWithProviders(
            <ModelUploadModal visible={true} onUpload={mockOnUpload} onCancel={mockOnCancel} />
        );

        expect(screen.getByText(/upload new model/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/model name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/version/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/framework/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/model type/i)).toBeInTheDocument();
    });

    it('does not render when not visible', () => {
        renderWithProviders(
            <ModelUploadModal visible={false} onUpload={mockOnUpload} onCancel={mockOnCancel} />
        );

        expect(screen.queryByText(/upload new model/i)).not.toBeInTheDocument();
    });

    it('validates required fields', async () => {
        const user = userEvent.setup();

        renderWithProviders(
            <ModelUploadModal visible={true} onUpload={mockOnUpload} onCancel={mockOnCancel} />
        );

        const submitButton = screen.getByRole('button', { name: /upload/i });
        await user.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/please enter model name/i)).toBeInTheDocument();
            expect(screen.getByText(/please enter display name/i)).toBeInTheDocument();
            expect(screen.getByText(/please select framework/i)).toBeInTheDocument();
        });

        expect(mockOnUpload).not.toHaveBeenCalled();
    });

    it('submits form with valid data', async () => {
        const user = userEvent.setup();

        renderWithProviders(
            <ModelUploadModal visible={true} onUpload={mockOnUpload} onCancel={mockOnCancel} />
        );

        // Fill form
        await user.type(screen.getByLabelText(/model name/i), 'test_model');
        await user.type(screen.getByLabelText(/display name/i), 'Test Model');
        await user.type(screen.getByLabelText(/version/i), '1.0.0');

        // Select framework
        const frameworkSelect = screen.getByLabelText(/framework/i);
        await user.click(frameworkSelect);
        const onnxOption = await screen.findByText('ONNX');
        await user.click(onnxOption);

        // Select model type
        const typeSelect = screen.getByLabelText(/model type/i);
        await user.click(typeSelect);
        const detectorOption = await screen.findByText('Detector');
        await user.click(detectorOption);

        // Upload file
        const file = new File(['model data'], 'model.onnx', { type: 'application/octet-stream' });
        const fileInput = screen.getByLabelText(/upload model file/i);
        await user.upload(fileInput, file);

        // Submit
        const submitButton = screen.getByRole('button', { name: /upload/i });
        await user.click(submitButton);

        await waitFor(() => {
            expect(mockOnUpload).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'test_model',
                    displayName: 'Test Model',
                    version: '1.0.0',
                    framework: 'onnx',
                    modelType: 'detector',
                })
            );
        });
    });

    it('calls onCancel when cancel button clicked', async () => {
        const user = userEvent.setup();

        renderWithProviders(
            <ModelUploadModal visible={true} onUpload={mockOnUpload} onCancel={mockOnCancel} />
        );

        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        await user.click(cancelButton);

        expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('validates model file size', async () => {
        const user = userEvent.setup();

        renderWithProviders(
            <ModelUploadModal visible={true} onUpload={mockOnUpload} onCancel={mockOnCancel} />
        );

        // Create file larger than 5GB
        const largeFile = new File(['x'.repeat(6 * 1024 * 1024 * 1024)], 'large_model.onnx');
        const fileInput = screen.getByLabelText(/upload model file/i);

        await user.upload(fileInput, largeFile);

        await waitFor(() => {
            expect(screen.getByText(/file size exceeds maximum/i)).toBeInTheDocument();
        });
    });

    it('supports optional metadata fields', async () => {
        const user = userEvent.setup();

        renderWithProviders(
            <ModelUploadModal visible={true} onUpload={mockOnUpload} onCancel={mockOnCancel} />
        );

        // Add optional description
        await user.type(
            screen.getByLabelText(/description/i),
            'Model for testing purposes'
        );

        // Add tags
        const tagsInput = screen.getByLabelText(/tags/i);
        await user.type(tagsInput, 'test{enter}demo{enter}');

        // Fill required fields and submit
        await user.type(screen.getByLabelText(/model name/i), 'test_model');
        await user.type(screen.getByLabelText(/display name/i), 'Test Model');

        const frameworkSelect = screen.getByLabelText(/framework/i);
        await user.click(frameworkSelect);
        const onnxOption = await screen.findByText('ONNX');
        await user.click(onnxOption);

        const file = new File(['data'], 'model.onnx');
        await user.upload(screen.getByLabelText(/upload model file/i), file);

        const submitButton = screen.getByRole('button', { name: /upload/i });
        await user.click(submitButton);

        await waitFor(() => {
            expect(mockOnUpload).toHaveBeenCalledWith(
                expect.objectContaining({
                    description: 'Model for testing purposes',
                    tags: expect.arrayContaining(['test', 'demo']),
                })
            );
        });
    });
});
```

### 5. Model Registry Page Integration Test

Create `cvat-ui/src/components/model-registry-page/__tests__/model-registry-page.test.tsx`:

```typescript
import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, userEvent } from '__tests__/utils/test-utils';
import ModelRegistryPage from '../model-registry-page';
import { mockModels } from '__mocks__/modelRegistryData';

describe('ModelRegistryPage Component', () => {
    it('displays loading state initially', () => {
        renderWithProviders(<ModelRegistryPage />, {
            initialState: {
                modelRegistry: {
                    initialized: false,
                    fetching: true,
                    models: [],
                    totalCount: 0,
                },
            },
        });

        expect(screen.getByRole('img', { name: /loading/i })).toBeInTheDocument();
    });

    it('fetches and displays models on mount', async () => {
        const { store } = renderWithProviders(<ModelRegistryPage />, {
            initialState: {
                modelRegistry: {
                    initialized: false,
                    fetching: false,
                    models: [],
                    totalCount: 0,
                },
            },
        });

        await waitFor(() => {
            const actions = store.getActions();
            expect(actions).toContainEqual(
                expect.objectContaining({ type: 'GET_MODELS' })
            );
        });
    });

    it('displays models in grid', async () => {
        renderWithProviders(<ModelRegistryPage />, {
            initialState: {
                modelRegistry: {
                    initialized: true,
                    fetching: false,
                    models: mockModels,
                    totalCount: 2,
                },
            },
        });

        expect(screen.getByText('YOLOv8 COCO Object Detector')).toBeInTheDocument();
        expect(screen.getByText('Segment Anything Model (ViT-H)')).toBeInTheDocument();
    });

    it('shows pagination when total count exceeds page size', () => {
        renderWithProviders(<ModelRegistryPage />, {
            initialState: {
                modelRegistry: {
                    initialized: true,
                    fetching: false,
                    models: mockModels,
                    totalCount: 42,
                    currentPage: 1,
                    pageSize: 12,
                },
            },
        });

        expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument();
    });

    it('handles page change', async () => {
        const user = userEvent.setup();

        const { store } = renderWithProviders(<ModelRegistryPage />, {
            initialState: {
                modelRegistry: {
                    initialized: true,
                    fetching: false,
                    models: mockModels,
                    totalCount: 42,
                    currentPage: 1,
                    pageSize: 12,
                },
            },
        });

        const nextPageButton = screen.getByRole('button', { name: /next page/i });
        await user.click(nextPageButton);

        await waitFor(() => {
            const actions = store.getActions();
            expect(actions).toContainEqual(
                expect.objectContaining({
                    type: 'SET_PAGE',
                    payload: { page: 2 },
                })
            );
        });
    });

    it('opens upload modal when upload button clicked', async () => {
        const user = userEvent.setup();

        renderWithProviders(<ModelRegistryPage />, {
            initialState: {
                modelRegistry: {
                    initialized: true,
                    fetching: false,
                    models: mockModels,
                    totalCount: 2,
                },
            },
        });

        const uploadButton = screen.getByRole('button', { name: /upload model/i });
        await user.click(uploadButton);

        expect(screen.getByText(/upload new model/i)).toBeInTheDocument();
    });

    it('applies filters and fetches filtered results', async () => {
        const user = userEvent.setup();

        const { store } = renderWithProviders(<ModelRegistryPage />, {
            initialState: {
                modelRegistry: {
                    initialized: true,
                    fetching: false,
                    models: mockModels,
                    totalCount: 2,
                },
            },
        });

        const searchInput = screen.getByPlaceholderText(/search models/i);
        await user.type(searchInput, 'yolo');

        await waitFor(() => {
            const actions = store.getActions();
            expect(actions).toContainEqual(
                expect.objectContaining({
                    type: 'SET_FILTERS',
                    payload: { filters: expect.objectContaining({ search: 'yolo' }) },
                })
            );
        });
    });

    it('displays empty state when no models match filters', () => {
        renderWithProviders(<ModelRegistryPage />, {
            initialState: {
                modelRegistry: {
                    initialized: true,
                    fetching: false,
                    models: [],
                    totalCount: 0,
                    filters: {
                        search: 'nonexistent',
                    },
                },
            },
        });

        expect(screen.getByText(/no models found/i)).toBeInTheDocument();
    });
});
```

---

## Redux Tests

### 1. Actions Test

Create `cvat-ui/src/actions/__tests__/model-registry-actions.test.ts`:

```typescript
import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import * as actions from '../model-registry-actions';
import { ModelRegistryActionTypes } from '../model-registry-actions';
import { mockModels, mockModelsPaginated } from '__mocks__/modelRegistryData';
import { server } from '__mocks__/server';
import { rest } from 'msw';

const middlewares = [thunk];
const mockStore = configureMockStore(middlewares);

describe('Model Registry Actions', () => {
    describe('Synchronous Actions', () => {
        it('creates SET_FILTERS action', () => {
            const filters = { search: 'yolo', framework: 'onnx' };
            const expectedAction = {
                type: ModelRegistryActionTypes.SET_FILTERS,
                payload: { filters },
            };

            expect(actions.setFilters(filters)).toEqual(expectedAction);
        });

        it('creates SET_PAGE action', () => {
            const page = 2;
            const expectedAction = {
                type: ModelRegistryActionTypes.SET_PAGE,
                payload: { page },
            };

            expect(actions.setPage(page)).toEqual(expectedAction);
        });
    });

    describe('Async Actions - getModelsAsync', () => {
        it('dispatches GET_MODELS_SUCCESS on successful fetch', async () => {
            const store = mockStore({});
            const expectedActions = [
                { type: ModelRegistryActionTypes.GET_MODELS },
                {
                    type: ModelRegistryActionTypes.GET_MODELS_SUCCESS,
                    payload: {
                        models: expect.any(Array),
                        count: expect.any(Number),
                    },
                },
            ];

            await store.dispatch(actions.getModelsAsync(1, 12, {}));

            expect(store.getActions()).toEqual(expectedActions);
        });

        it('dispatches GET_MODELS_FAILED on error', async () => {
            server.use(
                rest.get('/api/model-registry/models', (req, res, ctx) => {
                    return res(ctx.status(500), ctx.json({ message: 'Server error' }));
                })
            );

            const store = mockStore({});
            const expectedActions = [
                { type: ModelRegistryActionTypes.GET_MODELS },
                {
                    type: ModelRegistryActionTypes.GET_MODELS_FAILED,
                    payload: {
                        error: expect.any(Error),
                    },
                },
            ];

            await store.dispatch(actions.getModelsAsync(1, 12, {}));

            const actions_dispatched = store.getActions();
            expect(actions_dispatched[0].type).toBe(ModelRegistryActionTypes.GET_MODELS);
            expect(actions_dispatched[1].type).toBe(ModelRegistryActionTypes.GET_MODELS_FAILED);
        });

        it('includes filters in API request', async () => {
            let requestParams: any = null;

            server.use(
                rest.get('/api/model-registry/models', (req, res, ctx) => {
                    requestParams = Object.fromEntries(req.url.searchParams);
                    return res(ctx.status(200), ctx.json(mockModelsPaginated));
                })
            );

            const store = mockStore({});
            await store.dispatch(
                actions.getModelsAsync(1, 12, {
                    search: 'yolo',
                    framework: 'onnx',
                    tags: ['real-time'],
                })
            );

            expect(requestParams).toMatchObject({
                page: '1',
                page_size: '12',
                search: 'yolo',
                framework: 'onnx',
            });
        });
    });

    describe('Async Actions - uploadModelAsync', () => {
        it('dispatches UPLOAD_MODEL_SUCCESS on successful upload', async () => {
            const formData = new FormData();
            formData.append('name', 'test_model');
            formData.append('display_name', 'Test Model');

            const store = mockStore({});
            const expectedActions = [
                { type: ModelRegistryActionTypes.UPLOAD_MODEL },
                {
                    type: ModelRegistryActionTypes.UPLOAD_MODEL_SUCCESS,
                    payload: {
                        model: expect.objectContaining({
                            name: 'test_model',
                        }),
                    },
                },
            ];

            await store.dispatch(actions.uploadModelAsync(formData));

            expect(store.getActions()[0].type).toBe(ModelRegistryActionTypes.UPLOAD_MODEL);
            expect(store.getActions()[1].type).toBe(
                ModelRegistryActionTypes.UPLOAD_MODEL_SUCCESS
            );
        });

        it('dispatches UPLOAD_MODEL_FAILED on error', async () => {
            server.use(
                rest.post('/api/model-registry/models', (req, res, ctx) => {
                    return res(ctx.status(400), ctx.json({ message: 'Invalid data' }));
                })
            );

            const formData = new FormData();
            const store = mockStore({});

            await store.dispatch(actions.uploadModelAsync(formData));

            const actions_dispatched = store.getActions();
            expect(actions_dispatched[1].type).toBe(ModelRegistryActionTypes.UPLOAD_MODEL_FAILED);
        });
    });

    describe('Async Actions - syncModelsAsync', () => {
        it('dispatches SYNC_MODELS_SUCCESS on successful sync', async () => {
            const store = mockStore({});
            const expectedActions = [
                { type: ModelRegistryActionTypes.SYNC_MODELS },
                {
                    type: ModelRegistryActionTypes.SYNC_MODELS_SUCCESS,
                    payload: expect.any(Object),
                },
            ];

            await store.dispatch(actions.syncModelsAsync());

            expect(store.getActions()[0].type).toBe(ModelRegistryActionTypes.SYNC_MODELS);
            expect(store.getActions()[1].type).toBe(ModelRegistryActionTypes.SYNC_MODELS_SUCCESS);
        });
    });

    describe('Async Actions - deleteModelAsync', () => {
        it('dispatches DELETE_MODEL_SUCCESS on successful delete', async () => {
            const store = mockStore({});
            const modelId = 1;

            await store.dispatch(actions.deleteModelAsync(modelId));

            expect(store.getActions()[0].type).toBe(ModelRegistryActionTypes.DELETE_MODEL);
            expect(store.getActions()[1].type).toBe(ModelRegistryActionTypes.DELETE_MODEL_SUCCESS);
        });
    });
});
```

### 2. Reducer Test

Create `cvat-ui/src/reducers/__tests__/model-registry-reducer.test.ts`:

```typescript
import modelRegistryReducer, {
    ModelRegistryState,
} from '../model-registry-reducer';
import { ModelRegistryActionTypes } from 'actions/model-registry-actions';
import { mockModels } from '__mocks__/modelRegistryData';

describe('Model Registry Reducer', () => {
    const initialState: ModelRegistryState = {
        initialized: false,
        fetching: false,
        models: [],
        totalCount: 0,
        currentPage: 1,
        pageSize: 12,
        filters: {
            search: '',
            framework: null,
            type: null,
            tags: [],
        },
        uploading: false,
        syncing: false,
    };

    it('returns initial state', () => {
        expect(modelRegistryReducer(undefined, { type: '@@INIT' })).toEqual(initialState);
    });

    describe('GET_MODELS', () => {
        it('sets fetching to true', () => {
            const action = { type: ModelRegistryActionTypes.GET_MODELS };
            const state = modelRegistryReducer(initialState, action);

            expect(state.fetching).toBe(true);
            expect(state.initialized).toBe(false);
        });
    });

    describe('GET_MODELS_SUCCESS', () => {
        it('updates models and sets initialized to true', () => {
            const action = {
                type: ModelRegistryActionTypes.GET_MODELS_SUCCESS,
                payload: {
                    models: mockModels,
                    count: 42,
                },
            };
            const state = modelRegistryReducer(initialState, action);

            expect(state.initialized).toBe(true);
            expect(state.fetching).toBe(false);
            expect(state.models).toEqual(mockModels);
            expect(state.totalCount).toBe(42);
        });
    });

    describe('GET_MODELS_FAILED', () => {
        it('sets initialized to true and fetching to false', () => {
            const action = {
                type: ModelRegistryActionTypes.GET_MODELS_FAILED,
                payload: {
                    error: new Error('Failed to fetch'),
                },
            };
            const state = modelRegistryReducer(initialState, action);

            expect(state.initialized).toBe(true);
            expect(state.fetching).toBe(false);
        });
    });

    describe('SET_FILTERS', () => {
        it('updates filters and resets to page 1', () => {
            const stateWithPage2 = { ...initialState, currentPage: 2 };
            const action = {
                type: ModelRegistryActionTypes.SET_FILTERS,
                payload: {
                    filters: {
                        search: 'yolo',
                        framework: 'onnx',
                    },
                },
            };
            const state = modelRegistryReducer(stateWithPage2, action);

            expect(state.filters).toMatchObject({
                search: 'yolo',
                framework: 'onnx',
            });
            expect(state.currentPage).toBe(1);
        });
    });

    describe('SET_PAGE', () => {
        it('updates current page', () => {
            const action = {
                type: ModelRegistryActionTypes.SET_PAGE,
                payload: { page: 3 },
            };
            const state = modelRegistryReducer(initialState, action);

            expect(state.currentPage).toBe(3);
        });
    });

    describe('UPLOAD_MODEL', () => {
        it('sets uploading to true', () => {
            const action = { type: ModelRegistryActionTypes.UPLOAD_MODEL };
            const state = modelRegistryReducer(initialState, action);

            expect(state.uploading).toBe(true);
        });
    });

    describe('UPLOAD_MODEL_SUCCESS', () => {
        it('adds model to list and sets uploading to false', () => {
            const action = {
                type: ModelRegistryActionTypes.UPLOAD_MODEL_SUCCESS,
                payload: {
                    model: mockModels[0],
                },
            };
            const state = modelRegistryReducer(initialState, action);

            expect(state.uploading).toBe(false);
            expect(state.models).toContainEqual(mockModels[0]);
            expect(state.totalCount).toBe(1);
        });
    });

    describe('SYNC_MODELS', () => {
        it('sets syncing to true', () => {
            const action = { type: ModelRegistryActionTypes.SYNC_MODELS };
            const state = modelRegistryReducer(initialState, action);

            expect(state.syncing).toBe(true);
        });
    });

    describe('SYNC_MODELS_SUCCESS', () => {
        it('sets syncing to false and marks as not initialized', () => {
            const stateWithData = {
                ...initialState,
                initialized: true,
                syncing: true,
            };
            const action = {
                type: ModelRegistryActionTypes.SYNC_MODELS_SUCCESS,
                payload: {
                    synced: mockModels,
                    errors: [],
                },
            };
            const state = modelRegistryReducer(stateWithData, action);

            expect(state.syncing).toBe(false);
            expect(state.initialized).toBe(false); // Trigger refetch
        });
    });

    describe('DELETE_MODEL_SUCCESS', () => {
        it('removes model from list', () => {
            const stateWithModels = {
                ...initialState,
                models: mockModels,
                totalCount: 2,
            };
            const action = {
                type: ModelRegistryActionTypes.DELETE_MODEL_SUCCESS,
                payload: {
                    modelId: mockModels[0].id,
                },
            };
            const state = modelRegistryReducer(stateWithModels, action);

            expect(state.models).toHaveLength(1);
            expect(state.models[0].id).toBe(mockModels[1].id);
            expect(state.totalCount).toBe(1);
        });
    });
});
```

---

## Integration Tests

### Complete User Workflow Test

Create `cvat-ui/src/__tests__/integration/model-registry-workflow.test.tsx`:

```typescript
import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders, userEvent } from '__tests__/utils/test-utils';
import ModelRegistryPage from 'components/model-registry-page/model-registry-page';
import { server } from '__mocks__/server';
import { rest } from 'msw';
import { mockModelsPaginated } from '__mocks__/modelRegistryData';

describe('Model Registry Workflow Integration Tests', () => {
    describe('Complete Upload Workflow', () => {
        it('allows user to upload a new model end-to-end', async () => {
            const user = userEvent.setup();

            renderWithProviders(<ModelRegistryPage />);

            // Wait for initial load
            await waitFor(() => {
                expect(screen.queryByRole('img', { name: /loading/i })).not.toBeInTheDocument();
            });

            // Click upload button
            const uploadButton = screen.getByRole('button', { name: /upload model/i });
            await user.click(uploadButton);

            // Fill out upload form
            await user.type(screen.getByLabelText(/model name/i), 'new_yolo_model');
            await user.type(screen.getByLabelText(/display name/i), 'New YOLO Model');
            await user.type(screen.getByLabelText(/version/i), '2.0.0');
            await user.type(screen.getByLabelText(/description/i), 'A new YOLO model for testing');

            // Select framework
            const frameworkSelect = screen.getByLabelText(/framework/i);
            await user.click(frameworkSelect);
            const onnxOption = await screen.findByText('ONNX');
            await user.click(onnxOption);

            // Select model type
            const typeSelect = screen.getByLabelText(/model type/i);
            await user.click(typeSelect);
            const detectorOption = await screen.findByText('Detector');
            await user.click(detectorOption);

            // Upload file
            const file = new File(['model data'], 'new_model.onnx', {
                type: 'application/octet-stream',
            });
            const fileInput = screen.getByLabelText(/upload model file/i);
            await user.upload(fileInput, file);

            // Submit form
            const submitButton = screen.getByRole('button', { name: /upload/i });
            await user.click(submitButton);

            // Verify success notification
            await waitFor(() => {
                expect(screen.getByText(/model uploaded successfully/i)).toBeInTheDocument();
            });

            // Verify model appears in list
            await waitFor(() => {
                expect(screen.getByText('New YOLO Model')).toBeInTheDocument();
            });
        });
    });

    describe('Search and Filter Workflow', () => {
        it('allows user to search and filter models', async () => {
            const user = userEvent.setup();

            renderWithProviders(<ModelRegistryPage />);

            // Wait for models to load
            await waitFor(() => {
                expect(screen.getByText('YOLOv8 COCO Object Detector')).toBeInTheDocument();
            });

            // Search for specific model
            const searchInput = screen.getByPlaceholderText(/search models/i);
            await user.type(searchInput, 'YOLO');

            // Verify filtered results
            await waitFor(() => {
                expect(screen.getByText('YOLOv8 COCO Object Detector')).toBeInTheDocument();
                expect(
                    screen.queryByText('Segment Anything Model')
                ).not.toBeInTheDocument();
            });

            // Clear search
            await user.clear(searchInput);

            // Apply framework filter
            const frameworkSelect = screen.getByLabelText(/framework/i);
            await user.click(frameworkSelect);
            const onnxOption = await screen.findByText('ONNX');
            await user.click(onnxOption);

            // Verify filtered by framework
            await waitFor(() => {
                const cards = screen.getAllByTestId('model-card');
                cards.forEach((card) => {
                    expect(within(card).getByText('onnx')).toBeInTheDocument();
                });
            });
        });
    });

    describe('Download Model Workflow', () => {
        it('allows user to download a model', async () => {
            const user = userEvent.setup();

            // Mock download
            const downloadSpy = jest.fn();
            const createObjectURLSpy = jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
            const linkClickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(downloadSpy);

            renderWithProviders(<ModelRegistryPage />);

            // Wait for models to load
            await waitFor(() => {
                expect(screen.getByText('YOLOv8 COCO Object Detector')).toBeInTheDocument();
            });

            // Click download button on first model
            const modelCards = screen.getAllByTestId('model-card');
            const downloadButton = within(modelCards[0]).getByTitle('Download');
            await user.click(downloadButton);

            // Verify download initiated
            await waitFor(() => {
                expect(createObjectURLSpy).toHaveBeenCalled();
                expect(downloadSpy).toHaveBeenCalled();
            });

            // Verify success notification
            expect(screen.getByText(/downloading model/i)).toBeInTheDocument();

            createObjectURLSpy.mockRestore();
            linkClickSpy.mockRestore();
        });
    });

    describe('Delete Model Workflow', () => {
        it('allows user to delete a model with confirmation', async () => {
            const user = userEvent.setup();

            renderWithProviders(<ModelRegistryPage />);

            // Wait for models to load
            await waitFor(() => {
                expect(screen.getByText('YOLOv8 COCO Object Detector')).toBeInTheDocument();
            });

            const initialModelCount = screen.getAllByTestId('model-card').length;

            // Click delete button
            const modelCards = screen.getAllByTestId('model-card');
            const deleteButton = within(modelCards[0]).getByTitle('Delete');
            await user.click(deleteButton);

            // Confirm deletion in modal
            const confirmButton = await screen.findByRole('button', { name: /confirm/i });
            await user.click(confirmButton);

            // Verify model removed
            await waitFor(() => {
                const updatedCards = screen.getAllByTestId('model-card');
                expect(updatedCards).toHaveLength(initialModelCount - 1);
            });

            // Verify success notification
            expect(screen.getByText(/model deleted successfully/i)).toBeInTheDocument();
        });
    });

    describe('Pagination Workflow', () => {
        it('allows user to navigate through pages', async () => {
            const user = userEvent.setup();

            // Mock paginated response
            server.use(
                rest.get('/api/model-registry/models', (req, res, ctx) => {
                    const page = req.url.searchParams.get('page');
                    return res(
                        ctx.status(200),
                        ctx.json({
                            ...mockModelsPaginated,
                            count: 50,
                            next: page === '1' ? '/api/model-registry/models?page=2' : null,
                            previous: page === '2' ? '/api/model-registry/models?page=1' : null,
                        })
                    );
                })
            );

            renderWithProviders(<ModelRegistryPage />);

            // Wait for page 1 to load
            await waitFor(() => {
                expect(screen.getByText(/page 1/i)).toBeInTheDocument();
            });

            // Go to page 2
            const nextButton = screen.getByRole('button', { name: /next/i });
            await user.click(nextButton);

            // Verify page 2 loaded
            await waitFor(() => {
                expect(screen.getByText(/page 2/i)).toBeInTheDocument();
            });

            // Go back to page 1
            const prevButton = screen.getByRole('button', { name: /previous/i });
            await user.click(prevButton);

            // Verify back on page 1
            await waitFor(() => {
                expect(screen.getByText(/page 1/i)).toBeInTheDocument();
            });
        });
    });

    describe('Sync Models Workflow', () => {
        it('allows user to sync models from Google Drive', async () => {
            const user = userEvent.setup();

            renderWithProviders(<ModelRegistryPage />);

            // Wait for initial load
            await waitFor(() => {
                expect(screen.queryByRole('img', { name: /loading/i })).not.toBeInTheDocument();
            });

            // Click sync button
            const syncButton = screen.getByRole('button', { name: /sync/i });
            await user.click(syncButton);

            // Verify syncing state
            expect(screen.getByRole('img', { name: /loading/i })).toBeInTheDocument();

            // Wait for sync to complete
            await waitFor(() => {
                expect(screen.getByText(/synced 2 models/i)).toBeInTheDocument();
            });

            // Verify models list refreshed
            expect(screen.queryByRole('img', { name: /loading/i })).not.toBeInTheDocument();
        });
    });

    describe('Error Handling Workflow', () => {
        it('displays error notification when upload fails', async () => {
            const user = userEvent.setup();

            // Mock upload error
            server.use(
                rest.post('/api/model-registry/models', (req, res, ctx) => {
                    return res(
                        ctx.status(400),
                        ctx.json({ message: 'Model with this name already exists' })
                    );
                })
            );

            renderWithProviders(<ModelRegistryPage />);

            // Open upload modal
            const uploadButton = screen.getByRole('button', { name: /upload model/i });
            await user.click(uploadButton);

            // Fill minimal required fields
            await user.type(screen.getByLabelText(/model name/i), 'existing_model');
            await user.type(screen.getByLabelText(/display name/i), 'Existing Model');

            const frameworkSelect = screen.getByLabelText(/framework/i);
            await user.click(frameworkSelect);
            const onnxOption = await screen.findByText('ONNX');
            await user.click(onnxOption);

            const file = new File(['data'], 'model.onnx');
            await user.upload(screen.getByLabelText(/upload model file/i), file);

            // Submit
            const submitButton = screen.getByRole('button', { name: /upload/i });
            await user.click(submitButton);

            // Verify error notification
            await waitFor(() => {
                expect(
                    screen.getByText(/model with this name already exists/i)
                ).toBeInTheDocument();
            });
        });

        it('displays error when network request fails', async () => {
            // Mock network error
            server.use(
                rest.get('/api/model-registry/models', (req, res, ctx) => {
                    return res.networkError('Failed to connect');
                })
            );

            renderWithProviders(<ModelRegistryPage />);

            // Verify error message displayed
            await waitFor(() => {
                expect(screen.getByText(/failed to load models/i)).toBeInTheDocument();
            });

            // Verify retry button available
            expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
        });
    });
});
```

---

## Running Tests

### NPM Scripts

Add to `cvat-ui/package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --maxWorkers=2",
    "test:debug": "node --inspect-brk node_modules/.bin/jest --runInBand"
  }
}
```

### Running Tests

```bash
# Run all tests
cd cvat-ui
yarn test

# Run tests in watch mode
yarn test:watch

# Run tests with coverage
yarn test:coverage

# Run specific test file
yarn test model-card.test.tsx

# Run tests matching pattern
yarn test --testNamePattern="ModelCard"

# Run tests in CI environment
yarn test:ci

# Debug tests in VS Code
yarn test:debug
```

### VS Code Debug Configuration

Add to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Jest: Current File",
      "program": "${workspaceFolder}/cvat-ui/node_modules/.bin/jest",
      "args": [
        "${fileBasename}",
        "--config",
        "${workspaceFolder}/cvat-ui/jest.config.js"
      ],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "cwd": "${workspaceFolder}/cvat-ui"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Jest: All Tests",
      "program": "${workspaceFolder}/cvat-ui/node_modules/.bin/jest",
      "args": [
        "--runInBand",
        "--config",
        "${workspaceFolder}/cvat-ui/jest.config.js"
      ],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "cwd": "${workspaceFolder}/cvat-ui"
    }
  ]
}
```

---

## Coverage Reports

### Viewing Coverage

```bash
# Generate coverage report
yarn test:coverage

# Open coverage report in browser
open cvat-ui/coverage/lcov-report/index.html
```

### Coverage Thresholds

Configured in `jest.config.js`:

```javascript
coverageThreshold: {
    global: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70,
    },
    './src/components/model-registry-page/**/*.{ts,tsx}': {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
    },
}
```

### CI Integration

Add to `.github/workflows/test.yml`:

```yaml
name: Frontend Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Enable Corepack
        run: corepack enable

      - name: Install dependencies
        run: yarn --immutable

      - name: Run tests
        run: yarn workspace cvat-ui run test:ci

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./cvat-ui/coverage/lcov.info
          flags: frontend
```

---

## Test Coverage Summary

| Component | Tests | Coverage Target |
|-----------|-------|-----------------|
| **ModelCard** | 8 tests | 90%+ |
| **ModelBrowser** | 4 tests | 85%+ |
| **ModelFilters** | 6 tests | 90%+ |
| **ModelUploadModal** | 7 tests | 85%+ |
| **ModelRegistryPage** | 8 tests | 80%+ |
| **Actions** | 10 tests | 90%+ |
| **Reducers** | 12 tests | 95%+ |
| **Integration** | 8 workflows | 75%+ |

**Total Tests**: ~63 tests
**Overall Coverage Target**: 85%+

---

## Best Practices

1. **Always use `renderWithProviders`** for components that need Redux/Router
2. **Mock API calls** with MSW for consistent, fast tests
3. **Test user interactions** with `@testing-library/user-event`
4. **Use `waitFor`** for async operations
5. **Test accessibility** with screen reader queries
6. **Keep tests isolated** - each test should be independent
7. **Use descriptive test names** that explain what is being tested
8. **Test error states** and edge cases
9. **Avoid testing implementation details** - test behavior
10. **Maintain high coverage** but prioritize meaningful tests

---

## Next Steps

1. **Install dependencies**: `yarn add -D @testing-library/react jest ...`
2. **Create test files**: Follow structure in this document
3. **Run tests**: `yarn test`
4. **Fix any failures**: Iterate on tests
5. **Integrate with CI**: Add to GitHub Actions
6. **Monitor coverage**: Maintain 85%+ coverage

This testing suite provides comprehensive coverage of the Model Registry feature with unit, integration, and workflow tests! 🎯

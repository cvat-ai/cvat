// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

const assert = require('node:assert/strict');
const { after, afterEach, beforeEach, test } = require('node:test');
const Module = require('node:module');
const path = require('node:path');

// Some browser dependencies keep scheduler ports open in Node. Close ports created by this DOM harness.
const NativeMessageChannel = global.MessageChannel;
const channels = [];
global.MessageChannel = class extends NativeMessageChannel {
    constructor() {
        super();
        channels.push(this);
    }
};

// Exercise the real React/Ant Design components in a DOM without a CVAT server or native canvas.
const load = Module._load;
const source = path.resolve(__dirname, '../src');
Module._load = function loadUI(request, parent, main) {
    if (request === 'canvas') return {};
    if (/\.(css|scss)$/.test(request)) return {};
    let resolved = request.replace(/^(rc-[^/]+)\/es\//, '$1/lib/');
    if (resolved.startsWith('@modules/')) resolved = resolved.slice('@modules/'.length);
    if (/^(components|utils|actions)\//.test(resolved)) resolved = path.join(source, resolved);
    return load.call(this, resolved, parent, main);
};

require('@babel/register')({
    extensions: ['.ts', '.tsx'],
    only: [source],
    babelrc: false,
    configFile: false,
    cache: false,
    presets: [
        [require.resolve('@babel/preset-env'), { targets: { node: 'current' } }],
        require.resolve('@babel/preset-react'),
        [require.resolve('@babel/preset-typescript'), { allExtensions: true, isTSX: true }],
    ],
});

const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
for (const name of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'SVGElement', 'Node', 'ShadowRoot', 'localStorage']) {
    Object.defineProperty(global, name, { configurable: true, value: dom.window[name] });
}
global.getComputedStyle = (element) => window.getComputedStyle(element);
global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
global.IS_REACT_ACT_ENVIRONMENT = true;
window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });

const React = require('react');
const { createRoot } = require('react-dom/client');
const { act, Simulate } = require('react-dom/test-utils');
const { Provider } = require('react-redux');
const { createStore } = require('redux');
const CVATTable = require('../src/components/common/cvat-table.tsx').default;
const { ScopedStateProvider, useScopedState } = require('../src/utils/scoped-state.tsx');

const data = Array.from({ length: 25 }, (_, key) => ({
    key, name: `Row ${String(key).padStart(2, '0')}`, active: key % 2 === 0,
}));
const columns = [
    { title: 'Name', key: 'name', dataIndex: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
    {
        title: 'Active', key: 'active', dataIndex: 'active', render: String,
        filters: [{ text: 'Yes', value: true }, { text: 'No', value: false }],
        onFilter: (value, row) => row.active === value,
    },
];
const config = {
    fields: { name: { label: 'Name', type: 'text', valueSources: ['value'], operators: ['equal', 'like'] } },
};
const store = createStore(() => ({ auth: { user: { id: 1, username: 'tester' } } }));
let root;
let container;
let props;
let scope;

beforeEach(() => {
    localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    scope = 'task:1';
    props = {
        stateKey: 'frames', columns, dataSource: data, searchDataIndex: ['name'],
        queryBuilder: { config, memoryKey: 'recentFilters' }, pagination: { showSizeChanger: true },
    };
});
afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
});
after(() => {
    dom.window.close();
    for (const channel of channels) {
        channel.port1.close();
        channel.port2.close();
    }
    global.MessageChannel = NativeMessageChannel;
    Module._load = load;
});

async function render(show = true) {
    await act(async () => root.render(React.createElement(Provider, { store },
        React.createElement(ScopedStateProvider, { scope }, show ? React.createElement(CVATTable, props) : null))));
}
async function click(element) {
    assert.ok(element, 'Expected a clickable element');
    await act(async () => Simulate.click(element));
}
function page() {
    return container.querySelector('.ant-pagination-item-active')?.textContent;
}
function rowNames() {
    return [...container.querySelectorAll('tbody tr[data-row-key]')].map((row) => row.textContent);
}
async function filterActive() {
    await click(container.querySelector('.ant-table-filter-trigger'));
    await act(async () => document.querySelector('.ant-table-filter-dropdown input').click());
    await click(document.querySelector('.ant-table-filter-dropdown .ant-btn-primary'));
}
async function recentFilter(name) {
    await click(container.querySelector('.cvat-switch-filters-constructor-button'));
    await click(document.querySelector('.cvat-recent-filters-button'));
    await click([...document.querySelectorAll('.cvat-resource-page-recent-filters-list .ant-menu-item')]
        .find((item) => item.textContent.includes(name)));
}

for (const temporaryData of [undefined, []]) {
    test(`retains the saved page through ${temporaryData === undefined ? 'missing data' : 'an empty loading result'}`, async () => {
        await render();
        await click(container.querySelector('.ant-pagination-item-2'));
        await render(false);
        props = { ...props, dataSource: temporaryData, loading: true };
        await render();
        props = { ...props, dataSource: data, loading: false };
        await render();
        assert.equal(page(), '2');
    });
}

test('clamps and saves the page only after loaded results shrink', async () => {
    await render();
    await click(container.querySelector('.ant-pagination-item-2'));
    props = { ...props, dataSource: data.slice(0, 3) };
    await render();
    assert.equal(page(), '1');
    props = { ...props, dataSource: data };
    await render(false);
    await render();
    assert.equal(page(), '1');
});

test('uses the server total for remote pagination', async () => {
    props = { ...props, dataSource: data.slice(0, 10), pagination: { total: 100, pageSize: 10 } };
    await render();
    await click(container.querySelector('.ant-pagination-item-4'));
    await render(false);
    await render();
    assert.equal(page(), '4');
});

test('retains sorting and filters for nested data indices without explicit keys', async () => {
    props = {
        ...props, dataSource: [...data].reverse().map((row) => ({ key: row.key, info: row })),
        columns: [
            { title: 'Name', dataIndex: ['info', 'name'], sorter: (a, b) => a.info.name.localeCompare(b.info.name) },
            {
                ...columns[1], key: undefined, dataIndex: ['info', 'active'],
                onFilter: (value, row) => row.info.active === value,
            },
        ],
    };
    await render();
    await click(container.querySelector('th.ant-table-column-has-sorters'));
    assert.ok(container.querySelector('th[aria-sort="ascending"]'));
    assert.ok(rowNames()[0].includes('Row 00'));
    await filterActive();
    await render(false);
    await render();
    assert.ok(container.querySelector('th[aria-sort="ascending"]'));
    assert.ok(rowNames().every((row) => row.endsWith('true')));
});

test('retains sorting for a column with neither key nor dataIndex', async () => {
    props = { ...props, columns: [{ title: 'Name', sorter: columns[0].sorter, render: (row) => row.name }] };
    await render();
    await click(container.querySelector('th.ant-table-column-has-sorters'));
    await render(false);
    await render();
    assert.ok(container.querySelector('th[aria-sort="ascending"]'));
});

test('new parent filters replace cached recent filters while mounted and after remount', async () => {
    const filter = (name) => JSON.stringify({ '==': [{ var: 'name' }, name] });
    localStorage.setItem('recentFilters', JSON.stringify([filter('Row 04')]));
    await render();
    await recentFilter('Row 04');
    assert.deepEqual(rowNames(), ['Row 04true']);
    await render(false);
    props = { ...props, queryBuilder: { ...props.queryBuilder, value: filter('Row 05') } };
    await render();
    assert.deepEqual(rowNames(), ['Row 05false']);
    assert.equal(container.querySelector('.cvat-clear-filters-button').disabled, false);
    props = { ...props, queryBuilder: { ...props.queryBuilder, value: filter('Row 06') } };
    await render();
    assert.deepEqual(rowNames(), ['Row 06true']);
    await render(false);
    props = { ...props, queryBuilder: { ...props.queryBuilder, value: null } };
    await render();
    assert.equal(rowNames().length, 10);
    assert.equal(container.querySelector('.cvat-clear-filters-button').disabled, true);
});

test('preserves recent-filter clearing, search and column visibility through remounts', async () => {
    const filter = JSON.stringify({ '==': [{ var: 'name' }, 'Row 04'] });
    localStorage.setItem('recentFilters', JSON.stringify([filter]));
    await render();
    await recentFilter('Row 04');
    await render(false);
    await render();
    assert.deepEqual(rowNames(), ['Row 04true']);
    await click(container.querySelector('.cvat-clear-filters-button'));
    assert.equal(rowNames().length, 10);
    await act(async () => Simulate.change(container.querySelector('.cvat-table-search-bar input'), {
        target: { value: 'Row 02' },
    }));
    await click(container.querySelector('.ant-input-search-button'));
    await click(container.querySelector('.anticon-more'));
    const label = [...document.querySelectorAll('.cvat-table-columns-settings-menu .ant-checkbox-wrapper')]
        .find((item) => item.textContent === 'Active');
    await act(async () => label.querySelector('input').click());
    await render(false);
    await render();
    assert.equal(container.querySelector('.cvat-table-search-bar input').value, 'Row 02');
    assert.deepEqual(rowNames(), ['Row 02']);
});

test('notification callbacks do not disable retained column visibility', async () => {
    const changes = [];
    props = { ...props, onChangeColumnVisibility: (index, hidden) => changes.push([index, hidden]) };
    await render();
    await click(container.querySelector('.anticon-more'));
    const label = [...document.querySelectorAll('.cvat-table-columns-settings-menu .ant-checkbox-wrapper')]
        .find((item) => item.textContent === 'Active');
    await act(async () => label.querySelector('input').click());
    assert.deepEqual(changes, [[1, true]]);
    assert.equal(container.querySelectorAll('thead th').length, 1);
    await render(false);
    await render();
    assert.equal(container.querySelectorAll('thead th').length, 1);
    assert.deepEqual(changes, [[1, true]], 'Restoring visibility must not emit a user change');
});

test('keeps table preferences separate and clears them when the resource scope changes', async () => {
    await render();
    await click(container.querySelector('.ant-pagination-item-2'));
    await render(false);
    props = { ...props, stateKey: 'jobs' };
    await render();
    assert.equal(page(), '1');
    await render(false);
    props = { ...props, stateKey: 'frames' };
    await render();
    assert.equal(page(), '2');
    scope = 'task:2';
    await render();
    assert.equal(page(), '1');
});


test('an inline data notification callback can update parent state without retriggering itself', async () => {
    let notifications = 0;
    function Owner() {
        const [, setRows] = React.useState([]);
        return React.createElement(CVATTable, {
            ...props,
            onFilterDataSource: (rows) => {
                notifications += 1;
                // Bound the reproduction so a regression cannot hang the test runner.
                if (notifications < 5) setRows([...rows]);
            },
        });
    }
    await act(async () => root.render(React.createElement(Provider, { store }, React.createElement(Owner))));
    assert.equal(notifications, 1);
});

test('data changes use the latest notification callback', async () => {
    const initial = [];
    const latest = [];
    props = { ...props, onFilterDataSource: (rows) => initial.push(rows) };
    await render();
    assert.deepEqual(initial, [data]);
    props = { ...props, onFilterDataSource: (rows) => latest.push(rows) };
    await render();
    assert.deepEqual(latest, [], 'A new callback is not a data change');
    const updated = data.slice(0, 3);
    props = { ...props, dataSource: updated };
    await render();
    assert.deepEqual(initial, [data]);
    assert.deepEqual(latest, [updated]);
});

test('explicitly controlled column visibility follows parent updates', async () => {
    const changes = [];
    props = {
        ...props, columnVisibility: { controlled: true },
        onChangeColumnVisibility: (index, hidden) => changes.push([index, hidden]),
    };
    await render();
    await click(container.querySelector('.anticon-more'));
    const label = [...document.querySelectorAll('.cvat-table-columns-settings-menu .ant-checkbox-wrapper')]
        .find((item) => item.textContent === 'Active');
    await act(async () => label.querySelector('input').click());
    assert.deepEqual(changes, [[1, true]]);
    assert.equal(container.querySelectorAll('thead th').length, 2, 'Wait for parent-controlled columns');
    props = { ...props, columns: [columns[0], { ...columns[1], hidden: true }] };
    await render();
    assert.equal(container.querySelectorAll('thead th').length, 1);
    props = { ...props, columns };
    await render();
    assert.equal(container.querySelectorAll('thead th').length, 2);
});


test('parent-controlled sorting stays authoritative and can be explicitly cleared', async () => {
    const changes = [];
    props = {
        ...props, columns: [{ ...columns[0], sortOrder: 'ascend' }, columns[1]],
        onChange: (...args) => changes.push(args),
    };
    await render();
    await click(container.querySelector('th.ant-table-column-has-sorters'));
    assert.ok(container.querySelector('th[aria-sort="ascending"]'));
    assert.equal(changes.at(-1)[2].order, 'descend', 'Parent receives the requested order');
    props = { ...props, columns: [{ ...columns[0], sortOrder: 'descend' }, columns[1]] };
    await render();
    assert.ok(container.querySelector('th[aria-sort="descending"]'));
    props = { ...props, columns: [{ ...columns[0], sortOrder: null }, columns[1]] };
    await render();
    await render(false);
    await render();
    assert.equal(container.querySelector('th[aria-sort]'), null);
});

test('parent-controlled column filters override saved values and accept null to clear', async () => {
    props = { ...props, columns: [columns[0], { ...columns[1], filteredValue: [true] }] };
    await render();
    assert.ok(rowNames().every((row) => row.endsWith('true')));
    await click(container.querySelector('th.ant-table-column-has-sorters'));
    props = { ...props, columns: [columns[0], { ...columns[1], filteredValue: [false] }] };
    await render();
    assert.ok(rowNames().every((row) => row.endsWith('false')));
    props = { ...props, columns: [columns[0], { ...columns[1], filteredValue: null }] };
    await render();
    await render(false);
    await render();
    assert.equal(rowNames().length, 10);
    assert.equal(container.querySelector('.ant-table-filter-trigger.active'), null);
});

test('parent-controlled pagination stays authoritative and follows updates', async () => {
    const changes = [];
    props = {
        ...props, pagination: { current: 1, pageSize: 10 },
        onChange: (...args) => changes.push(args),
    };
    await render();
    await click(container.querySelector('.ant-pagination-item-2'));
    assert.equal(page(), '1');
    assert.equal(changes.at(-1)[0].current, 2, 'Parent receives the requested page');
    props = { ...props, pagination: { current: 2, pageSize: 20 } };
    await render();
    assert.equal(page(), '2');
    assert.equal(rowNames().length, 5);
    await render(false);
    await render();
    assert.equal(page(), '2');
    assert.equal(rowNames().length, 5);
});

test('controlled page size can change while the current page is retained', async () => {
    props = { ...props, pagination: { pageSize: 10 } };
    await render();
    await click(container.querySelector('.ant-pagination-item-2'));
    assert.equal(page(), '2');
    props = { ...props, pagination: { pageSize: 20 } };
    await render();
    assert.equal(page(), '2');
    assert.equal(rowNames().length, 5);
});

test('uncontrolled default sorting and filters still apply before and after remount', async () => {
    props = {
        ...props, columns: [
            { ...columns[0], defaultSortOrder: 'descend' },
            { ...columns[1], defaultFilteredValue: [true] },
        ],
    };
    await render();
    assert.ok(container.querySelector('th[aria-sort="descending"]'));
    assert.ok(rowNames().every((row) => row.endsWith('true')));
    assert.ok(rowNames()[0].includes('Row 24'));
    await render(false);
    await render();
    assert.ok(container.querySelector('th[aria-sort="descending"]'));
    assert.ok(rowNames().every((row) => row.endsWith('true')));
});


for (const grouped of [false, true]) {
    test(`controlled sorting ${grouped ? 'inside a group' : 'on another column'} replaces cached sorting`, async () => {
        await render();
        await click(container.querySelector('th.ant-table-column-has-sorters'));
        assert.ok(container.querySelector('th[aria-sort="ascending"]'));
        const controlledColumns = (sortOrder) => {
            const active = {
                ...columns[1], sorter: (a, b) => Number(a.active) - Number(b.active), sortOrder,
            };
            return [columns[0], grouped ? { title: 'Details', children: [active] } : active];
        };
        props = { ...props, columns: controlledColumns('descend') };
        await render();
        const header = (title) => [...container.querySelectorAll('thead th')]
            .find((cell) => cell.textContent.includes(title));
        assert.equal(header('Active').getAttribute('aria-sort'), 'descending');
        assert.equal(header('Name').getAttribute('aria-sort'), null);
        assert.ok(rowNames().every((row) => row.endsWith('true')));
        await render(false);
        await render();
        assert.equal(header('Active').getAttribute('aria-sort'), 'descending');
        assert.equal(header('Name').getAttribute('aria-sort'), null);
        props = { ...props, columns: controlledColumns(null) };
        await render();
        assert.equal(container.querySelector('th[aria-sort]'), null);
        await render(false);
        await render();
        assert.equal(container.querySelector('th[aria-sort]'), null, 'Clearing must not resurrect the cached sorter');
    });
}


test('the provider owns its store through Strict Mode rerenders and resets it on scope changes or unmount', async () => {
    function Preference() {
        const [value, setValue] = useScopedState('preference', 0);
        return React.createElement('button', { onClick: () => setValue(value + 1) }, String(value));
    }
    async function renderPreference(show = true) {
        await act(async () => root.render(React.createElement(React.StrictMode, null,
            React.createElement(ScopedStateProvider, { scope }, show ? React.createElement(Preference) : null))));
    }
    await renderPreference();
    await click(container.querySelector('button'));
    await renderPreference();
    assert.equal(container.textContent, '1');
    await renderPreference(false);
    await renderPreference();
    assert.equal(container.textContent, '1', 'Remounting a consumer preserves the provider-owned store');
    scope = 'task:2';
    await renderPreference();
    assert.equal(container.textContent, '0');
    await click(container.querySelector('button'));
    scope = 'task:1';
    await renderPreference();
    assert.equal(container.textContent, '0', 'Returning to a previous scope starts with a new store');
    await click(container.querySelector('button'));
    await act(async () => root.render(null));
    await renderPreference();
    assert.equal(container.textContent, '0', 'Unmounting the provider ends its store lifetime');
});

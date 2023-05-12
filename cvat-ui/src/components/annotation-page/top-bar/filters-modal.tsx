// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Builder, Config, ImmutableTree, JsonLogicTree, Query, Utils as QbUtils,
} from 'react-awesome-query-builder';
import AntdWidgets from 'react-awesome-query-builder/lib/components/widgets/antd';
import AntdConfig from 'react-awesome-query-builder/lib/config/antd';
import 'react-awesome-query-builder/lib/css/styles.css';
// import { DownOutlined } from '@ant-design/icons';
// import Dropdown from 'antd/lib/dropdown';
// import Menu from 'antd/lib/menu';
import Text from 'antd/lib/typography/Text';
import Button from 'antd/lib/button';
import Modal from 'antd/lib/modal';
import { omit } from 'lodash';

import { CombinedState } from 'reducers';
import {
    changeAnnotationsFilters, changeFrameFiltersAsync, fetchAnnotationsAsync, showFilters,
} from 'actions/annotation-actions';

const { FieldDropdown } = AntdWidgets;

// const FILTERS_HISTORY = 'annotationFiltersHistory';

interface StoredFilter {
    id: string;
    logic: JsonLogicTree;
}

function FiltersModalComponent(): JSX.Element {
    const labels = useSelector((state: CombinedState) => state.annotation.job.labels);
    const activeFilters = useSelector((state: CombinedState) => state.annotation.annotations.filters);
    const activePlayerFilters = useSelector((state: CombinedState) => state.annotation.player.filters);
    const visible = useSelector((state: CombinedState) => state.annotation.filtersPanelVisible);

    const getConvertedInputType = (inputType: string): string => {
        switch (inputType) {
            case 'checkbox':
                return 'boolean';
            case 'radio':
                return 'select';
            default:
                return inputType;
        }
    };

    const adjustName = (name: string): string => name.replace(/\./g, '\u2219');

    const getAttributesSubfields = (): Record<string, any> => {
        const subfields: Record<string, any> = {};
        labels.forEach((label: any): void => {
            const adjustedLabelName = adjustName(label.name);
            subfields[adjustedLabelName] = {
                type: '!struct', // nested complex field
                label: label.name,
                subfields: {},
            };

            const labelSubfields = subfields[adjustedLabelName].subfields;
            label.attributes.forEach((attr: any): void => {
                const adjustedAttrName = adjustName(attr.name);
                labelSubfields[adjustedAttrName] = {
                    label: attr.name,
                    type: getConvertedInputType(attr.inputType),
                };
                if (labelSubfields[adjustedAttrName].type === 'select') {
                    labelSubfields[adjustedAttrName] = {
                        ...labelSubfields[adjustedAttrName],
                        fieldSettings: {
                            listValues: attr.values,
                        },
                    };
                }
            });
        });

        return subfields;
    };

    const annotationConfig: Config = {
        ...AntdConfig,
        fields: {
            label: {
                label: 'Label',
                type: 'select',
                valueSources: ['value'],
                fieldSettings: {
                    listValues: labels.map((label: any) => label.name),
                },
            },
            type: {
                label: 'Type',
                type: 'select',
                fieldSettings: {
                    listValues: [
                        { value: 'shape', title: 'Shape' },
                        { value: 'track', title: 'Track' },
                        { value: 'tag', title: 'Tag' },
                    ],
                },
            },
            shape: {
                label: 'Shape',
                type: 'select',
                fieldSettings: {
                    listValues: [
                        { value: 'rectangle', title: 'Rectangle' },
                        { value: 'points', title: 'Points' },
                        { value: 'polyline', title: 'Polyline' },
                        { value: 'polygon', title: 'Polygon' },
                        { value: 'cuboid', title: 'Cuboid' },
                        { value: 'ellipse', title: 'Ellipse' },
                        { value: 'skeleton', title: 'Skeleton' },
                        { value: 'mask', title: 'Mask' },
                    ],
                },
            },
            occluded: {
                label: 'Occluded',
                type: 'boolean',
            },
            width: {
                label: 'Width',
                type: 'number',
                fieldSettings: { min: 0 },
            },
            height: {
                label: 'Height',
                type: 'number',
                fieldSettings: { min: 0 },
            },
            objectID: {
                label: 'ObjectID',
                type: 'number',
                hideForCompare: true,
                fieldSettings: { min: 0 },
            },
            serverID: {
                label: 'ServerID',
                type: 'number',
                hideForCompare: true,
                fieldSettings: { min: 0 },
            },
            attr: {
                label: 'Attributes',
                type: '!struct',
                subfields: getAttributesSubfields(),
                fieldSettings: {
                    treeSelectOnlyLeafs: true,
                },
            },
        },
        settings: {
            ...AntdConfig.settings,
            renderField: (_props: any) => (
                <FieldDropdown {...omit(_props)} customProps={omit(_props.customProps, 'showSearch')} />
            ),
            // using FieldDropdown because we cannot use antd because of antd-related bugs
            // https://github.com/ukrbublik/react-awesome-query-builder/issues/224
        },
    };

    const frameConfig: Config = {
        ...AntdConfig,
        fields: {
            conflicted: {
                label: 'Has conflicts',
                type: 'boolean',
            },
        },
        settings: {
            ...AntdConfig.settings,
            renderField: (_props: any) => (
                <FieldDropdown {...omit(_props)} customProps={omit(_props.customProps, 'showSearch')} />
            ),
            // using FieldDropdown because we cannot use antd because of antd-related bugs
            // https://github.com/ukrbublik/react-awesome-query-builder/issues/224
        },
    };

    const initialState = {
        trees: {
            annotationTree: QbUtils.checkTree(
                QbUtils.loadTree({ id: QbUtils.uuid(), type: 'group' }),
                annotationConfig as Config,
            ) as ImmutableTree,
            frameTree: QbUtils.checkTree(
                QbUtils.loadTree({ id: QbUtils.uuid(), type: 'group' }),
                frameConfig as Config,
            ) as ImmutableTree,
        },
        configs: {
            annotationConfig,
            frameConfig,
        },
    };

    const dispatch = useDispatch();
    const [state, setState] = useState(initialState);
    const [annotationFilters, setAnnotationFilters] = useState([] as StoredFilter[]);
    const [frameFilters, setFrameFilters] = useState([] as StoredFilter[]);
    // useEffect(() => {
    //     console.log(state);
    // });

    // useEffect(() => {
    //     const filtersHistory = window.localStorage.getItem(FILTERS_HISTORY)?.trim() || '[]';
    //     try {
    //         setFilters(JSON.parse(filtersHistory));
    //     } catch (_) {
    //         setFilters([]);
    //     }
    // }, []);

    // useEffect(() => {
    //     window.localStorage.setItem(FILTERS_HISTORY, JSON.stringify(filters));
    // }, [filters]);

    useEffect(() => {
        if (visible) {
            const annotationTreeFromActiveFilters = activeFilters.length ?
                QbUtils.checkTree(QbUtils.loadFromJsonLogic(activeFilters[0], annotationConfig), annotationConfig) :
                null;
            const frameTreeFromActiveFilters = activePlayerFilters.length ?
                QbUtils.checkTree(QbUtils.loadFromJsonLogic(activePlayerFilters[0], frameConfig), frameConfig) :
                null;
            setState({
                trees: {
                    annotationTree: annotationTreeFromActiveFilters || initialState.trees.annotationTree,
                    frameTree: frameTreeFromActiveFilters || initialState.trees.frameTree,
                },
                configs: {
                    annotationConfig,
                    frameConfig,
                },
            });
        }
    }, [visible]);

    const applyFilters = (annotationFiltersData: any[], frameFiltersData: any[]): void => {
        if (annotationFiltersData) {
            dispatch(changeAnnotationsFilters(annotationFiltersData));
            dispatch(fetchAnnotationsAsync());
        }
        if (frameFiltersData) {
            dispatch(changeFrameFiltersAsync(frameFiltersData));
        }
        dispatch(showFilters(false));
    };

    const confirmModal = (): void => {
        let currentFilter: StoredFilter = {
            id: QbUtils.uuid(),
            logic: QbUtils.jsonLogicFormat(state.trees.annotationTree, annotationConfig).logic || {},
        };
        let updatedFilters = annotationFilters.filter(
            (filter) => JSON.stringify(filter.logic) !== JSON.stringify(currentFilter.logic),
        );
        setAnnotationFilters([currentFilter, ...updatedFilters].slice(0, 10));
        let { logic } = QbUtils.jsonLogicFormat(state.trees.annotationTree, annotationConfig);
        if (logic) applyFilters([logic], null);

        currentFilter = {
            id: QbUtils.uuid(),
            logic: QbUtils.jsonLogicFormat(state.trees.frameTree, frameConfig).logic || {},
        };
        updatedFilters = frameFilters.filter(
            (filter) => JSON.stringify(filter.logic) !== JSON.stringify(currentFilter.logic),
        );

        setFrameFilters([currentFilter, ...updatedFilters].slice(0, 10));
        logic = QbUtils.jsonLogicFormat(state.trees.frameTree, frameConfig).logic;
        if (logic) {
            if (logic) applyFilters(null, [logic]);
        }
        // todo change frame async
    };

    const isModalConfirmable = (): boolean => {
        const annotations = (QbUtils.queryString(state.trees.annotationTree, annotationConfig) || '').trim().length > 0 && QbUtils.isValidTree(state.trees.annotationTree);
        const frames = (QbUtils.queryString(state.trees.frameTree, frameConfig) || '').trim().length > 0 && QbUtils.isValidTree(state.trees.frameTree);
        return annotations || frames;
    };

    const renderBuilder = (builderProps: any): JSX.Element => (
        <div className='query-builder-container'>
            <div className='query-builder qb-lite'>
                <Builder {...builderProps} />
            </div>
        </div>
    );

    const onChange = (type: string, tree: ImmutableTree): void => {
        if (type === 'annotationTree') {
            setState({
                trees: {
                    ...state.trees,
                    annotationTree: tree,
                },
                configs: {
                    ...state.configs,
                    annotationConfig,
                },
            });
        } else if (type === 'frameTree') {
            setState({
                trees: {
                    ...state.trees,
                    frameTree: tree,
                },
                configs: {
                    ...state.configs,
                    frameConfig,
                },
            });
        }
    };

    // TMP disabled
    // const menu = (
    //     <Menu>
    //         {filters
    //             .map((filter: StoredFilter) => {
    //                 // if a logic received from local storage does not correspond to current config
    //                 // which depends on label specification
    //                 // (it can be when history from another task with
    // another specification or when label was removed)
    //                 // loadFromJsonLogic() prints a warning to console
    //                 // the are not ways to configure this behaviour

    //                 const tree = QbUtils.loadFromJsonLogic(filter.logic, config);
    //                 const queryString = QbUtils.queryString(tree, config);
    //                 return { tree, queryString, filter };
    //             })
    //             .filter(({ queryString }) => !!queryString)
    //             .map(({ filter, tree, queryString }) => (
    //                 <Menu.Item key={filter.id} onClick={() => setState({ tree, config })}>
    //                     {queryString}
    //                 </Menu.Item>
    //             ))}
    //     </Menu>
    // );

    return (
        <Modal
            className={visible ? 'cvat-filters-modal cvat-filters-modal-visible' : 'cvat-filters-modal'}
            visible={visible}
            closable={false}
            width={800}
            destroyOnClose
            centered
            onCancel={() => dispatch(showFilters(false))}
            footer={[
                <Button
                    key='clear'
                    disabled={!activeFilters.length && !activePlayerFilters.length}
                    onClick={() => applyFilters([], [])}
                    className='cvat-filters-modal-clear-button'
                >
                    Clear filters
                </Button>,
                <Button
                    key='cancel'
                    onClick={() => dispatch(showFilters(false))}
                    className='cvat-filters-modal-cancel-button'
                >
                    Cancel
                </Button>,
                <Button
                    key='submit'
                    type='primary'
                    disabled={!isModalConfirmable()}
                    onClick={confirmModal}
                    className='cvat-filters-modal-submit-button'
                >
                    Submit
                </Button>,
            ]}
        >
            {/* <div
                key='used'
                className='recently-used-wrapper'
                style={{ display: filters.length ? 'inline-block' : 'none' }}
            >
                <Dropdown overlay={menu}>
                    <Button
                        type='text'
                        className='cvat-filters-modal-recently-used-button'
                    >
                        Recently used
                        {' '}
                        <DownOutlined />
                    </Button>
                </Dropdown>
            </div> */}
            <Text>Annotation Filters:</Text>
            <Query
                {...annotationConfig}
                value={state.trees.annotationTree}
                onChange={(tree) => onChange('annotationTree', tree)}
                renderBuilder={renderBuilder}
            />
            <Text>Frame Filters:</Text>
            <Query
                {...frameConfig}
                value={state.trees.frameTree}
                onChange={(tree) => onChange('frameTree', tree)}
                renderBuilder={renderBuilder}
            />
        </Modal>
    );
}

export default React.memo(FiltersModalComponent);

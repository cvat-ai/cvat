// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Button from 'antd/lib/button';
import Dropdown from 'antd/lib/dropdown';
import Select from 'antd/lib/select';
import { Col, Row } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';
import Icon, {
    CopyOutlined, DeleteOutlined, EyeInvisibleFilled, EyeOutlined, FunctionOutlined, GroupOutlined,
    LockFilled, MoreOutlined, PushpinFilled, PushpinOutlined, TeamOutlined, UngroupOutlined,
    UnlockOutlined, UserOutlined, VerticalAlignBottomOutlined,
} from '@ant-design/icons';

import {
    ActiveControl, CombinedState,
} from 'reducers';
import {
    Label, ObjectState, ObjectType, ShapeType, Source,
} from 'cvat-core-wrapper';
import { Canvas } from 'cvat-canvas-wrapper';
import { ThunkDispatch } from 'utils/redux';
import { filterApplicableLabels } from 'utils/filter-applicable-labels';
import {
    getSelectedStates,
    getSelectionAttributeState,
    getSelectionGroupState,
    getSelectionToggleState,
    prepareSelectionToggle,
    prepareSelectionZOrder,
} from 'utils/multi-selection';
import CVATTooltip from 'components/common/cvat-tooltip';
import LabelSelector from 'components/label-selector/label-selector';
import ObjectItemDetails from 'components/annotation-page/standard-workspace/objects-side-bar/object-item-details';
import { LayerPicker } from 'components/annotation-page/standard-workspace/objects-side-bar/object-item-basics';
import { openAnnotationsActionModal } from 'components/annotation-page/annotations-actions/annotations-actions-modal';
import {
    BackgroundIcon, ForegroundIcon, OneLayerBackwardIcon, OneLayerForwardIcon,
} from 'icons';
import {
    copyShape,
    copySelection,
    groupSelectedAnnotationsAsync,
    pasteShapeAsync,
    pasteSelectionAsync,
    removeSelectionAsync,
    updateActiveControl,
    updateAnnotationsBatchAsync,
} from 'actions/annotation-actions';

export default function SelectionContextMenu(): JSX.Element | null {
    const dispatch = useDispatch<ThunkDispatch>();
    const {
        annotations,
        selectedStatesID,
        labels,
        minZLayer,
        maxZLayer,
        canvasInstance,
        normalizedKeyMap,
    } = useSelector((state: CombinedState) => ({
        annotations: state.annotation.annotations.states,
        selectedStatesID: state.annotation.annotations.selectedStatesID,
        labels: state.annotation.job.labels,
        minZLayer: state.annotation.annotations.zLayer.min,
        maxZLayer: state.annotation.annotations.zLayer.max,
        canvasInstance: state.annotation.canvas.instance,
        normalizedKeyMap: state.shortcuts.normalizedKeyMap,
    }));
    const [attributesCollapsed, setAttributesCollapsed] = useState(true);
    const [layerPickerVisible, setLayerPickerVisible] = useState(false);
    const contextSelectionID = useRef<number[]>(selectedStatesID);
    if (selectedStatesID.length) {
        contextSelectionID.current = [...selectedStatesID];
    }
    const selectedStates = getSelectedStates(
        annotations,
        selectedStatesID.length ? selectedStatesID : contextSelectionID.current,
    );

    if (!selectedStates.length) {
        return null;
    }

    const updateSelection = async (states: ObjectState[]): Promise<void> => {
        if (states.length) {
            await dispatch(updateAnnotationsBatchAsync(states));
        }
    };

    const updateZOrder = async (resolveZOrder: (state: ObjectState) => number): Promise<void> => {
        const statesToUpdate = prepareSelectionZOrder(selectedStates, resolveZOrder);
        await updateSelection(statesToUpdate);
        setLayerPickerVisible(false);
    };

    const selectionAttributeState = getSelectionAttributeState(selectedStates);
    const selectionAttributeValues: Record<number, string> = {};
    const mixedAttributeIDs = new Set<number>();
    for (const attribute of selectionAttributeState.attributes) {
        const attributeID = attribute.id as number;
        const value = selectedStates[0]?.attributes[attributeID] || '';
        selectionAttributeValues[attributeID] = value;
        if (selectedStates.some((state: ObjectState): boolean => state.attributes[attributeID] !== value)) {
            mixedAttributeIDs.add(attributeID);
        }
    }

    const applicableLabels = labels.filter((label: Label): boolean => selectedStates.every(
        (state: ObjectState): boolean => filterApplicableLabels(state, labels).some(
            (applicableLabel: Label): boolean => applicableLabel.id === label.id,
        ),
    ));
    const selectedLabelID = selectedStates.every(
        (state: ObjectState): boolean => state.label.id === selectedStates[0].label.id,
    ) ? selectedStates[0].label.id : null;
    const labelSelectorDisabled = !applicableLabels.length || selectedStates.some(
        (state: ObjectState): boolean => (
            state.lock || state.isGroundTruth || state.shapeType === ShapeType.SKELETON
        ),
    );
    const labelSelectorDisabledReason = !applicableLabels.length ?
        'No label can be applied to every selected object' :
        'Labels cannot be changed for locked, ground truth, or skeleton objects';
    const lockSelection = getSelectionToggleState(selectedStates, 'lock');
    const pinSelection = getSelectionToggleState(selectedStates, 'pinned');
    const occludedSelection = getSelectionToggleState(selectedStates, 'occluded');
    const hiddenSelection = getSelectionToggleState(selectedStates, 'hidden');
    const selectionGroupState = getSelectionGroupState(selectedStates);
    const groupSelectionDisabled = !selectionGroupState.canGroup;
    const groupSelectionDisabledReason = selectionGroupState.disabledReason || (
        selectionGroupState.alreadyInSameGroup ?
            'Selected objects are already in the same group' : 'Select at least two objects to group'
    );
    const ungroupSelectionDisabled = !selectionGroupState.canUngroup;
    const ungroupSelectionDisabledReason = selectionGroupState.disabledReason ||
        'No selected objects are grouped';
    const selectionKindsMap = new Map<string, { count: number; shapeType: ShapeType; objectType: ObjectType }>();
    for (const state of selectedStates) {
        const key = `${state.shapeType}:${state.objectType}`;
        const kind = selectionKindsMap.get(key);
        if (kind) {
            kind.count++;
        } else {
            selectionKindsMap.set(key, {
                count: 1,
                shapeType: state.shapeType,
                objectType: state.objectType,
            });
        }
    }
    const selectionKinds = [...selectionKindsMap.values()];
    let selectionType: string;
    if (selectionKinds.length === 1) {
        const [kind] = selectionKinds;
        selectionType = `${kind.shapeType.toUpperCase()} ${kind.objectType.toUpperCase()}${
            kind.count === 1 ? '' : 'S'
        }`;
    } else if (selectionKinds.length === 2) {
        const shapeTypes = new Set(selectionKinds.map((kind) => kind.shapeType));
        selectionType = shapeTypes.size === 1 ?
            selectionKinds.map((kind) => kind.objectType.toUpperCase()).join(' + ') :
            selectionKinds.map((kind) => (
                kind.shapeType === ShapeType.RECTANGLE ? 'RECT' : kind.shapeType.toUpperCase()
            )).join(' + ');
    } else {
        selectionType = `${selectionKinds.length} TYPES`;
    }
    const selectionTypeBreakdown = (
        <div className='cvat-canvas-selected-objects-type-breakdown'>
            {selectionKinds.map((kind) => (
                <div key={`${kind.shapeType}:${kind.objectType}`}>
                    {`${kind.count} ${kind.shapeType.toLowerCase()} ${kind.objectType.toLowerCase()}${
                        kind.count === 1 ? '' : 's'
                    }`}
                </div>
            ))}
        </div>
    );
    const layerActionsDisabled = !selectedStates.some((state: ObjectState): boolean => (
        !state.lock && !state.isGroundTruth && [ObjectType.SHAPE, ObjectType.TRACK].includes(state.objectType)
    ));

    const overflowItems = [
        {
            key: 'copy',
            label: (
                <Button
                    type='link'
                    icon={<CopyOutlined />}
                    onClick={(): void => {
                        if (selectedStates.length === 1) {
                            dispatch(copyShape(selectedStates[0]));
                            dispatch(pasteShapeAsync());
                        } else {
                            dispatch(copySelection(selectedStates));
                            dispatch(pasteSelectionAsync());
                        }
                    }}
                >
                    Make a copy
                </Button>
            ),
        },
        {
            key: 'run-annotation-action',
            label: (
                <Button
                    type='link'
                    icon={<FunctionOutlined />}
                    onClick={(): void => {
                        openAnnotationsActionModal({ defaultObjectStates: selectedStates });
                    }}
                >
                    Run annotation action
                </Button>
            ),
        },
        {
            key: 'to-background',
            label: (
                <Button
                    type='link'
                    disabled={layerActionsDisabled}
                    icon={<Icon component={BackgroundIcon} />}
                    onClick={(): Promise<void> => updateZOrder((): number => minZLayer - 1)}
                >
                    To background
                </Button>
            ),
        },
        {
            key: 'to-foreground',
            label: (
                <Button
                    type='link'
                    disabled={layerActionsDisabled}
                    icon={<Icon component={ForegroundIcon} />}
                    onClick={(): Promise<void> => updateZOrder((): number => maxZLayer + 1)}
                >
                    To foreground
                </Button>
            ),
        },
        {
            key: 'one-layer-backward',
            label: (
                <Button
                    type='link'
                    disabled={layerActionsDisabled}
                    icon={<Icon component={OneLayerBackwardIcon} />}
                    onClick={(): Promise<void> => updateZOrder(
                        (state: ObjectState): number => state.zOrder - 1,
                    )}
                >
                    To one layer backward
                </Button>
            ),
        },
        {
            key: 'one-layer-forward',
            label: (
                <Button
                    type='link'
                    disabled={layerActionsDisabled}
                    icon={<Icon component={OneLayerForwardIcon} />}
                    onClick={(): Promise<void> => updateZOrder(
                        (state: ObjectState): number => state.zOrder + 1,
                    )}
                >
                    To one layer forward
                </Button>
            ),
        },
        {
            key: 'move-to-layer',
            label: (
                <Button
                    type='link'
                    disabled={layerActionsDisabled}
                    icon={<VerticalAlignBottomOutlined />}
                    onClick={(): void => setLayerPickerVisible(true)}
                >
                    Move to layer ...
                </Button>
            ),
        },
        {
            key: 'group',
            label: (
                <Button
                    type='link'
                    disabled={groupSelectionDisabled}
                    title={groupSelectionDisabled ? groupSelectionDisabledReason : undefined}
                    icon={<GroupOutlined />}
                    onClick={(): void => {
                        dispatch(groupSelectedAnnotationsAsync());
                    }}
                >
                    Group selection
                </Button>
            ),
        },
        {
            key: 'ungroup',
            label: (
                <Button
                    type='link'
                    disabled={ungroupSelectionDisabled}
                    title={ungroupSelectionDisabled ? ungroupSelectionDisabledReason : undefined}
                    icon={<UngroupOutlined />}
                    onClick={(): void => {
                        dispatch(groupSelectedAnnotationsAsync(true));
                    }}
                >
                    Ungroup selection
                </Button>
            ),
        },
    ];

    const menuTrigger = (
        <Col
            span={2}
            role='button'
            tabIndex={0}
            className='cvat-canvas-selected-objects-more-button'
            aria-label='More selection actions'
        >
            <MoreOutlined />
        </Col>
    );

    return (
        <div
            className={
                'cvat-canvas-selected-objects-menu-content cvat-object-item-menu ' +
                'cvat-objects-sidebar-state-item cvat-objects-sidebar-state-active-item'
            }
        >
            <Row align='middle' className='cvat-canvas-selected-objects-menu-header'>
                <Col span={10} className='cvat-canvas-selected-objects-type'>
                    <Text className='cvat-canvas-selected-objects-count'>
                        {`${selectedStates.length} OBJECT${selectedStates.length === 1 ? '' : 'S'}`}
                    </Text>
                    <br />
                    <CVATTooltip title={selectionTypeBreakdown}>
                        <Text
                            type='secondary'
                            className='cvat-canvas-selected-objects-type-text'
                        >
                            {selectionType}
                        </Text>
                    </CVATTooltip>
                </Col>
                <Col span={12} className='cvat-canvas-selected-objects-label-selector'>
                    {applicableLabels.length ? (
                        <LabelSelector
                            disabled={labelSelectorDisabled}
                            size='small'
                            labels={applicableLabels}
                            value={selectedLabelID}
                            placeholder={selectedLabelID === null ? 'Multiple labels' : 'Select label'}
                            onChange={(label: Label): void => {
                                for (const selectedState of selectedStates) selectedState.label = label;
                                updateSelection(selectedStates);
                            }}
                            tooltip={labelSelectorDisabled ?
                                labelSelectorDisabledReason : 'Change current label'}
                            className='cvat-objects-sidebar-state-item-label-selector'
                            popupClassName='cvat-objects-sidebar-state-item-label-dropdown'
                            popupMatchSelectWidth={false}
                        />
                    ) : (
                        <Select disabled size='small' placeholder='No common labels' />
                    )}
                </Col>
                {layerPickerVisible ? (
                    <LayerPicker
                        visible
                        value={selectedStates[0]?.zOrder ?? 0}
                        onVisibleChange={setLayerPickerVisible}
                        onChange={(zOrder: number): Promise<void> => updateZOrder((): number => zOrder)}
                    >
                        {menuTrigger}
                    </LayerPicker>
                ) : (
                    <Dropdown
                        destroyPopupOnHide
                        placement='bottomLeft'
                        trigger={['click']}
                        className='cvat-object-item-menu-button'
                        menu={{
                            selectable: false,
                            className: 'cvat-object-item-menu cvat-canvas-selected-objects-overflow-menu',
                            onClick: (info): void => info.domEvent.stopPropagation(),
                            items: overflowItems,
                        }}
                    >
                        {menuTrigger}
                    </Dropdown>
                )}
            </Row>
            <div className='cvat-canvas-selected-objects-quick-actions'>
                <CVATTooltip title={lockSelection.disabledReason || (
                    lockSelection.active ? 'Unlock selection' : 'Lock selection'
                )}
                >
                    <span>
                        <Button
                            type='text'
                            size='small'
                            className={lockSelection.active ?
                                'cvat-object-item-button-lock-enabled' : 'cvat-object-item-button-lock'}
                            disabled={!!lockSelection.disabledReason}
                            aria-label={lockSelection.active ? 'Unlock selection' : 'Lock selection'}
                            icon={lockSelection.active ? <LockFilled /> : <UnlockOutlined />}
                            onClick={(): void => {
                                updateSelection(prepareSelectionToggle(selectedStates, 'lock'));
                            }}
                        />
                    </span>
                </CVATTooltip>
                <CVATTooltip title={occludedSelection.disabledReason || `${
                    occludedSelection.active ? 'Unocclude selection' : 'Occlude selection'
                } ${normalizedKeyMap.SWITCH_OCCLUDED}`}
                >
                    <span>
                        <Button
                            type='text'
                            size='small'
                            className={occludedSelection.active ?
                                'cvat-object-item-button-occluded-enabled' : 'cvat-object-item-button-occluded'}
                            disabled={!!occludedSelection.disabledReason}
                            aria-label={occludedSelection.active ? 'Unocclude selection' : 'Occlude selection'}
                            icon={occludedSelection.active ? <TeamOutlined /> : <UserOutlined />}
                            onClick={(): void => {
                                updateSelection(prepareSelectionToggle(selectedStates, 'occluded'));
                            }}
                        />
                    </span>
                </CVATTooltip>
                <CVATTooltip title={hiddenSelection.disabledReason || `${
                    hiddenSelection.active ? 'Show selection' : 'Hide selection'
                } ${normalizedKeyMap.SWITCH_HIDDEN}`}
                >
                    <span>
                        <Button
                            type='text'
                            size='small'
                            className={hiddenSelection.active ?
                                'cvat-object-item-button-hidden-enabled' : 'cvat-object-item-button-hidden'}
                            disabled={!!hiddenSelection.disabledReason}
                            aria-label={hiddenSelection.active ? 'Show selection' : 'Hide selection'}
                            icon={hiddenSelection.active ? <EyeInvisibleFilled /> : <EyeOutlined />}
                            onClick={(): void => {
                                updateSelection(prepareSelectionToggle(selectedStates, 'hidden'));
                            }}
                        />
                    </span>
                </CVATTooltip>
                <CVATTooltip title={pinSelection.disabledReason || (
                    pinSelection.active ? 'Unpin selection' : 'Pin selection'
                )}
                >
                    <span>
                        <Button
                            type='text'
                            size='small'
                            className={pinSelection.active ?
                                'cvat-object-item-button-pinned-enabled' : 'cvat-object-item-button-pinned'}
                            disabled={!!pinSelection.disabledReason}
                            aria-label={pinSelection.active ? 'Unpin selection' : 'Pin selection'}
                            icon={pinSelection.active ? <PushpinFilled /> : <PushpinOutlined />}
                            onClick={(): void => {
                                updateSelection(prepareSelectionToggle(selectedStates, 'pinned'));
                            }}
                        />
                    </span>
                </CVATTooltip>
                <CVATTooltip title='Delete selection'>
                    <Button
                        type='text'
                        size='small'
                        danger
                        aria-label='Delete selection'
                        icon={<DeleteOutlined />}
                        onClick={async (): Promise<void> => {
                            if (canvasInstance instanceof Canvas) {
                                canvasInstance.selectObjects({ enabled: false });
                            }
                            dispatch(updateActiveControl(ActiveControl.CURSOR));
                            await dispatch(removeSelectionAsync(false));
                        }}
                    />
                </CVATTooltip>
            </div>
            {selectionAttributeState.attributes.length ? (
                <ObjectItemDetails
                    readonly={!selectionAttributeState.enabled}
                    collapsed={attributesCollapsed}
                    collapse={(): void => setAttributesCollapsed(!attributesCollapsed)}
                    changeAttribute={async (attributeID: number, value: string): Promise<void> => {
                        const statesToUpdate = selectedStates.filter(
                            (state: ObjectState): boolean => state.attributes[attributeID] !== value,
                        );
                        for (const state of statesToUpdate) state.attributes = { [attributeID]: value };
                        if (statesToUpdate.length) await dispatch(updateAnnotationsBatchAsync(statesToUpdate));
                    }}
                    values={selectionAttributeValues}
                    mixedAttributeIDs={mixedAttributeIDs}
                    attributes={selectionAttributeState.attributes}
                    changeSize={(): void => {}}
                    sizeParams={null}
                    source={selectedStates[0]?.source || Source.MANUAL}
                    score={selectedStates[0]?.score || 0}
                    votes={selectedStates[0]?.votes || 0}
                    textContent=''
                />
            ) : null}
        </div>
    );
}

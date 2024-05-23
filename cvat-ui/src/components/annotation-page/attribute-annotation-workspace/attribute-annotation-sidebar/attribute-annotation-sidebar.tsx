// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022-2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import Layout, { SiderProps } from 'antd/lib/layout';
import Text from 'antd/lib/typography/Text';

import { filterApplicableLabels } from 'utils/filter-applicable-labels';
import { Label } from 'cvat-core-wrapper';
import { EventScope } from 'cvat-logger';
import {
    activateObject as activateObjectAction,
    changeFrameAsync,
    updateAnnotationsAsync,
} from 'actions/annotation-actions';
import isAbleToChangeFrame from 'utils/is-able-to-change-frame';
import GlobalHotKeys, { KeyMap } from 'utils/mousetrap-react';
import { ThunkDispatch } from 'utils/redux';
import AppearanceBlock from 'components/annotation-page/appearance-block';
import ObjectButtonsContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/object-buttons';
import { CombinedState, ObjectType } from 'reducers';
import AttributeEditor from './attribute-editor';
import AttributeSwitcher from './attribute-switcher';
import ObjectBasicsEditor from './object-basics-edtior';
import ObjectSwitcher from './object-switcher';

interface StateToProps {
    activatedStateID: number | null;
    activatedAttributeID: number | null;
    states: any[];
    labels: any[];
    jobInstance: any;
    keyMap: KeyMap;
    normalizedKeyMap: Record<string, string>;
    canvasIsReady: boolean;
    curZLayer: number;
}

interface DispatchToProps {
    activateObject(clientID: number | null, attrID: number | null): void;
    updateAnnotations(statesToUpdate: any[]): void;
    changeFrame(frame: number): void;
}

interface LabelAttrMap {
    [index: number]: any;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            annotations: {
                activatedStateID,
                activatedAttributeID,
                states,
                zLayer: { cur },
            },
            job: { instance: jobInstance, labels },
            canvas: { ready: canvasIsReady },
        },
        shortcuts: { keyMap, normalizedKeyMap },
    } = state;

    return {
        jobInstance,
        labels,
        activatedStateID,
        activatedAttributeID,
        states,
        keyMap,
        normalizedKeyMap,
        canvasIsReady,
        curZLayer: cur,
    };
}

function mapDispatchToProps(dispatch: ThunkDispatch): DispatchToProps {
    return {
        activateObject(clientID: number, attrID: number): void {
            dispatch(activateObjectAction(clientID, null, attrID));
        },
        updateAnnotations(states): void {
            dispatch(updateAnnotationsAsync(states));
        },
        changeFrame(frame: number): void {
            dispatch(changeFrameAsync(frame));
        },
    };
}

function AttributeAnnotationSidebar(props: StateToProps & DispatchToProps): JSX.Element {
    const {
        labels,
        states,
        activatedStateID,
        activatedAttributeID,
        jobInstance,
        updateAnnotations,
        changeFrame,
        activateObject,
        keyMap,
        normalizedKeyMap,
        canvasIsReady,
        curZLayer,
    } = props;

    const filteredStates = states.filter((state) => !state.outside && !state.hidden && state.zOrder <= curZLayer);
    const [labelAttrMap, setLabelAttrMap] = useState(
        labels.reduce((acc, label): LabelAttrMap => {
            acc[label.id] = label.attributes.length ? label.attributes[0] : null;
            return acc;
        }, {}),
    );

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const collapse = (): void => {
        const [collapser] = window.document.getElementsByClassName('attribute-annotation-sidebar');

        const listener = (event: TransitionEvent): void => {
            if (event.target && event.propertyName === 'width' && event.target === collapser) {
                window.dispatchEvent(new Event('resize'));
                (collapser as HTMLElement).removeEventListener('transitionend', listener as any);
            }
        };

        if (collapser) {
            (collapser as HTMLElement).addEventListener('transitionend', listener as any);
        }

        setSidebarCollapsed(!sidebarCollapsed);
    };

    const indexes = filteredStates.map((state) => state.clientID);
    const activatedIndex = indexes.indexOf(activatedStateID);
    const activeObjectState =
        activatedStateID === null || activatedIndex === -1 ? null : filteredStates[activatedIndex];

    const activeAttribute = activeObjectState ? labelAttrMap[activeObjectState.label.id] : null;
    const applicableLabels = activeObjectState ? filterApplicableLabels(activeObjectState, labels) : [];

    if (canvasIsReady) {
        if (activeObjectState) {
            const attribute = labelAttrMap[activeObjectState.label.id];
            if (attribute && attribute.id !== activatedAttributeID) {
                activateObject(activatedStateID, attribute ? attribute.id : null);
            }
        } else if (filteredStates.length) {
            const attribute = labelAttrMap[filteredStates[0].label.id];
            activateObject(filteredStates[0].clientID, attribute ? attribute.id : null);
        }
    }

    const nextObject = (step: number): void => {
        if (filteredStates.length) {
            const index = filteredStates.indexOf(activeObjectState);
            let nextIndex = index + step;
            if (nextIndex > filteredStates.length - 1) {
                nextIndex = 0;
            } else if (nextIndex < 0) {
                nextIndex = filteredStates.length - 1;
            }
            if (nextIndex !== index) {
                const attribute = labelAttrMap[filteredStates[nextIndex].label.id];
                activateObject(filteredStates[nextIndex].clientID, attribute ? attribute.id : null);
            }
        }
    };

    const nextAttribute = (step: number): void => {
        if (activeObjectState) {
            const { label } = activeObjectState;
            const { attributes } = label;
            if (attributes.length) {
                const index = attributes.indexOf(activeAttribute);
                let nextIndex = index + step;
                if (nextIndex > attributes.length - 1) {
                    nextIndex = 0;
                } else if (nextIndex < 0) {
                    nextIndex = attributes.length - 1;
                }
                if (index !== nextIndex) {
                    const updatedLabelAttrMap = { ...labelAttrMap };
                    updatedLabelAttrMap[label.id] = attributes[nextIndex];
                    setLabelAttrMap(updatedLabelAttrMap);
                }
            }
        }
    };

    useEffect(() => {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
    }, []);

    const siderProps: SiderProps = {
        className: 'attribute-annotation-sidebar',
        theme: 'light',
        width: 300,
        collapsedWidth: 0,
        reverseArrow: true,
        collapsible: true,
        trigger: null,
        collapsed: sidebarCollapsed,
    };

    const preventDefault = (event: KeyboardEvent | undefined): void => {
        if (event) {
            event.preventDefault();
        }
    };

    const subKeyMap = {
        NEXT_ATTRIBUTE: keyMap.NEXT_ATTRIBUTE,
        PREVIOUS_ATTRIBUTE: keyMap.PREVIOUS_ATTRIBUTE,
        NEXT_OBJECT: keyMap.NEXT_OBJECT,
        PREVIOUS_OBJECT: keyMap.PREVIOUS_OBJECT,
        SWITCH_LOCK: keyMap.SWITCH_LOCK,
        SWITCH_OCCLUDED: keyMap.SWITCH_OCCLUDED,
        SWITCH_PINNED: keyMap.SWITCH_PINNED,
        NEXT_KEY_FRAME: keyMap.NEXT_KEY_FRAME,
        PREV_KEY_FRAME: keyMap.PREV_KEY_FRAME,
    };

    const handlers = {
        NEXT_ATTRIBUTE: (event: KeyboardEvent | undefined) => {
            preventDefault(event);
            nextAttribute(1);
        },
        PREVIOUS_ATTRIBUTE: (event: KeyboardEvent | undefined) => {
            preventDefault(event);
            nextAttribute(-1);
        },
        NEXT_OBJECT: (event: KeyboardEvent | undefined) => {
            preventDefault(event);
            nextObject(1);
        },
        PREVIOUS_OBJECT: (event: KeyboardEvent | undefined) => {
            preventDefault(event);
            nextObject(-1);
        },
        SWITCH_LOCK: (event: KeyboardEvent | undefined) => {
            preventDefault(event);
            if (activeObjectState) {
                activeObjectState.lock = !activeObjectState.lock;
                updateAnnotations([activeObjectState]);
            }
        },
        SWITCH_OCCLUDED: (event: KeyboardEvent | undefined) => {
            preventDefault(event);
            if (activeObjectState && activeObjectState.objectType !== ObjectType.TAG) {
                activeObjectState.occluded = !activeObjectState.occluded;
                updateAnnotations([activeObjectState]);
            }
        },
        SWITCH_PINNED: (event: KeyboardEvent | undefined) => {
            preventDefault(event);
            if (activeObjectState) {
                activeObjectState.pinned = !activeObjectState.pinned;
                updateAnnotations([activeObjectState]);
            }
        },
        NEXT_KEY_FRAME: (event: KeyboardEvent | undefined) => {
            preventDefault(event);
            if (activeObjectState && activeObjectState.objectType === ObjectType.TRACK) {
                const frame =
                    typeof activeObjectState.keyframes.next === 'number' ? activeObjectState.keyframes.next : null;
                if (frame !== null && isAbleToChangeFrame()) {
                    changeFrame(frame);
                }
            }
        },
        PREV_KEY_FRAME: (event: KeyboardEvent | undefined) => {
            preventDefault(event);
            if (activeObjectState && activeObjectState.objectType === ObjectType.TRACK) {
                const frame =
                    typeof activeObjectState.keyframes.prev === 'number' ? activeObjectState.keyframes.prev : null;
                if (frame !== null && isAbleToChangeFrame()) {
                    changeFrame(frame);
                }
            }
        },
    };

    if (activeObjectState) {
        return (
            <Layout.Sider {...siderProps}>
                {/* eslint-disable-next-line */}
                <span
                    className='cvat-objects-sidebar-sider'
                    onClick={collapse}
                >
                    {sidebarCollapsed ? <MenuFoldOutlined title='Show' /> : <MenuUnfoldOutlined title='Hide' />}
                </span>
                <GlobalHotKeys keyMap={subKeyMap} handlers={handlers} />
                <div className='cvat-sidebar-collapse-button-spacer' />
                <ObjectSwitcher
                    currentLabel={activeObjectState.label.name}
                    clientID={activeObjectState.clientID}
                    occluded={activeObjectState.occluded}
                    objectsCount={filteredStates.length}
                    currentIndex={filteredStates.indexOf(activeObjectState)}
                    normalizedKeyMap={normalizedKeyMap}
                    nextObject={nextObject}
                />
                <ObjectBasicsEditor
                    currentLabel={activeObjectState.label.id}
                    labels={applicableLabels}
                    changeLabel={(value: Label): void => {
                        jobInstance.logger.log(EventScope.changeLabel, {
                            object_id: activeObjectState.clientID,
                            from: activeObjectState.label.id,
                            to: value.id,
                        });
                        activeObjectState.label = value;
                        updateAnnotations([activeObjectState]);
                    }}
                />
                <ObjectButtonsContainer
                    readonly={false}
                    clientID={activeObjectState.clientID}
                    outsideDisabled
                    hiddenDisabled
                    keyframeDisabled
                />
                {activeAttribute ? (
                    <>
                        <AttributeSwitcher
                            currentAttribute={activeAttribute.name}
                            currentIndex={activeObjectState.label.attributes.indexOf(activeAttribute)}
                            attributesCount={activeObjectState.label.attributes.length}
                            normalizedKeyMap={normalizedKeyMap}
                            nextAttribute={nextAttribute}
                        />
                        <AttributeEditor
                            clientID={activeObjectState.clientID}
                            attribute={activeAttribute}
                            currentValue={activeObjectState.attributes[activeAttribute.id]}
                            onChange={(value: string) => {
                                const { attributes } = activeObjectState;
                                jobInstance.logger.log(EventScope.changeAttribute, {
                                    id: activeAttribute.id,
                                    object_id: activeObjectState.clientID,
                                    value,
                                });
                                attributes[activeAttribute.id] = value;
                                activeObjectState.attributes = attributes;
                                updateAnnotations([activeObjectState]);
                            }}
                        />
                    </>
                ) : (
                    <div className='attribute-annotations-sidebar-not-found-wrapper'>
                        <Text strong>No attributes found</Text>
                    </div>
                )}

                {!sidebarCollapsed && <AppearanceBlock />}
            </Layout.Sider>
        );
    }

    return (
        <Layout.Sider {...siderProps}>
            {/* eslint-disable-next-line */}
            <span
                className='cvat-objects-sidebar-sider'
                onClick={collapse}
            >
                {sidebarCollapsed ? <MenuFoldOutlined title='Show' /> : <MenuUnfoldOutlined title='Hide' />}
            </span>
            <div className='cvat-sidebar-collapse-button-spacer' />
            <div className='attribute-annotations-sidebar-not-found-wrapper'>
                <Text strong>No objects found</Text>
            </div>
        </Layout.Sider>
    );
}

export default connect(mapStateToProps, mapDispatchToProps)(AttributeAnnotationSidebar);

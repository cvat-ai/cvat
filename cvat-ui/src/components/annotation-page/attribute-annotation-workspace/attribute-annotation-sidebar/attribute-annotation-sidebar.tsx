// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import Layout, { SiderProps } from 'antd/lib/layout';
import Text from 'antd/lib/typography/Text';

import { filterApplicableLabels } from 'utils/filter-applicable-labels';
import { Label } from 'cvat-core-wrapper';
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
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import { ShortcutScope } from 'utils/enums';
import { subKeyMap } from 'utils/component-subkeymap';
import AttributeEditor from './attribute-editor';
import AttributeSwitcher from './attribute-switcher';
import ObjectBasicsEditor from './object-basics-edtior';
import ObjectSwitcher from './object-switcher';

interface StateToProps {
    activatedStateID: number | null;
    activatedAttributeID: number | null;
    states: any[];
    labels: any[];
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

const componentShortcuts = {
    NEXT_ATTRIBUTE: {
        name: 'Next attribute',
        description: 'Go to the next attribute',
        sequences: ['down'],
        scope: ShortcutScope.ATTRIBUTE_ANNOTATION_WORKSPACE,
    },
    PREVIOUS_ATTRIBUTE: {
        name: 'Previous attribute',
        description: 'Go to the previous attribute',
        sequences: ['up'],
        scope: ShortcutScope.ATTRIBUTE_ANNOTATION_WORKSPACE,
    },
    NEXT_OBJECT: {
        name: 'Next object',
        description: 'Go to the next object',
        sequences: ['tab'],
        scope: ShortcutScope.ATTRIBUTE_ANNOTATION_WORKSPACE,
    },
    PREVIOUS_OBJECT: {
        name: 'Previous object',
        description: 'Go to the previous object',
        sequences: ['shift+tab'],
        scope: ShortcutScope.ATTRIBUTE_ANNOTATION_WORKSPACE,
    },
    SWITCH_LOCK: {
        name: 'Lock/unlock an object',
        description: 'Change locked state for an active object',
        sequences: ['l'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    SWITCH_OCCLUDED: {
        name: 'Switch occluded',
        description: 'Change occluded property for an active object',
        sequences: ['q', '/'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    SWITCH_PINNED: {
        name: 'Switch pinned property',
        description: 'Change pinned property for an active object',
        sequences: ['p'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    NEXT_KEY_FRAME: {
        name: 'Next keyframe',
        description: 'Go to the next keyframe of an active track',
        sequences: ['r'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    PREV_KEY_FRAME: {
        name: 'Previous keyframe',
        description: 'Go to the previous keyframe of an active track',
        sequences: ['e'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
};

registerComponentShortcuts(componentShortcuts);

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            annotations: {
                activatedStateID,
                activatedAttributeID,
                states,
                zLayer: { cur },
            },
            job: { labels },
            canvas: { ready: canvasIsReady },
        },
        shortcuts: { keyMap, normalizedKeyMap },
    } = state;

    return {
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

    const handlers: Record<keyof typeof componentShortcuts, (event?: KeyboardEvent) => void> = {
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
                if (frame !== null && isAbleToChangeFrame(frame)) {
                    changeFrame(frame);
                }
            }
        },
        PREV_KEY_FRAME: (event: KeyboardEvent | undefined) => {
            preventDefault(event);
            if (activeObjectState && activeObjectState.objectType === ObjectType.TRACK) {
                const frame =
                    typeof activeObjectState.keyframes.prev === 'number' ? activeObjectState.keyframes.prev : null;
                if (frame !== null && isAbleToChangeFrame(frame)) {
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
                <GlobalHotKeys keyMap={subKeyMap(componentShortcuts, keyMap)} handlers={handlers} />
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

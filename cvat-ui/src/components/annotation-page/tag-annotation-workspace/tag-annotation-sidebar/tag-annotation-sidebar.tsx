// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, useEffect, useCallback } from 'react';
import { connect } from 'react-redux';
import { Action } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { Row, Col } from 'antd/lib/grid';
import {
    MenuFoldOutlined, MenuUnfoldOutlined, PlusOutlined,
} from '@ant-design/icons';
import Layout, { SiderProps } from 'antd/lib/layout';
import Checkbox, { CheckboxChangeEvent } from 'antd/lib/checkbox/Checkbox';
import Button from 'antd/lib/button/button';
import Text from 'antd/lib/typography/Text';

import {
    createAnnotationsAsync,
    removeObject as removeObjectAction,
    changeFrameAsync,
    rememberObject,
} from 'actions/annotation-actions';
import {
    getCore, Label, LabelType, ObjectType, ObjectState,
    Job, FrameData,
} from 'cvat-core-wrapper';
import { CombinedState } from 'reducers';
import { filterApplicableForType } from 'utils/filter-applicable-labels';
import LabelSelector from 'components/label-selector/label-selector';
import isAbleToChangeFrame from 'utils/is-able-to-change-frame';
import GlobalHotKeys, { KeyMap } from 'utils/mousetrap-react';
import { ShortcutScope } from 'utils/enums';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import { subKeyMap } from 'utils/component-subkeymap';
import ShortcutsSelect from './shortcuts-select';

const cvat = getCore();

interface StateToProps {
    states: ObjectState[];
    labels: Label[];
    jobInstance: Job;
    frameNumber: number;
    keyMap: KeyMap;
    normalizedKeyMap: Record<string, string>;
    frameData: FrameData;
    showDeletedFrames: boolean;
}

interface DispatchToProps {
    removeObject(objectState: ObjectState): void;
    createAnnotations(objectStates: ObjectState[]): void;
    changeFrame(frame: number, fillBuffer?: boolean, frameStep?: number): void;
    onRememberObject(labelID: number): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            player: {
                frame: { number: frameNumber, data: frameData },
            },
            annotations: { states },
            job: { instance: jobInstance, labels },
        },
        shortcuts: { keyMap, normalizedKeyMap },
        settings: {
            player: { showDeletedFrames },
        },
    } = state;

    return {
        jobInstance,
        labels,
        states,
        frameNumber,
        keyMap,
        normalizedKeyMap,
        frameData,
        showDeletedFrames,
    };
}

const componentShortcuts = {
    SWITCH_DRAW_MODE_TAG_ANNOTATION: {
        name: 'Create a tag',
        description: 'Add a new tag, corresponding to the selected label.',
        sequences: ['n'],
        scope: ShortcutScope.TAG_ANNOTATION_WORKSPACE,
    },
};

registerComponentShortcuts(componentShortcuts);

function mapDispatchToProps(dispatch: ThunkDispatch<CombinedState, {}, Action>): DispatchToProps {
    return {
        changeFrame(frame: number, fillBuffer?: boolean, frameStep?: number): void {
            dispatch(changeFrameAsync(frame, fillBuffer, frameStep));
        },
        createAnnotations(objectStates: ObjectState[]): void {
            dispatch(createAnnotationsAsync(objectStates));
        },
        removeObject(objectState: ObjectState): void {
            dispatch(removeObjectAction(objectState, false));
        },
        onRememberObject(labelID: number): void {
            dispatch(rememberObject({ activeObjectType: ObjectType.TAG, activeLabelID: labelID }));
        },
    };
}

function TagAnnotationSidebar(props: StateToProps & DispatchToProps): JSX.Element {
    const {
        states,
        labels,
        removeObject,
        jobInstance,
        changeFrame,
        frameNumber,
        onRememberObject,
        createAnnotations,
        keyMap,
        frameData,
        showDeletedFrames,
    } = props;

    const preventDefault = (event: KeyboardEvent | undefined): void => {
        if (event) {
            event.preventDefault();
        }
    };

    const [applicableLabels, setApplicableLabels] = useState<Label[]>(
        filterApplicableForType(LabelType.TAG, labels),
    );
    const controlsDisabled = !applicableLabels.length || frameData.deleted;
    const defaultLabelID = applicableLabels.length ? applicableLabels[0].id as number : null;

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [frameTags, setFrameTags] = useState([] as any[]);
    const [selectedLabelID, setSelectedLabelID] = useState<number | null>(defaultLabelID);
    const [skipFrame, setSkipFrame] = useState(false);

    useEffect(() => {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
    }, []);

    useEffect(() => {
        setApplicableLabels(filterApplicableForType(LabelType.TAG, labels));
    }, [labels]);

    useEffect(() => {
        const listener = (event: Event): void => {
            if (
                (event as TransitionEvent).propertyName === 'width' &&
                ((event.target as any).classList as DOMTokenList).contains('cvat-tag-annotation-sidebar')
            ) {
                window.dispatchEvent(new Event('resize'));
            }
        };

        const [sidebar] = window.document.getElementsByClassName('cvat-tag-annotation-sidebar');

        sidebar.addEventListener('transitionend', listener);

        return () => {
            sidebar.removeEventListener('transitionend', listener);
        };
    }, []);

    useEffect(() => {
        const tags = states.filter((objectState: ObjectState): boolean => (
            objectState.objectType === ObjectType.TAG),
        );
        setFrameTags(tags);
    }, [states]);

    const siderProps: SiderProps = {
        className: 'cvat-tag-annotation-sidebar',
        theme: 'light',
        width: 300,
        collapsedWidth: 0,
        reverseArrow: true,
        collapsible: true,
        trigger: null,
        collapsed: sidebarCollapsed,
    };

    const onChangeLabel = (value: any): void => {
        setSelectedLabelID(value.id);
    };

    const onRemoveTag = useCallback((labelID: number): void => {
        const objectState = frameTags.find((tag: ObjectState): boolean => tag.label.id === labelID);
        if (objectState) {
            removeObject(objectState);
        }
    }, [frameTags]);

    const onChangeFrame = async (): Promise<void> => {
        const frame = await jobInstance.frames.search(
            { notDeleted: !showDeletedFrames },
            frameNumber + 1,
            jobInstance.stopFrame,
        );
        if (frame !== null && isAbleToChangeFrame(frame)) {
            changeFrame(frame);
        }
    };

    const onAddTag = useCallback((labelID: number): void => {
        if (frameTags.every((objectState: ObjectState): boolean => objectState.label.id !== labelID)) {
            onRememberObject(labelID);

            createAnnotations([
                new cvat.classes.ObjectState({
                    objectType: ObjectType.TAG,
                    label: labels.filter((label: any) => label.id === labelID)[0],
                    frame: frameNumber,
                }),
            ]);

            if (skipFrame) {
                onChangeFrame();
            }
        }
    }, [frameTags, skipFrame]);

    const onShortcutPress = useCallback((labelID: number) => {
        if (frameTags.some((tag: ObjectState) => tag.label.id === labelID)) {
            onRemoveTag(labelID);
        } else {
            onAddTag(labelID);
        }
    }, [frameTags, onAddTag, onRemoveTag]);

    const handlers: Record<keyof typeof componentShortcuts, (event?: KeyboardEvent) => void> = {
        SWITCH_DRAW_MODE_TAG_ANNOTATION: (event: KeyboardEvent | undefined) => {
            preventDefault(event);
            if (selectedLabelID !== null) {
                onAddTag(selectedLabelID);
            }
        },
    };

    return controlsDisabled ? (
        <Layout.Sider {...siderProps}>
            {/* eslint-disable-next-line */}
            <span
                className='cvat-objects-sidebar-sider'
                onClick={() => {
                    setSidebarCollapsed(!sidebarCollapsed);
                }}
            >
                {sidebarCollapsed ? <MenuFoldOutlined title='Show' /> : <MenuUnfoldOutlined title='Hide' />}
            </span>
            <Row justify='center' className='cvat-tag-annotation-sidebar-empty'>
                <Col>
                    <Text strong>Can&apos;t place tag on this frame.</Text>
                </Col>
            </Row>
        </Layout.Sider>
    ) : (
        <>
            <GlobalHotKeys keyMap={subKeyMap(componentShortcuts, keyMap)} handlers={handlers} />
            <Layout.Sider {...siderProps}>
                {/* eslint-disable-next-line */}
                <span
                    className='cvat-objects-sidebar-sider'
                    onClick={() => {
                        setSidebarCollapsed(!sidebarCollapsed);
                    }}
                >
                    {sidebarCollapsed ? <MenuFoldOutlined title='Show' /> : <MenuUnfoldOutlined title='Hide' />}
                </span>
                <Row justify='start' className='cvat-tag-annotation-sidebar-tag-label'>
                    <Col>
                        <Text strong>Tag label:</Text>
                    </Col>
                </Row>
                <Row justify='start' className='cvat-tag-annotation-sidebar-label-select'>
                    <Col>
                        <LabelSelector
                            labels={applicableLabels}
                            value={selectedLabelID}
                            onChange={onChangeLabel}
                            onEnterPress={onAddTag}
                        />
                        <Button
                            type='primary'
                            className='cvat-add-tag-button'
                            onClick={() => onAddTag(selectedLabelID as number)}
                            icon={<PlusOutlined />}
                        />
                    </Col>
                </Row>
                <Row className='cvat-tag-annotation-sidebar-checkbox-skip-frame'>
                    <Col>
                        <Checkbox
                            checked={skipFrame}
                            onChange={(event: CheckboxChangeEvent): void => {
                                setSkipFrame(event.target.checked);
                            }}
                        >
                            Automatically go to the next frame
                        </Checkbox>
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <ShortcutsSelect labels={applicableLabels} onShortcutPress={onShortcutPress} />
                    </Col>
                </Row>
                <Row justify='center' className='cvat-tag-annotation-sidebar-shortcut-help'>
                    <Col>
                        <Text>
                            Use configured shortcuts to add a new tag.
                            If a tag with such label is already exists on the frame, it will be removed.
                        </Text>
                    </Col>
                </Row>
            </Layout.Sider>
        </>
    );
}

export default connect(mapStateToProps, mapDispatchToProps)(TagAnnotationSidebar);

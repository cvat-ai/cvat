// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { GlobalHotKeys, ExtendedKeyMapOptions } from 'react-hotkeys';
import { Action } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { Row, Col } from 'antd/lib/grid';
import Layout, { SiderProps } from 'antd/lib/layout';
import Button from 'antd/lib/button/button';
import Icon from 'antd/lib/icon';
import Text from 'antd/lib/typography/Text';
import Select from 'antd/lib/select';

import {
    createAnnotationsAsync,
    removeObjectAsync,
    changeFrameAsync,
    rememberObject,
} from 'actions/annotation-actions';
import { Canvas, isAbleToChangeFrame } from 'cvat-canvas-wrapper';
import { CombinedState, ObjectType } from 'reducers/interfaces';
import Tag from 'antd/lib/tag';
import getCore from 'cvat-core-wrapper';


const cvat = getCore();

interface StateToProps {
    states: any[];
    labels: any[];
    jobInstance: any;
    canvasInstance: Canvas;
    frameNumber: number;
    keyMap: Record<string, ExtendedKeyMapOptions>;
    normalizedKeyMap: Record<string, string>;
}

interface DispatchToProps {
    removeObject(jobInstance: any, objectState: any): void;
    createAnnotations(jobInstance: any, frame: number, objectStates: any[]): void;
    changeFrame(frame: number, fillBuffer?: boolean, frameStep?: number): void;
    onRememberObject(labelID: number): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            player: {
                frame: {
                    number: frameNumber,
                },
            },
            annotations: {
                states,
            },
            job: {
                instance: jobInstance,
                labels,
            },
            canvas: {
                instance: canvasInstance,
            },
        },
        shortcuts: {
            keyMap,
            normalizedKeyMap,
        },
    } = state;

    return {
        jobInstance,
        labels,
        states,
        canvasInstance,
        frameNumber,
        keyMap,
        normalizedKeyMap,
    };
}

function mapDispatchToProps(dispatch: ThunkDispatch<CombinedState, {}, Action>): DispatchToProps {
    return {
        changeFrame(frame: number, fillBuffer?: boolean, frameStep?: number): void {
            dispatch(changeFrameAsync(frame, fillBuffer, frameStep));
        },
        createAnnotations(jobInstance: any, frame: number, objectStates: any[]): void {
            dispatch(createAnnotationsAsync(jobInstance, frame, objectStates));
        },
        removeObject(jobInstance: any, objectState: any): void {
            dispatch(removeObjectAsync(jobInstance, objectState, true));
        },
        onRememberObject(labelID: number): void {
            dispatch(rememberObject(ObjectType.TAG, labelID));
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
        canvasInstance,
        frameNumber,
        onRememberObject,
        createAnnotations,
        keyMap,
    } = props;

    const preventDefault = (event: KeyboardEvent | undefined): void => {
        if (event) {
            event.preventDefault();
        }
    };

    const defaultLabelID = labels[0].id;

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [frameTags, setFrameTags] = useState([] as any[]);
    const [selectedLabelID, setSelectedLabelID] = useState(defaultLabelID);

    useEffect(() => {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
    }, []);

    useEffect(() => {
        setFrameTags(states.filter(
            (objectState: any): boolean => objectState.objectType === ObjectType.TAG,
        ));
    }, [states]);

    const siderProps: SiderProps = {
        className: 'tag-annotation-sidebar',
        theme: 'light',
        width: 300,
        collapsedWidth: 0,
        reverseArrow: true,
        collapsible: true,
        trigger: null,
        collapsed: sidebarCollapsed,
    };

    const onChangeLabel = (value: string): void => {
        setSelectedLabelID(Number.parseInt(value, 10));
    };

    const onRemoveState = (objectState: any): void => {
        removeObject(jobInstance, objectState);
    };

    const onChangeFrame = (): void => {
        const frame = Math.min(jobInstance.stopFrame, frameNumber + 1);

        if (isAbleToChangeFrame(canvasInstance)) {
            changeFrame(frame);
        }
    };

    const onAddTag = (): void => {
        onRememberObject(selectedLabelID);

        const objectState = new cvat.classes.ObjectState({
            objectType: ObjectType.TAG,
            label: labels.filter((label: any) => label.id === selectedLabelID)[0],
            frame: frameNumber,
        });

        createAnnotations(jobInstance, frameNumber, [objectState]);

        onChangeFrame();
    };

    const subKeyMap = {
        SWITCH_DRAW_MODE: keyMap.SWITCH_DRAW_MODE,
    };

    const handlers = {
        SWITCH_DRAW_MODE: (event: KeyboardEvent | undefined) => {
            preventDefault(event);
            onAddTag();
        },
    };

    return (
        <>
            <GlobalHotKeys keyMap={subKeyMap} handlers={handlers} allowChanges />
            <Layout.Sider {...siderProps}>
                {/* eslint-disable-next-line */}
                <span
                    className={`cvat-objects-sidebar-sider
                        ant-layout-sider-zero-width-trigger
                        ant-layout-sider-zero-width-trigger-left`}
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                >
                    {sidebarCollapsed ? <Icon type='menu-fold' title='Show' />
                        : <Icon type='menu-unfold' title='Hide' />}
                </span>
                <Row type='flex' justify='start' className='tag-annotation-sidebar-label-select'>
                    <Col>
                        <Text strong>Tag label</Text>
                        <Select
                            value={`${selectedLabelID}`}
                            onChange={onChangeLabel}
                            size='default'

                        >
                            {
                                labels.map((label: any) => (
                                    <Select.Option
                                        key={label.id}
                                        value={`${label.id}`}
                                    >
                                        {label.name}
                                    </Select.Option>
                                ))
                            }
                        </Select>
                    </Col>
                </Row>
                <Row type='flex' justify='space-around' className='tag-annotation-sidebar-buttons'>
                    <Col span={8}>
                        <Button onClick={onAddTag}>Add tag</Button>
                    </Col>
                    <Col span={8}>
                        <Button onClick={onChangeFrame}>Skip frame</Button>
                    </Col>
                </Row>
                <Row type='flex' justify='start'>
                    <Col>
                        <Text strong>Frame tags:&nbsp;</Text>
                        {frameTags.map((tag: any) => (
                            <Tag
                                color={tag.label.color}
                                onClose={() => { onRemoveState(tag); }}
                                key={tag.clientID}
                                closable
                            >
                                {tag.label.name}
                            </Tag>
                        ))}
                    </Col>
                </Row>
                <Row type='flex' justify='center' className='tag-annotation-sidebar-shortcut-help'>
                    <Col>
                        <Text>
                            Use
                            <Text code>N</Text>
                            to add selected tag
                            <br />
                            or
                            <Text code>→</Text>
                            to skip frame
                        </Text>
                    </Col>
                </Row>
            </Layout.Sider>
        </>
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(TagAnnotationSidebar);

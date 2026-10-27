// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    useState, ReactPortal, useRef, useEffect,
} from 'react';
import ReactDOM from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import Form from 'antd/lib/form';
import Input, { InputRef } from 'antd/lib/input';
import Button from 'antd/lib/button';
import InputNumber from 'antd/lib/input-number';
import Select from 'antd/lib/select';
import { Row, Col } from 'antd/lib/grid';
import { Store } from 'antd/lib/form/interface';

import { reviewActions, finishIssueAsync, NewIssueContext } from 'actions/review-actions';
import { CombinedState } from 'reducers';
import { DimensionType, ObjectType, ShapeType } from 'cvat-core-wrapper';
import { shallowEqual } from 'utils/redux';
import { useIsMounted } from 'utils/hooks';
import { useDialogPositioning } from './use-dialog-positioning';

interface FormProps {
    top: number;
    left: number;
    angle: number;
    scale: number;
    fetching: boolean;
    clientCoordinates: [number, number];
    canvasRect: DOMRect | null;
    submit(message: string, context?: NewIssueContext): void;
    cancel(): void;
}

function MessageForm(props: Readonly<FormProps>): JSX.Element {
    const {
        top, left, angle, scale, fetching, submit, cancel, clientCoordinates, canvasRect,
    } = props;

    const dialogRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<InputRef>(null);
    const {
        job, frame, objects, objectClientID,
    } = useSelector((state: CombinedState) => ({
        job: state.annotation.job.instance,
        frame: state.annotation.player.frame.number,
        objects: state.annotation.annotations.states,
        objectClientID: state.review.newIssue.objectClientID,
    }), shallowEqual);
    const is3D = job.dimension === DimensionType.DIMENSION_3D;

    const position = useDialogPositioning({
        ref: dialogRef,
        top,
        left,
        scale,
        angle,
        clientCoordinates,
        canvasRect,
    });

    useEffect(() => {
        const timeout = setTimeout(() => inputRef.current?.focus(), 0);
        return () => clearTimeout(timeout);
    }, []);

    function handleSubmit(values: Store): void {
        submit(values.issue_description, is3D ? {
            objectClientID: values.issue_object === 'point' ? null : values.issue_object,
            startFrame: values.issue_start_frame,
            endFrame: values.issue_end_frame,
        } : undefined);
    }

    return (
        <div
            ref={dialogRef}
            className={`cvat-create-issue-dialog ${is3D ? 'cvat-create-issue-dialog-3d' : ''}`}
            style={{
                top: position.top,
                left: position.left,
                transform: `scale(${scale}) rotate(${angle}deg)`,
            }}
        >
            <Form
                onFinish={(values: Store) => handleSubmit(values)}
                disabled={fetching}
                layout='vertical'
                initialValues={{
                    issue_object: objectClientID ?? 'point',
                    issue_start_frame: frame,
                    issue_end_frame: frame,
                }}
            >
                {is3D && (
                    <>
                        <Form.Item name='issue_object' label='Applies to'>
                            <Select
                                className='cvat-create-issue-object'
                                options={[
                                    { value: 'point', label: 'Point only' },
                                    ...objects.filter((object) => !object.isGroundTruth &&
                                        object.shapeType === ShapeType.CUBOID && !object.outside &&
                                        [ObjectType.SHAPE, ObjectType.TRACK].includes(object.objectType))
                                        .map((object) => ({
                                            value: object.clientID,
                                            label: `${object.label.name} · ${object.objectType === ObjectType.TRACK ? 'Track' : 'Shape'} #${object.clientID}`,
                                        })),
                                ]}
                            />
                        </Form.Item>
                        <Row gutter={8}>
                            <Col span={12}>
                                <Form.Item
                                    name='issue_start_frame'
                                    label='From frame'
                                    dependencies={['issue_end_frame']}
                                    rules={[
                                        { required: true, message: 'Enter a start frame' },
                                        ({ getFieldValue }) => ({
                                            validator: (_, value) => (Number.isInteger(value) &&
                                                value >= job.startFrame && value <= frame &&
                                                value <= getFieldValue('issue_end_frame') ?
                                                Promise.resolve() : Promise.reject(new Error('Invalid frame range'))),
                                        }),
                                    ]}
                                >
                                    <InputNumber min={job.startFrame} max={frame} precision={0} />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    name='issue_end_frame'
                                    label='To frame'
                                    dependencies={['issue_start_frame']}
                                    rules={[
                                        { required: true, message: 'Enter an end frame' },
                                        ({ getFieldValue }) => ({
                                            validator: (_, value) => (Number.isInteger(value) &&
                                                value <= job.stopFrame && value >= frame &&
                                                value >= getFieldValue('issue_start_frame') ?
                                                Promise.resolve() : Promise.reject(new Error('Invalid frame range'))),
                                        }),
                                    ]}
                                >
                                    <InputNumber min={frame} max={job.stopFrame} precision={0} />
                                </Form.Item>
                            </Col>
                        </Row>
                    </>
                )}
                <Form.Item
                    name='issue_description'
                    rules={[{ required: true, message: 'Please, fill out the field' }]}
                >
                    <Input ref={inputRef} autoComplete='off' placeholder='Please, describe the issue' />
                </Form.Item>
                <Row justify='space-between'>
                    <Col>
                        <Button
                            onClick={cancel}
                            disabled={fetching}
                            className='cvat-create-issue-dialog-cancel-button'
                        >
                            Cancel
                        </Button>
                    </Col>
                    <Col>
                        <Button
                            loading={fetching}
                            disabled={fetching}
                            type='primary'
                            htmlType='submit'
                            className='cvat-create-issue-dialog-submit-button'
                        >
                            Submit
                        </Button>
                    </Col>
                </Row>
            </Form>
        </div>
    );
}

interface Props {
    container?: HTMLElement;
    top: number;
    left: number;
    angle: number;
    scale: number;
    clientCoordinates: [number, number];
    canvasRect: DOMRect | null;
    onCreateIssue: () => void;
    onFetchingChange?: (fetching: boolean) => void;
}

export default function CreateIssueDialog(props: Props): ReactPortal {
    const [fetching, setFetching] = useState(false);
    const isMounted = useIsMounted();
    const dispatch = useDispatch();
    const {
        top, left, angle, scale, clientCoordinates, canvasRect, onCreateIssue,
        container,
    } = props;

    useEffect(() => {
        props.onFetchingChange?.(fetching);
        return () => props.onFetchingChange?.(false);
    }, [fetching]);

    return ReactDOM.createPortal(
        <MessageForm
            top={top}
            left={left}
            angle={angle}
            scale={scale}
            clientCoordinates={clientCoordinates}
            canvasRect={canvasRect}
            fetching={fetching}
            submit={(message: string, context?: NewIssueContext) => {
                setFetching(true);
                dispatch(finishIssueAsync(message, context)).finally(() => {
                    if (isMounted()) {
                        setFetching(false);
                    }
                    onCreateIssue();
                });
            }}
            cancel={() => {
                dispatch(reviewActions.cancelIssue());
            }}
        />,
        container || window.document.getElementById('cvat_canvas_attachment_board') as HTMLElement,
    );
}

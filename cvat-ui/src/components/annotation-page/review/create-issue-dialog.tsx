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
import { Row, Col } from 'antd/lib/grid';
import { Store } from 'antd/lib/form/interface';

import { reviewActions, finishIssueAsync } from 'actions/review-actions';
import { CombinedState } from 'reducers';
import { DimensionType } from 'cvat-core-wrapper';
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
    submit(message: string): void;
    cancel(): void;
}

function MessageForm(props: Readonly<FormProps>): JSX.Element {
    const {
        top, left, angle, scale, fetching, submit, cancel, clientCoordinates, canvasRect,
    } = props;

    const dialogRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<InputRef>(null);
    const is3D = useSelector((state: CombinedState) => (
        state.annotation.job.instance.dimension === DimensionType.DIMENSION_3D
    ));

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
                onFinish={(values: Store) => submit(values.issue_description)}
                disabled={fetching}
                layout='vertical'
            >
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
    onCreateIssue?: () => void;
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
            submit={(message: string) => {
                setFetching(true);
                dispatch(finishIssueAsync(message)).finally(() => {
                    if (isMounted()) {
                        setFetching(false);
                    }
                    onCreateIssue?.();
                });
            }}
            cancel={() => {
                dispatch(reviewActions.cancelIssue());
            }}
        />,
        container || window.document.getElementById('cvat_canvas_attachment_board') as HTMLElement,
    );
}

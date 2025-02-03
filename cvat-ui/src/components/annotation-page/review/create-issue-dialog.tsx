// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, ReactPortal } from 'react';
import ReactDOM from 'react-dom';
import { useDispatch } from 'react-redux';
import Form from 'antd/lib/form';
import Input from 'antd/lib/input';
import Button from 'antd/lib/button';
import { Row, Col } from 'antd/lib/grid';
import { Store } from 'antd/lib/form/interface';

import { reviewActions, finishIssueAsync } from 'actions/review-actions';
import { useIsMounted } from 'utils/hooks';

interface FormProps {
    top: number;
    left: number;
    angle: number;
    scale: number;
    fetching: boolean;
    submit(message: string): void;
    cancel(): void;
}

function MessageForm(props: FormProps): JSX.Element {
    const {
        top, left, angle, scale, fetching, submit, cancel,
    } = props;

    function handleSubmit(values: Store): void {
        submit(values.issue_description);
    }

    return (
        <Form
            className='cvat-create-issue-dialog'
            style={{ top, left, transform: `scale(${scale}) rotate(${angle}deg)` }}
            onFinish={(values: Store) => handleSubmit(values)}
        >
            <Form.Item
                name='issue_description'
                rules={[{ required: true, message: 'Please, fill out the field' }]}
            >
                <Input autoFocus autoComplete='off' placeholder='Please, describe the issue' />
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
    );
}

interface Props {
    top: number;
    left: number;
    angle: number;
    scale: number;
    onCreateIssue: () => void;
}

export default function CreateIssueDialog(props: Props): ReactPortal {
    const [fetching, setFetching] = useState(false);
    const isMounted = useIsMounted();
    const dispatch = useDispatch();
    const {
        top, left, angle, scale, onCreateIssue,
    } = props;

    return ReactDOM.createPortal(
        <MessageForm
            top={top}
            left={left}
            angle={angle}
            scale={scale}
            fetching={fetching}
            submit={(message: string) => {
                setFetching(true);
                dispatch(finishIssueAsync(message)).finally(() => {
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
        window.document.getElementById('cvat_canvas_attachment_board') as HTMLElement,
    );
}

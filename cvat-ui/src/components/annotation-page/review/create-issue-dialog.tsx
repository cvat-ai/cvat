// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { ReactPortal } from 'react';
import ReactDOM from 'react-dom';
import { useDispatch } from 'react-redux';
import Form from 'antd/lib/form';
import Input from 'antd/lib/input';
import Button from 'antd/lib/button';
import { Row, Col } from 'antd/lib/grid';

import { reviewActions, finishIssueAsync } from 'actions/review-actions';
import { Store } from 'antd/lib/form/interface';

interface FormProps {
    top: number;
    left: number;
    angle: number;
    scale: number;
    submit(message: string): void;
    cancel(): void;
}

function MessageForm(props: FormProps): JSX.Element {
    const {
        top, left, angle, scale, submit, cancel,
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
            <Form.Item name='issue_description' rules={[{ required: true, message: 'Please, fill out the field' }]}>
                <Input autoComplete='off' placeholder='Please, describe the issue' />
            </Form.Item>
            <Row justify='space-between'>
                <Col>
                    <Button onClick={cancel} type='ghost'>
                        Cancel
                    </Button>
                </Col>
                <Col>
                    <Button type='primary' htmlType='submit'>
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
}

export default function CreateIssueDialog(props: Props): ReactPortal {
    const dispatch = useDispatch();
    const {
        top, left, angle, scale,
    } = props;

    return ReactDOM.createPortal(
        <MessageForm
            top={top}
            left={left}
            angle={angle}
            scale={scale}
            submit={(message: string) => {
                dispatch(finishIssueAsync(message));
            }}
            cancel={() => {
                dispatch(reviewActions.cancelIssue());
            }}
        />,
        window.document.getElementById('cvat_canvas_attachment_board') as HTMLElement,
    );
}

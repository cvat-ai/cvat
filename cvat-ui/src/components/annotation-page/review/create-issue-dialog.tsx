// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { ReactPortal } from 'react';
import ReactDOM from 'react-dom';
import { useDispatch } from 'react-redux';
import Form, { FormComponentProps } from 'antd/lib/form';
import Input from 'antd/lib/input';
import Button from 'antd/lib/button';
import { Row, Col } from 'antd/lib/grid';

import { reviewActions, finishIssueAsync } from 'actions/review-actions';

type FormProps = {
    top: number;
    left: number;
    submit(message: string): void;
    cancel(): void;
} & FormComponentProps;

function MessageForm(props: FormProps): JSX.Element {
    const {
        form: { getFieldDecorator },
        form,
        top,
        left,
        submit,
        cancel,
    } = props;

    function handleSubmit(e: React.FormEvent): void {
        e.preventDefault();
        form.validateFields((error, values): void => {
            if (!error) {
                submit(values.issue_description);
            }
        });
    }

    return (
        <Form className='cvat-create-issue-dialog' style={{ top, left }} onSubmit={handleSubmit}>
            <Form.Item>
                {getFieldDecorator('issue_description', {
                    rules: [{ required: true, message: 'Please, fill out the field' }],
                })(<Input autoComplete='off' placeholder='Please, describe the issue' />)}
            </Form.Item>
            <Row type='flex' justify='space-between'>
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

const WrappedMessageForm = Form.create<FormProps>()(MessageForm);

interface Props {
    top: number;
    left: number;
}

export default function CreateIssueDialog(props: Props): ReactPortal {
    const dispatch = useDispatch();
    const { top, left } = props;

    return ReactDOM.createPortal(
        <WrappedMessageForm
            top={top}
            left={left}
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

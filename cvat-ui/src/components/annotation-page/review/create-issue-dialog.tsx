// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { ReactPortal, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useSelector, useDispatch } from 'react-redux';
import Form, { FormComponentProps } from 'antd/lib/form';
import Input from 'antd/lib/input';
import Button from 'antd/lib/button';
import { Row, Col } from 'antd/lib/grid';

import { CombinedState } from 'reducers/interfaces';
import { reviewActions, finishIssueAsync } from 'actions/review-actions';

type FormProps = {
    top: number;
    left: number;
    submit(message: string): void;
    cancel(): void;
} & FormComponentProps;

function MessageForm(props: FormProps): JSX.Element {
    const ref = useRef(null);
    const {
        form: { getFieldDecorator },
        form,
        top,
        left,
        submit,
        cancel,
    } = props;

    useEffect(() => {
        const { innerWidth, innerHeight } = window;
        const htmlInstance = window.document.getElementsByClassName('cvat-create-issue-dialog')[0] as HTMLElement;
        if (htmlInstance) {
            const width = htmlInstance.clientWidth;
            const height = htmlInstance.clientHeight;
            if (left + width > innerWidth) {
                htmlInstance.style.left = `${innerWidth - width}px`;
            }
            if (top + height > innerHeight) {
                htmlInstance.style.top = `${innerHeight - height}px`;
            }
        }
    });

    function handleSubmit(e: React.FormEvent): void {
        e.preventDefault();
        form.validateFields((error, values): void => {
            if (!error) {
                submit(values.issue_description);
            }
        });
    }

    return (
        <Form ref={ref} className='cvat-create-issue-dialog' style={{ top, left }} onSubmit={handleSubmit}>
            <Form.Item>
                {getFieldDecorator('issue_description', {
                    rules: [{ required: true, message: 'Please, fill out the field' }],
                })(<Input placeholder='Please, describe the issue' />)}
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

let { x, y } = { x: 0, y: 0 };
export default function CreateIssueDialog(): ReactPortal | null {
    const newIssueROI = useSelector((state: CombinedState): number[] | null => state.review.newIssueROI);
    const dispatch = useDispatch();
    useEffect(() => {
        const onMouseMove = (event: MouseEvent): void => {
            x = event.pageX;
            y = event.pageY;
        };

        window.document.body.addEventListener('mousemove', onMouseMove);
        return () => {
            window.document.body.removeEventListener('mousemove', onMouseMove);
        };
    }, []);
    if (newIssueROI) {
        return ReactDOM.createPortal(
            <WrappedMessageForm
                top={y}
                left={x}
                submit={(message: string) => {
                    dispatch(finishIssueAsync(message));
                }}
                cancel={() => {
                    dispatch(reviewActions.cancelIssue());
                }}
            />,
            window.document.body,
        );
    }

    return null;
}

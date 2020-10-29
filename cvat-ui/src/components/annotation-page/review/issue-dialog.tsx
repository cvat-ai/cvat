// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Row, Col } from 'antd/lib/grid';
import Comment from 'antd/lib/comment';
import Title from 'antd/lib/typography/Title';
import Tooltip from 'antd/lib/tooltip';
import Button from 'antd/lib/button';
import Input from 'antd/lib/input';
import Icon from 'antd/lib/icon';
import moment from 'moment';

interface Props {
    id: number;
    comments: any[];
    left: number;
    top: number;
    resolved: boolean;
    collapse: () => void;
    resolve: () => void;
    reopen: () => void;
    comment: (message: string) => void;
}

export default function IssueDialog(props: Props): JSX.Element {
    const [currentText, setCurrentText] = useState<string>('');
    const {
        comments, id, left, top, resolved, collapse, resolve, reopen, comment,
    } = props;

    useEffect(() => {
        const element = window.document.getElementById(`cvat_canvas_issue_region_${id}`);
        if (element) {
            element.style.display = '';
        }
    }, []);

    const lines = comments.map(
        (_comment: any): JSX.Element => {
            const created = _comment.createdDate ? moment(_comment.createdDate) : moment(moment.now());
            const diff = moment.duration(moment(moment.now()).diff(created)).humanize();

            return (
                <Comment
                    key={_comment.id}
                    author={_comment.owner ? _comment.owner.username : 'Unknown'}
                    content={<p>{_comment.message}</p>}
                    datetime={(
                        <Tooltip title={created.format('MMMM Do YYYY')}>
                            <span>{diff}</span>
                        </Tooltip>
                    )}
                />
            );
        },
    );

    const resolveButton = resolved ? (
        <Button type='primary' onClick={reopen}>
            Reopen
        </Button>
    ) : (
        <Button type='primary' onClick={resolve}>
            Resolve
        </Button>
    );

    return ReactDOM.createPortal(
        <div style={{ top, left }} className='cvat-issue-dialog'>
            <Row className='cvat-issue-dialog-header' type='flex' justify='space-between'>
                <Col>
                    <Title level={4}>{id >= 0 ? `Issue #${id}` : 'New Issue'}</Title>
                </Col>
                <Col>
                    <Tooltip title='Collapse the chat'>
                        <Icon type='close' onClick={collapse} />
                    </Tooltip>
                </Col>
            </Row>
            <Row className='cvat-issue-dialog-chat' type='flex' justify='start'>
                <Col style={{ display: 'block' }}>{lines}</Col>
            </Row>
            <Row className='cvat-issue-dialog-input' type='flex' justify='start'>
                <Col span={24}>
                    <Input
                        placeholder='Print a comment here..'
                        value={currentText}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                            setCurrentText(event.target.value);
                        }}
                    />
                </Col>
            </Row>
            <Row className='cvat-issue-dialog-footer' type='flex' justify='end'>
                <Col>
                    {currentText.length ? (
                        <Button
                            type='primary'
                            disabled={!currentText.length}
                            onClick={() => {
                                comment(currentText);
                                setCurrentText('');
                            }}
                        >
                            Comment
                        </Button>
                    ) : (
                        resolveButton
                    )}
                </Col>
            </Row>
        </div>,
        window.document.getElementById('cvat_canvas_attachment_board') as HTMLElement,
    );
}

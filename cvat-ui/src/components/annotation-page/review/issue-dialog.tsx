// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    useState, useEffect, useRef, useCallback,
} from 'react';
import ReactDOM from 'react-dom';
import { useDispatch } from 'react-redux';
import Modal from 'antd/lib/modal';
import { Row, Col } from 'antd/lib/grid';
import { CloseOutlined } from '@ant-design/icons';
import { Comment } from '@ant-design/compatible';
import Text from 'antd/lib/typography/Text';
import Button from 'antd/lib/button';
import Input from 'antd/lib/input';
import moment from 'moment';
import CVATTooltip from 'components/common/cvat-tooltip';
import { Issue, Comment as CommentModel } from 'cvat-core-wrapper';
import { deleteIssueAsync } from 'actions/review-actions';

interface Props {
    issue: Issue;
    left: number;
    top: number;
    resolved: boolean;
    isFetching: boolean;
    angle: number;
    scale: number;
    collapse: () => void;
    resolve: () => void;
    reopen: () => void;
    comment: (message: string) => void;
    highlight: () => void;
    blur: () => void;
}

export default function IssueDialog(props: Props): JSX.Element {
    const ref = useRef<HTMLDivElement>(null);
    const [currentText, setCurrentText] = useState<string>('');
    const dispatch = useDispatch();
    const {
        issue,
        left,
        top,
        scale,
        angle,
        resolved,
        isFetching,
        collapse,
        resolve,
        reopen,
        comment,
        highlight,
        blur,
    } = props;

    const { id, comments } = issue;

    useEffect(() => {
        if (!resolved) {
            setTimeout(highlight);
        } else {
            setTimeout(blur);
        }
    }, [resolved]);

    useEffect(() => {
        const listener = (event: WheelEvent): void => {
            event.stopPropagation();
        };

        if (ref.current) {
            const { current } = ref;
            current.addEventListener('wheel', listener);
            return () => {
                current.removeEventListener('wheel', listener);
            };
        }
        return () => {};
    }, [ref.current]);

    const onDeleteIssue = useCallback((): void => {
        Modal.confirm({
            title: `The issue${typeof id === 'number' ? ` #${id}` : ''} will be deleted.`,
            className: 'cvat-modal-confirm-remove-issue',
            onOk: () => {
                collapse();
                dispatch(deleteIssueAsync(id as number));
            },
            okButtonProps: {
                type: 'primary',
            },
            autoFocusButton: 'cancel',
            okText: 'Delete',
        });
    }, []);

    const lines = comments.map(
        (_comment: CommentModel): JSX.Element => {
            const created = _comment.createdDate ? moment(_comment.createdDate) : moment(moment.now());
            const diff = created.fromNow();

            return (
                <Comment
                    avatar={null}
                    key={_comment.id}
                    author={<Text strong>{_comment.owner ? _comment.owner.username : 'Unknown'}</Text>}
                    content={<p>{_comment.message}</p>}
                    datetime={(
                        <CVATTooltip title={created.format('MMMM Do YYYY')}>
                            <span>{diff}</span>
                        </CVATTooltip>
                    )}
                />
            );
        },
    );

    const resolveButton = resolved ? (
        <Button loading={isFetching} className='cvat-issue-dialog-reopen-button' type='primary' onClick={reopen}>
            Reopen
        </Button>
    ) : (
        <Button loading={isFetching} className='cvat-issue-dialog-resolve-button' type='primary' onClick={resolve}>
            Resolve
        </Button>
    );

    return ReactDOM.createPortal(
        <div
            style={{ top, left, transform: `scale(${scale}) rotate(${angle}deg)` }}
            ref={ref}
            className='cvat-issue-dialog'
        >
            <Row className='cvat-issue-dialog-header' justify='space-between'>
                <Col>
                    <Text strong>{typeof id === 'number' ? `Issue #${id}` : 'Issue'}</Text>
                </Col>
                <Col>
                    <CVATTooltip title='Collapse the chat'>
                        <CloseOutlined onClick={collapse} />
                    </CVATTooltip>
                </Col>
            </Row>
            <Row className='cvat-issue-dialog-chat' justify='start'>
                {
                    lines.length > 0 ? <Col style={{ display: 'block' }}>{lines}</Col> : (
                        <Col>No comments found</Col>
                    )
                }
            </Row>
            <Row className='cvat-issue-dialog-input' justify='start'>
                <Col span={24}>
                    <Input
                        placeholder='Type a comment here..'
                        value={currentText}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                            setCurrentText(event.target.value);
                        }}
                        onPressEnter={() => {
                            if (currentText) {
                                comment(currentText);
                                setCurrentText('');
                            }
                        }}
                    />
                </Col>
            </Row>
            <Row className='cvat-issue-dialog-footer' justify='space-between'>
                <Col>
                    <Button type='link' className='cvat-issue-dialog-remove-button' danger onClick={onDeleteIssue}>
                        Remove
                    </Button>
                </Col>
                <Col>
                    {currentText.length ? (
                        <Button
                            className='cvat-issue-dialog-comment-button'
                            loading={isFetching}
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

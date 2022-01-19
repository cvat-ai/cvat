// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    useState,
    useEffect,
    useRef,
    useCallback,
} from 'react';
import ReactDOM from 'react-dom';
import { useDispatch } from 'react-redux';
import Modal from 'antd/lib/modal';
import { Row, Col } from 'antd/lib/grid';
import { CloseOutlined } from '@ant-design/icons';
import Comment from 'antd/lib/comment';
import Text from 'antd/lib/typography/Text';
import Title from 'antd/lib/typography/Title';
import Button from 'antd/lib/button';
import Input from 'antd/lib/input';
import moment from 'moment';
import CVATTooltip from 'components/common/cvat-tooltip';
import { deleteIssueAsync } from 'actions/review-actions';

interface Props {
    id: number;
    comments: any[];
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
        comments,
        id,
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

    useEffect(() => {
        if (!resolved) {
            setTimeout(highlight);
        } else {
            setTimeout(blur);
        }
    }, [resolved]);

    const onDeleteIssue = useCallback((): void => {
        Modal.confirm({
            title: `The issue${id >= 0 ? ` #${id}` : ''} will be deleted.`,
            className: 'cvat-modal-confirm-remove-issue',
            onOk: () => {
                collapse();
                dispatch(deleteIssueAsync(id));
            },
            okButtonProps: {
                type: 'primary',
                danger: true,
            },
            okText: 'Delete',
        });
    }, []);

    const lines = comments.map(
        (_comment: any): JSX.Element => {
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
        <Button loading={isFetching} type='primary' onClick={reopen}>
            Reopen
        </Button>
    ) : (
        <Button loading={isFetching} type='primary' onClick={resolve}>
            Resolve
        </Button>
    );

    return ReactDOM.createPortal(
        <div style={{ top, left, transform: `scale(${scale}) rotate(${angle}deg)` }} ref={ref} className='cvat-issue-dialog'>
            <Row className='cvat-issue-dialog-header' justify='space-between'>
                <Col>
                    <Title level={4}>{id >= 0 ? `Issue #${id}` : 'Issue'}</Title>
                </Col>
                <Col>
                    <CVATTooltip title='Collapse the chat'>
                        <CloseOutlined onClick={collapse} />
                    </CVATTooltip>
                </Col>
            </Row>
            <Row className='cvat-issue-dialog-chat' justify='start'>
                <Col style={{ display: 'block' }}>{lines}</Col>
            </Row>
            <Row className='cvat-issue-dialog-input' justify='start'>
                <Col span={24}>
                    <Input
                        placeholder='Print a comment here..'
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
                    <Button type='link' danger onClick={onDeleteIssue}>
                        Remove
                    </Button>
                </Col>
                <Col>
                    {currentText.length ? (
                        <Button
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

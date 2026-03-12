// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Button from 'antd/lib/button';
import Space from 'antd/lib/space';
import { LinkOutlined, DisconnectOutlined, SaveOutlined } from '@ant-design/icons';
import { getLinkIdFromState } from '../utils/color';

interface Props {
    selected2d: any;
    selected3d: any;
    selectedLinkId: string | null;
    onLink: () => void;
    onUnlink: () => void;
    onSave: () => void;
}

function LinkControls(props: Readonly<Props>): JSX.Element {
    const {
        selected2d, selected3d, selectedLinkId,
        onLink, onUnlink, onSave,
    } = props;

    const bothSelected = !!selected2d && !!selected3d;
    const alreadyLinked = bothSelected &&
        getLinkIdFromState(selected2d) !== null &&
        getLinkIdFromState(selected2d) === getLinkIdFromState(selected3d);

    const canLink = bothSelected && !alreadyLinked;
    const canUnlink = !!selectedLinkId;

    return (
        <div style={{
            padding: '8px 16px',
            background: '#fafafa',
            borderTop: '1px solid #e8e8e8',
            borderBottom: '1px solid #e8e8e8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        }}
        >
            <Space size='middle'>
                <Button
                    type='primary'
                    icon={<LinkOutlined />}
                    disabled={!canLink}
                    onClick={onLink}
                >
                    Link
                </Button>
                <Button
                    danger
                    icon={<DisconnectOutlined />}
                    disabled={!canUnlink}
                    onClick={onUnlink}
                >
                    Unlink
                </Button>
                <Button
                    icon={<SaveOutlined />}
                    onClick={onSave}
                >
                    Save All
                </Button>
            </Space>
        </div>
    );
}

export default React.memo(LinkControls);

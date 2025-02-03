// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Button from 'antd/lib/button';
import Text from 'antd/lib/typography/Text';
import { LeftOutlined } from '@ant-design/icons';
import { useGoBack } from 'utils/hooks';

function GoBackButton(): JSX.Element {
    const goBack = useGoBack();
    return (
        <>
            <Button style={{ marginRight: 8 }} onClick={goBack}>
                <LeftOutlined />
            </Button>
            <Text style={{ userSelect: 'none' }} strong>Back</Text>
        </>
    );
}

export default React.memo(GoBackButton);

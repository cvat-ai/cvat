// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Image from 'antd/lib/image';
import Paragraph from 'antd/lib/typography/Paragraph';
import Text from 'antd/lib/typography/Text';

interface Props {
    name?: string;
    gif?: string;
    message?: string;
    withNegativePoints?: boolean;
}

function InteractorTooltips(props: Props): JSX.Element {
    const {
        name, gif, message, withNegativePoints,
    } = props;
    const UNKNOWN_MESSAGE = '所选交互器没有帮助信息';
    const desc = message || UNKNOWN_MESSAGE;
    return (
        <div className='cvat-interactor-tip-container'>
            {name ? (
                <>
                    <Paragraph>{desc}</Paragraph>
                    <Paragraph>
                        <Text>按住</Text>
                        <Text strong>{' Ctrl '}</Text>
                        <Text>键可以阻止向服务器发送请求</Text>
                    </Paragraph>
                    <Paragraph>
                        <Text>左键点击图像可添加正点。</Text>
                        {withNegativePoints ? (
                            <Text>右键点击图像可添加负点。</Text>
                        ) : null}
                    </Paragraph>
                    {gif ? <Image className='cvat-interactor-tip-image' alt='示例动图' src={gif} /> : null}
                </>
            ) : (
                <Text>选择一个交互器以查看帮助信息</Text>
            )}
        </div>
    );
}

export default React.memo(InteractorTooltips);

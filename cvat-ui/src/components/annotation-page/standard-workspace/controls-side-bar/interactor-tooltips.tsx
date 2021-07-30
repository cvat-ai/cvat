// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Image from 'antd/lib/image';
import Paragraph from 'antd/lib/typography/Paragraph';
import Text from 'antd/lib/typography/Text';

interface Props {
    tool?: string;
}

function InteractorTooltips(props: Props): JSX.Element {
    const { tool } = props;

    const DEXTR_GIF = 'https://openvinotoolkit.github.io/cvat/images/gif019_detrac.gif';
    const DEXTR_DESC =
        'The interactor allows to get a mask of an object using its extreme points (more or equal 4). You can add a point left-clicking the image';

    const UNKNOWN_DESC = 'Selected interactor does not have tips';

    let gif = null;
    let desc = '';

    switch (tool) {
        case undefined:
            desc = 'Select an interactor to see description';
            break;
        case 'DEXTR':
            gif = DEXTR_GIF;
            desc = DEXTR_DESC;
            break;
        default:
            desc = UNKNOWN_DESC;
    }

    return (
        <div className='cvat-interactor-tip-container'>
            <Paragraph>{desc}</Paragraph>
            {tool ? (
                <Paragraph>
                    <Text>You can prevent server requests holding</Text>
                    <Text strong>{' Ctrl '}</Text>
                    <Text>key</Text>
                </Paragraph>
            ) : null}
            {gif ? <Image className='cvat-interactor-tip-image' alt='Example gif' src={DEXTR_GIF} /> : null}
        </div>
    );
}

export default React.memo(InteractorTooltips);

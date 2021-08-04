// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Image from 'antd/lib/image';
import Paragraph from 'antd/lib/typography/Paragraph';
import Text from 'antd/lib/typography/Text';

interface Props {
    tool?: string;
    withNegativePoints?: boolean;
}

function InteractorTooltips(props: Props): JSX.Element {
    const { tool, withNegativePoints } = props;

    const DEXTR_GIF = 'https://openvinotoolkit.github.io/cvat/images/dextr_example.gif';
    const FBRS_GIF = 'https://openvinotoolkit.github.io/cvat/images/fbrs_example.gif';
    const IOG_GIF = 'https://openvinotoolkit.github.io/cvat/images/iog_example.gif';
    const DEXTR_DESC =
        'The interactor allows to get a mask of an object using its extreme points (more or equal 4). You can add a point left-clicking the image';
    const FBRS_DESC = 'The interactor allows to get a mask for an object using positive points, and negative points.';
    const IOG_DESC =
        'The interactor allows to get a mask of an object using its wrapping boundig box, positive, and negative points inside it';

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
        case 'f-BRS':
            gif = FBRS_GIF;
            desc = FBRS_DESC;
            break;
        case 'IOG':
            gif = IOG_GIF;
            desc = IOG_DESC;
            break;
        default:
            desc = UNKNOWN_DESC;
    }

    return (
        <div className='cvat-interactor-tip-container'>
            <Paragraph>{desc}</Paragraph>
            {tool ? (
                <>
                    <Paragraph>
                        <Text>You can prevent server requests holding</Text>
                        <Text strong>{' Ctrl '}</Text>
                        <Text>key</Text>
                    </Paragraph>
                    <Paragraph>
                        <Text>Positive points can be added by left-clicking the image. </Text>
                        {withNegativePoints ? (
                            <Text>Negative points can be added by right-clicking the image. </Text>
                        ) : null}
                    </Paragraph>
                </>
            ) : null}
            {gif ? <Image className='cvat-interactor-tip-image' alt='Example gif' src={gif} /> : null}
        </div>
    );
}

export default React.memo(InteractorTooltips);

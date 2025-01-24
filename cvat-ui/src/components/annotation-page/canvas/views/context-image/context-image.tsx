// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import notification from 'antd/lib/notification';
import Spin from 'antd/lib/spin';
import Text from 'antd/lib/typography/Text';
import { SettingOutlined } from '@ant-design/icons';

import CVATTooltop from 'components/common/cvat-tooltip';
import { CombinedState } from 'reducers';
import ContextImageSelector from './context-image-selector';

interface Props {
    offset: number[];
}

function ContextImage(props: Props): JSX.Element {
    const { offset } = props;
    const defaultFrameOffset = (offset[0] || 0);
    const defaultContextImageOffset = (offset[1] || 0);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const job = useSelector((state: CombinedState) => state.annotation.job.instance);
    const { number: frame, relatedFiles } = useSelector((state: CombinedState) => state.annotation.player.frame);
    const frameIndex = frame + defaultFrameOffset;

    const [contextImageData, setContextImageData] = useState<Record<string, ImageBitmap>>({});
    const [fetching, setFetching] = useState<boolean>(false);
    const [contextImageOffset, setContextImageOffset] = useState<number>(
        Math.min(defaultContextImageOffset, relatedFiles),
    );

    const [hasError, setHasError] = useState<boolean>(false);
    const [showSelector, setShowSelector] = useState<boolean>(false);

    useEffect(() => {
        let unmounted = false;
        const promise = job.frames.contextImage(frameIndex);
        setFetching(true);
        promise.then((imageBitmaps: Record<string, ImageBitmap>) => {
            if (!unmounted) {
                setContextImageData(imageBitmaps);
            }
        }).catch((error: any) => {
            if (!unmounted) {
                setHasError(true);
                notification.error({
                    message: `Could not fetch context images. Frame: ${frameIndex}`,
                    description: error.toString(),
                });
            }
        }).finally(() => {
            if (!unmounted) {
                setFetching(false);
            }
        });

        return () => {
            setContextImageData({});
            unmounted = true;
        };
    }, [frameIndex]);

    useEffect(() => {
        if (canvasRef.current) {
            const sortedKeys = Object.keys(contextImageData).sort();
            const key = sortedKeys[contextImageOffset];
            const image = contextImageData[key];
            const context = canvasRef.current.getContext('2d');
            if (context && image) {
                canvasRef.current.width = image.width;
                canvasRef.current.height = image.height;
                context.drawImage(image, 0, 0);
            }
        }
    }, [contextImageData, contextImageOffset, canvasRef]);

    const contextImageName = Object.keys(contextImageData).sort()[contextImageOffset];
    return (
        <div className='cvat-context-image-wrapper'>
            <div className='cvat-context-image-header'>
                { relatedFiles > 1 && (
                    <SettingOutlined
                        className='cvat-context-image-setup-button'
                        onClick={() => {
                            setShowSelector(true);
                        }}
                    />
                )}
                <div className='cvat-context-image-title'>
                    <CVATTooltop title={contextImageName}>
                        <Text>{contextImageName}</Text>
                    </CVATTooltop>
                </div>
            </div>
            { (hasError ||
                (!fetching && contextImageOffset >= Object.keys(contextImageData).length)) && <Text> No data </Text>}
            { fetching && <Spin size='small' /> }
            {
                contextImageOffset < Object.keys(contextImageData).length &&
                <canvas ref={canvasRef} />
            }
            { showSelector && (
                <ContextImageSelector
                    images={contextImageData}
                    offset={contextImageOffset}
                    onChangeOffset={(newContextImageOffset: number) => {
                        setContextImageOffset(newContextImageOffset);
                    }}
                    onClose={() => {
                        setShowSelector(false);
                    }}
                />
            )}
        </div>
    );
}

ContextImage.PropType = {
    offset: PropTypes.arrayOf(PropTypes.number),
};

export default React.memo(ContextImage);

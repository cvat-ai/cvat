// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import notification from 'antd/lib/notification';
import Spin from 'antd/lib/spin';
import Empty from 'antd/lib/empty';
import { SettingOutlined } from '@ant-design/icons';

import { CombinedState } from 'reducers';
import ContextImageSelector from './context-image-selector';

interface Props {
    offset: number[];
}

function ContextImage(props: Props): JSX.Element {
    const { offset } = props;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const job = useSelector((state: CombinedState) => state.annotation.job.instance);
    const { number: frame, relatedFiles } = useSelector((state: CombinedState) => state.annotation.player.frame);
    const frameIndex = frame + (offset[0] || 0);

    const [contextImageData, setContextImageData] = useState<ImageBitmap[]>([]);
    const [contextImageOffset, setContextImageOffset] = useState<number>(
        Math.min(offset[1] || 0, relatedFiles),
    );

    const [hasError, setHasError] = useState<boolean>(false);
    const [showSelector, setShowSelector] = useState<boolean>(false);

    useEffect(() => {
        let unmounted = false;
        const promise = job.frames.contextImage(frameIndex);
        promise.then((imageBitmaps: ImageBitmap[]) => {
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
        });

        return () => {
            setContextImageData([]);
            unmounted = true;
        };
    }, [frameIndex]);

    useEffect(() => {
        if (canvasRef.current) {
            const image = contextImageData[contextImageOffset];
            const context = canvasRef.current.getContext('2d');
            if (context) {
                canvasRef.current.width = image.width;
                canvasRef.current.height = image.height;
                context.drawImage(image, 0, 0);
            }
        }
    }, [contextImageData, contextImageOffset, canvasRef]);

    return (
        <div className='cvat-context-image-wrapper'>
            { hasError && <Empty /> }
            { relatedFiles && contextImageData.length === 0 && !hasError && <Spin size='small' /> }
            { contextImageData.length > 0 && (
                <>
                    <canvas
                        ref={canvasRef}
                        className='cvat-context-image-element'
                    />
                    { relatedFiles > 1 && (
                        <SettingOutlined
                            className='cvat-context-image-setup-button'
                            onClick={() => {
                                setShowSelector(true);
                            }}
                        />
                    )}
                </>
            )}
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

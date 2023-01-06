// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import Text from 'antd/lib/typography/Text';
import { CloseOutlined } from '@ant-design/icons';

interface Props {
    images: Record<string, ImageBitmap>;
    offset: number;
    onChangeOffset: (offset: number) => void;
    onClose: () => void;
}

function CanvasWithRef({
    image, isActive, onClick, name,
}: { image: ImageBitmap, name: string, isActive: boolean, onClick: () => void }): JSX.Element {
    const ref = useRef<HTMLCanvasElement>(null);

    useEffect((): void => {
        if (ref.current) {
            const context = ref.current.getContext('2d');
            if (context) {
                ref.current.width = image.width;
                ref.current.height = image.height;
                context.drawImage(image, 0, 0);
            }
        }
    }, [image, ref]);

    return (
        <div className={(isActive ? ['cvat-context-image-gallery-item cvat-context-image-gallery-item-current'] : ['cvat-context-image-gallery-item']).join(' ')}>
            <Text strong className='cvat-context-image-gallery-item-name'>{name}</Text>
            <canvas
                ref={ref}
                onClick={onClick}
            />
        </div>
    );
}

function ContextImageSelector(props: Props): React.ReactPortal {
    const {
        images, offset, onChangeOffset, onClose,
    } = props;

    const keys = Object.keys(images).sort();

    return ReactDOM.createPortal((
        <div className='cvat-context-image-overlay'>
            <div className='cvat-context-image-gallery'>
                <div className='cvat-context-image-gallery-header'>
                    <Text>
                        Click the image to display it as a context image
                    </Text>
                    <CloseOutlined className='cvat-context-image-close-button' onClick={onClose} />
                </div>
                <div className='cvat-context-image-gallery-items'>
                    { keys.map((key, i: number) => (
                        <CanvasWithRef
                            name={key}
                            image={images[key]}
                            isActive={offset === i}
                            onClick={() => {
                                onChangeOffset(i);
                                onClose();
                            }}
                            key={i}
                        />
                    ))}
                </div>
            </div>
        </div>
    ), window.document.body);
}

ContextImageSelector.PropType = {
    images: PropTypes.arrayOf(PropTypes.string),
    offset: PropTypes.number,
    onChangeOffset: PropTypes.func,
    onClose: PropTypes.func,
};

export default React.memo(ContextImageSelector);

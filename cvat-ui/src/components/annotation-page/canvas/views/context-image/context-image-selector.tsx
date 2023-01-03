// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';

interface Props {
    images: ImageBitmap[];
    offset: number;
    onChangeOffset: (offset: number) => void;
    onClose: () => void;
}

function CanvasWithRef({
    image, isActive, onClick,
}: { image: ImageBitmap, isActive: boolean, onClick: () => void }): JSX.Element {
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
        <canvas
            ref={ref}
            onClick={onClick}
            className={(isActive ? ['cvat-context-image-switcher-item cvat-context-image-switcher-item-current'] : ['cvat-context-image-switcher-item']).join(' ')}
        />
    );
}

function ContextImageSelector(props: Props): React.ReactPortal {
    const {
        images, offset, onChangeOffset, onClose,
    } = props;

    return ReactDOM.createPortal((
        <div className='cvat-context-image-overlay'>
            <div className='cvat-context-image-switcher'>
                { images.map((image: ImageBitmap, i: number) => (
                    <CanvasWithRef
                        image={image}
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
    ), window.document.body);
}

ContextImageSelector.PropType = {
    images: PropTypes.arrayOf(PropTypes.string),
    offset: PropTypes.number,
    onChangeOffset: PropTypes.func,
    onClose: PropTypes.func,
};

export default React.memo(ContextImageSelector);

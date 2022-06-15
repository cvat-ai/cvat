import React, { useEffect, useRef, useState } from 'react';
import { Row, Col } from 'antd/lib/grid';
import Upload from 'antd/lib/upload';
import Button from 'antd/lib/button';
import notification from 'antd/lib/notification';
import { RcFile } from 'antd/lib/upload/interface';
import Icon, { PictureOutlined } from '@ant-design/icons';

import {
    EllipseIcon, PointIcon, PolygonIcon, RectangleIcon,
} from 'icons';

function SkeletonConfigurator(): JSX.Element {
    const [activeTool, setActiveTool] = useState<'point' | 'join' | 'delete'>('point');
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        if (ref.current) {
            const observer = new ResizeObserver((entries: ResizeObserverEntry[]) => {
                const [canvasEntry] = entries;
                (canvasEntry.target as HTMLCanvasElement).style.height = `${canvasEntry.target.clientWidth}px`;
                (canvasEntry.target as HTMLCanvasElement).height = canvasEntry.target.clientWidth;
                (canvasEntry.target as HTMLCanvasElement).width = canvasEntry.target.clientWidth;
            });
            observer.observe(ref.current);
            return () => {
                observer.unobserve(ref.current as HTMLCanvasElement);
                observer.disconnect();
            };
        }

        return () => {};
    }, [ref.current]);

    return (
        <Row className='cvat-skeleton-configurator'>
            <Col span={16}>
                <canvas ref={ref} className='cvat-skeleton-configurator-canvas' />
            </Col>
            <Col span={7} offset={1}>
                <div className='cvat-skeleton-configurator-image-dragger'>
                    <Upload.Dragger
                        showUploadList={false}
                        beforeUpload={(file: RcFile) => {
                            if (!file.type.startsWith('image/')) {
                                notification.error({
                                    message: `File must be an image. Got mime type: ${file.type}`,
                                });
                            }
                            const url = URL.createObjectURL(file);
                            const img = new Image();
                            img.onload = () => {
                                URL.revokeObjectURL(url);
                                if (ref.current) {
                                    const ctx = ref.current.getContext('2d');
                                    const { width, height } = img;
                                    const { width: canvasWidth, height: canvasHeight } = ref.current;

                                    if (ctx) {
                                        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
                                        if (width > height) {
                                            const dw = canvasWidth / width;
                                            ctx.drawImage(
                                                img, 0, (canvasHeight - height * dw) / 2, width * dw, height * dw,
                                            );
                                        } else {
                                            const dh = canvasHeight / height;
                                            ctx.drawImage(
                                                img, (canvasWidth - width * dh) / 2, 0, width * dh, height * dh,
                                            );
                                        }
                                    }
                                }
                            };
                            img.src = url;
                            return false;
                        }}
                    >
                        <p className='ant-upload-drag-icon'>
                            <PictureOutlined />
                        </p>
                        <p className='ant-upload-text'>Click or drag file to this area to upload</p>
                    </Upload.Dragger>
                </div>
                <Row justify='space-between' className='cvat-skeleton-configurator-shape-buttons'>
                    <Col>
                        <Button
                            type={activeTool === 'point' ? 'primary' : 'default'}
                            className='cvat-skeleton-configurator-point-button'
                            size='large'
                            icon={<Icon component={PointIcon} />}
                            onClick={() => setActiveTool('point')}
                        />
                    </Col>
                    <Col>
                        <Button
                            className='cvat-skeleton-configurator-rect-button'
                            size='large'
                            disabled
                            title='Not implemented'
                            icon={<Icon component={RectangleIcon} />}
                        />
                    </Col>
                    <Col>
                        <Button
                            className='cvat-skeleton-configurator-ellipse-button'
                            size='large'
                            disabled
                            title='Not implemented'
                            icon={<Icon component={EllipseIcon} />}
                        />
                    </Col>
                    <Col>
                        <Button
                            className='cvat-skeleton-configurator-polygon-button'
                            size='large'
                            disabled
                            title='Not implemented'
                            icon={<Icon component={PolygonIcon} />}
                        />
                    </Col>
                </Row>
                <Row justify='space-between' className='cvat-skeleton-configurator-action-buttons'>
                    <Button
                        type={activeTool === 'join' ? 'primary' : 'default'}
                        onClick={() => setActiveTool('join')}
                    >
                        Join
                    </Button>
                    <Button
                        type={activeTool === 'delete' ? 'primary' : 'default'}
                        onClick={() => setActiveTool('delete')}
                        danger
                    >
                        Delete
                    </Button>
                </Row>
            </Col>
        </Row>
    );
}

export default React.memo(SkeletonConfigurator);

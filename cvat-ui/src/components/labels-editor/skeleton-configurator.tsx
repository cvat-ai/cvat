import React from 'react';
import { Row, Col } from 'antd/lib/grid';
import Upload from 'antd/lib/upload';
import Button from 'antd/lib/button';
import notification from 'antd/lib/notification';
import { RcFile } from 'antd/lib/upload/interface';
import Icon, { PictureOutlined } from '@ant-design/icons';

import {
    EllipseIcon, PointIcon, PolygonIcon, RectangleIcon,
} from 'icons';

interface State {
    activeTool: 'point' | 'join' | 'delete';
    image: RcFile | null;
}

export default class SkeletonConfigurator extends React.PureComponent<{}, State> {
    private canvasRef: React.RefObject<HTMLCanvasElement>;
    private svgRef: React.RefObject<SVGSVGElement>;
    private canvasResizeObserver: ResizeObserver;

    public constructor(props: {}) {
        super(props);
        this.state = {
            activeTool: 'point',
            image: null,
        };

        this.canvasRef = React.createRef<HTMLCanvasElement>();
        this.svgRef = React.createRef<SVGSVGElement>();
        this.canvasResizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {
            const [canvasEntry] = entries;
            (canvasEntry.target as HTMLCanvasElement).style.height = `${canvasEntry.target.clientWidth}px`;
            (canvasEntry.target as HTMLCanvasElement).height = canvasEntry.target.clientWidth;
            (canvasEntry.target as HTMLCanvasElement).width = canvasEntry.target.clientWidth;
            if (this.svgRef.current) {
                (this.svgRef.current as SVGSVGElement).style.width = `${canvasEntry.target.clientWidth}px`;
                (this.svgRef.current as SVGSVGElement).style.height = `${canvasEntry.target.clientWidth}px`;
            }
            this.setCanvasBackground();
        });
    }

    public componentDidMount(): void {
        const { canvasRef } = this;
        if (canvasRef.current) {
            this.canvasResizeObserver.observe(canvasRef.current);
        }
    }

    public componentDidUpdate(): void {

    }

    public componentWillUnmount(): void {
        this.canvasResizeObserver.disconnect();
    }

    private setCanvasBackground(): void {
        const { canvasRef } = this;
        const { image } = this.state;
        if (image && canvasRef.current) {
            const url = URL.createObjectURL(image);
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(url);
                if (canvasRef.current) {
                    const ctx = canvasRef.current.getContext('2d');
                    const { width, height } = img;
                    const { width: canvasWidth, height: canvasHeight } = canvasRef.current;

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
        }
    }

    public render(): JSX.Element {
        const { canvasRef, svgRef } = this;
        const { activeTool } = this.state;

        return (
            <Row className='cvat-skeleton-configurator'>
                <Col span={16}>
                    <canvas ref={canvasRef} className='cvat-skeleton-configurator-canvas' />
                    <svg width={100} height={100} ref={svgRef} className='cvat-skeleton-configurator-svg' />
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
                                this.setState({ image: file }, () => {
                                    this.setCanvasBackground();
                                });
                                return false;
                            }}
                        >
                            <p className='ant-upload-drag-icon'>
                                <PictureOutlined />
                            </p>
                            <p className='ant-upload-text'>Click or drag an image to this area</p>
                        </Upload.Dragger>
                    </div>
                    <Row justify='space-between' className='cvat-skeleton-configurator-shape-buttons'>
                        <Col span={5}>
                            <Button
                                type={activeTool === 'point' ? 'dashed' : 'default'}
                                className='cvat-skeleton-configurator-point-button'
                                size='large'
                                shape='round'
                                icon={<Icon component={PointIcon} />}
                                onClick={() => this.setState({ activeTool: 'point' })}
                            />
                        </Col>
                        <Col span={5}>
                            <Button
                                className='cvat-skeleton-configurator-rect-button'
                                size='large'
                                shape='round'
                                disabled
                                title='Not implemented'
                                icon={<Icon component={RectangleIcon} />}
                            />
                        </Col>
                        <Col span={5}>
                            <Button
                                className='cvat-skeleton-configurator-ellipse-button'
                                size='large'
                                shape='round'
                                disabled
                                title='Not implemented'
                                icon={<Icon component={EllipseIcon} />}
                            />
                        </Col>
                        <Col span={5}>
                            <Button
                                className='cvat-skeleton-configurator-polygon-button'
                                size='large'
                                shape='round'
                                disabled
                                title='Not implemented'
                                icon={<Icon component={PolygonIcon} />}
                            />
                        </Col>
                    </Row>
                    <Row justify='space-between' className='cvat-skeleton-configurator-action-buttons'>
                        <Button
                            type={activeTool === 'join' ? 'dashed' : 'default'}
                            onClick={() => this.setState({ activeTool: 'join' })}
                        >
                            Join
                        </Button>
                        <Button
                            type={activeTool === 'delete' ? 'dashed' : 'default'}
                            onClick={() => this.setState({ activeTool: 'delete' })}
                            danger
                        >
                            Delete
                        </Button>
                    </Row>
                    <Row justify='space-between' className='cvat-skeleton-configurator-svg-buttons'>
                        <Button
                            type='default'
                            onClick={() => {
                                if (svgRef.current) {
                                    const text = svgRef.current.innerHTML;
                                    const blob = new Blob([text], { type: 'image/svg+xml;charset=utf-8' });
                                    const url = URL.createObjectURL(blob);
                                    const anchor = window.document.getElementById('downloadAnchor');
                                    if (anchor) {
                                        (anchor as HTMLAnchorElement).href = url;
                                        (anchor as HTMLAnchorElement).click();
                                        setTimeout(() => {
                                            URL.revokeObjectURL(url);
                                        });
                                    }
                                }
                            }}
                        >
                            Save
                        </Button>
                        <Upload
                            showUploadList={false}
                            beforeUpload={(file: RcFile) => {
                                file.text().then((result) => {
                                    const tmpSvg = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                                    // eslint-disable-next-line
                                    tmpSvg.innerHTML = result;
                                    let isSVG = true;
                                    for (let c = tmpSvg.childNodes, i = c.length; i--;) {
                                        isSVG = isSVG && c[i].nodeType === 1;
                                    }

                                    if (isSVG && svgRef.current) {
                                        // eslint-disable-next-line
                                        svgRef.current.innerHTML = tmpSvg.innerHTML;
                                    } else {
                                        notification.error({
                                            message: 'Wrong skeleton structure',
                                        });
                                    }
                                });
                                return false;
                            }}
                        >
                            <Button type='default'>Upload</Button>
                        </Upload>
                    </Row>
                </Col>
            </Row>
        );
    }
}

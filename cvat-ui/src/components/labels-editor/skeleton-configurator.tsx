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
import consts from 'consts';
import { idGenerator, Label, toSVGCoord } from './common';
import SkeletonElementContextMenu from './skeleton-element-context-menu';

function setAttributes(element: Element, attrs: Record<string, string | number | null>): void {
    for (const key of Object.keys(attrs)) {
        if (attrs[key] !== null) {
            element.setAttribute(key, `${attrs[key]}`);
        }
    }
}

interface State {
    activeTool: 'point' | 'join' | 'delete';
    contextMenuVisible: boolean;
    contextMenuElement: number | null;
    image: RcFile | null;
}

export default class SkeletonConfigurator extends React.PureComponent<{}, State> {
    private canvasRef: React.RefObject<HTMLCanvasElement>;
    private svgRef: React.RefObject<SVGSVGElement>;
    private canvasResizeObserver: ResizeObserver;
    private nodeCounter: number;
    private elementCounter: number;
    private draggableElement: SVGElement | null;
    private labels: Record<string, Label>;

    public constructor(props: {}) {
        super(props);
        this.state = {
            activeTool: 'point',
            contextMenuVisible: false,
            contextMenuElement: null,
            image: null,
        };

        this.canvasRef = React.createRef<HTMLCanvasElement>();
        this.svgRef = React.createRef<SVGSVGElement>();
        this.nodeCounter = 0;
        this.elementCounter = 0;
        this.draggableElement = null;
        this.labels = {};
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
        const { canvasRef, svgRef } = this;
        const canvas = canvasRef.current;
        const svg = svgRef.current;

        if (canvas) {
            this.canvasResizeObserver.observe(canvas);
        }

        window.document.addEventListener('mouseup', this.onDocumentMouseUp);
        if (svg) {
            svg.setAttribute('viewBox', '0 0 100 100');
            svg.addEventListener('click', this.onSVGClick);
            svg.addEventListener('mousemove', this.onSVGMouseMove);
        }
    }

    public componentDidUpdate(_: {}, prevState: State): void {
        const { activeTool } = this.state;
        if (prevState.activeTool === 'join' && activeTool !== 'join') {
            const shape = this.findNotFinishedEdge();
            if (shape) {
                shape.remove();
            }
        }
    }

    public componentWillUnmount(): void {
        const { svgRef } = this;
        const svg = svgRef.current;

        if (svg) {
            svg.removeEventListener('click', this.onSVGClick);
            svg.removeEventListener('mousemove', this.onSVGMouseMove);
        }

        window.document.removeEventListener('mouseup', this.onDocumentMouseUp);
        this.canvasResizeObserver.disconnect();
    }

    private onDocumentMouseUp = (): void => {
        this.draggableElement = null;
    };

    private onSVGMouseMove = (event: MouseEvent): void => {
        const { activeTool } = this.state;
        const svg = this.svgRef.current;
        if (activeTool === 'join' && svg) {
            const line = this.findNotFinishedEdge();

            if (line) {
                const [x, y] = toSVGCoord(svg, [event.clientX, event.clientY]);
                setAttributes(line, { x2: x, y2: y });
            }
        } else if (this.draggableElement && svg) {
            const [x, y] = toSVGCoord(svg, [event.clientX, event.clientY]);
            setAttributes(this.draggableElement, { cx: x, cy: y });
            this.setupTextLabels();
            const nodeID = this.draggableElement.getAttribute('data-node-id');
            for (const element of svg.children) {
                const dataType = element.getAttribute('data-type');
                const dataNodeFrom = element.getAttribute('data-node-from');
                const dataNodeTo = element.getAttribute('data-node-to');
                if (dataType === 'edge' && (dataNodeFrom === `${nodeID}` || dataNodeTo === `${nodeID}`)) {
                    if (dataNodeFrom === nodeID) {
                        setAttributes(element, { x1: x, y1: y });
                    } else {
                        setAttributes(element, { x2: x, y2: y });
                    }
                }
            }
        }
    };

    private onSVGClick = (event: MouseEvent): void => {
        const { activeTool, contextMenuVisible } = this.state;
        const svg = this.svgRef.current;

        if (contextMenuVisible) {
            this.setState({ contextMenuVisible: false });
            return;
        }

        if (activeTool === 'point' && svg) {
            let [x, y] = [0, 0];
            try {
                [x, y] = toSVGCoord(svg, [event.clientX, event.clientY], true);
            } catch (_: any) {
                return;
            }

            const circle = window.document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            const elementID = ++this.elementCounter;
            const nodeID = ++this.nodeCounter;
            this.labels[elementID] = {
                name: `${elementID}`,
                color: consts.NEW_LABEL_COLOR,
                attributes: [],
                id: idGenerator(),
            };

            setAttributes(circle, {
                r: 1.5,
                stroke: 'black',
                fill: 'grey',
                cx: x,
                cy: y,
                'stroke-width': 0.1,
                'data-type': 'element node',
                'data-element-id': elementID,
                'data-node-id': nodeID,
            });
            svg.appendChild(circle);

            circle.addEventListener('mouseover', () => {
                circle.setAttribute('stroke-width', '0.3');
                const text = svg.querySelector(`text[data-for-element-id="${elementID}"]`);
                if (text) {
                    text.setAttribute('fill', 'red');
                }

                this.setState({
                    contextMenuElement: elementID,
                });
            });

            circle.addEventListener('mouseout', () => {
                circle.setAttribute('stroke-width', '0.1');
                const text = svg.querySelector(`text[data-for-element-id="${elementID}"]`);
                if (text) {
                    text.setAttribute('fill', 'white');
                }
            });

            circle.addEventListener('mousedown', (e: MouseEvent) => {
                if (e.button === 0) {
                    this.draggableElement = circle;
                }
            });

            circle.addEventListener('contextmenu', (e: MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                this.setState({
                    contextMenuVisible: true,
                });
            });

            (circle as any).cvat = {
                deleteElement: () => {
                    // first remove all related edges
                    for (const element of svg.children) {
                        const dataType = element.getAttribute('data-type');
                        const dataNodeFrom = element.getAttribute('data-node-from');
                        const dataNodeTo = element.getAttribute('data-node-to');
                        if (dataType === 'edge' && (dataNodeFrom === `${nodeID}` || dataNodeTo === `${nodeID}`)) {
                            setTimeout(() => {
                                // use setTimeout to not change the array during iteration it
                                element.remove();
                            });
                        }
                    }

                    // then close context menu if opened for the node
                    const { contextMenuElement: currentContextMenuElement } = this.state;
                    if (currentContextMenuElement === elementID) {
                        this.setState({
                            contextMenuElement: null,
                            contextMenuVisible: false,
                        });
                    }

                    // remove label instance for the element
                    delete this.labels[elementID];

                    // finally remove the element itself and its labels
                    circle.remove();
                    this.setupTextLabels();
                },
            };

            circle.addEventListener('click', (evt: Event) => {
                evt.stopPropagation();
                const { activeTool: currentActiveTool } = this.state;
                if (currentActiveTool === 'delete') {
                    (circle as any).cvat.deleteElement();
                } else if (currentActiveTool === 'join') {
                    let line = this.findNotFinishedEdge();
                    if (!line) {
                        line = window.document.createElementNS('http://www.w3.org/2000/svg', 'line');
                        setAttributes(line, {
                            x1: circle.getAttribute('cx'),
                            y1: circle.getAttribute('cy'),
                            x2: circle.getAttribute('cx'),
                            y2: circle.getAttribute('cy'),
                            stroke: 'black',
                            'data-type': 'edge',
                            'data-node-from': nodeID,
                            'stroke-width': '0.1',
                        });

                        svg.prepend(line);
                        return;
                    }

                    const dataNodeFrom = line.getAttribute('data-node-from');
                    const dataNodeTo = nodeID;

                    // if such edge already exists, remove the current one
                    const edge1 = svg
                        .querySelector(`[data-node-from="${dataNodeFrom}"][data-node-to="${dataNodeTo}"]`);
                    const edge2 = svg
                        .querySelector(`[data-node-from="${dataNodeTo}"][data-node-to="${dataNodeFrom}"]`);
                    if (edge1 || edge2) {
                        line.remove();
                    }

                    if (dataNodeFrom !== `${dataNodeTo}`) {
                        setAttributes(line, {
                            x2: circle.getAttribute('cx'),
                            y2: circle.getAttribute('cy'),
                            'data-node-to': nodeID,
                        });
                    }
                }
            });

            this.setupTextLabels();
        }
    };

    private setupTextLabels(recreate = true): void {
        const { svgRef } = this;
        const svg = svgRef.current;

        if (svg) {
            const TEXT_MARGIN = 2;
            const array = Array.from(svg.children);
            array.forEach((el: Element) => {
                if (el.tagName === 'text') {
                    el.remove();
                }
            });

            if (recreate) {
                Array.from<SVGElement>(svg.children as any as SVGElement[]).forEach((element: SVGElement): void => {
                    if (!(element instanceof SVGElement)) return;
                    const elementID = element.getAttribute('data-element-id');
                    const cx = element.getAttribute('cx');
                    const cy = element.getAttribute('cy');

                    if (cx && cy && elementID) {
                        const label = this.labels[elementID];
                        const text = window.document.createElementNS('http://www.w3.org/2000/svg', 'text');
                        // eslint-disable-next-line
                        text.innerHTML = `${label.name}`
                        text.classList.add('cvat-skeleton-configurator-text-label');
                        setAttributes(text, {
                            x: +cx + TEXT_MARGIN,
                            y: +cy - TEXT_MARGIN,
                            stroke: 'black',
                            fill: 'white',
                            'stroke-width': 0.1,
                            'data-for-element-id': elementID,
                        });
                        svg.appendChild(text);
                    }
                });
            }
        }
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

    private findNotFinishedEdge(): SVGLineElement | null {
        const svg = this.svgRef.current;

        if (svg) {
            const line = Array.from(svg.children as any as SVGElement[]).find((element: SVGElement) => {
                const type = element.getAttribute('data-type');
                const nodeFrom = element.getAttribute('data-node-from');
                const nodeTo = element.getAttribute('data-node-to');
                if (type === 'edge' && nodeFrom && !nodeTo) {
                    return true;
                }

                return false;
            });

            return line as SVGLineElement || null;
        }

        return null;
    }

    public render(): JSX.Element {
        const { canvasRef, svgRef } = this;
        const { activeTool, contextMenuVisible, contextMenuElement } = this.state;

        return (
            <Row className='cvat-skeleton-configurator'>
                { svgRef.current && contextMenuVisible && contextMenuElement !== null ? (
                    <SkeletonElementContextMenu
                        elementID={contextMenuElement}
                        labels={this.labels}
                        container={svgRef.current}
                        onDelete={(element) => {
                            this.setState({ contextMenuVisible: false });
                            (element as any).cvat.deleteElement();
                        }}
                        onConfigureLabel={(elementID: number, data: Label | null) => {
                            this.setState({ contextMenuVisible: false });
                            if (data) {
                                this.labels[elementID] = data;
                                this.setupTextLabels();
                            }
                        }}
                    />
                ) : null}
                <Col span={16} className='cvat-skeleton-canvas-wrapper'>
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
                                    this.setupTextLabels(false);
                                    const text = svgRef.current.innerHTML;
                                    this.setupTextLabels();
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
                                        this.setupTextLabels();
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

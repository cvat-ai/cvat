// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    useState, useEffect, useRef, useCallback,
} from 'react';

import { linkIdToColor, getLinkIdFromState } from '../utils/color';

interface Canvas2DPanelProps {
    job: any;
    frame: number;
    annotations: any[];
    selectedLinkId: string | null;
    onSelectAnnotation: (state: any) => void;
}

interface ScaleInfo {
    scale: number;
    offsetX: number;
    offsetY: number;
    imgWidth: number;
    imgHeight: number;
}

function computeScale(
    containerWidth: number,
    containerHeight: number,
    imgWidth: number,
    imgHeight: number,
): ScaleInfo {
    if (!containerWidth || !containerHeight || !imgWidth || !imgHeight) {
        return {
            scale: 1, offsetX: 0, offsetY: 0, imgWidth, imgHeight,
        };
    }
    const scaleX = containerWidth / imgWidth;
    const scaleY = containerHeight / imgHeight;
    const scale = Math.min(scaleX, scaleY);
    const offsetX = (containerWidth - imgWidth * scale) / 2;
    const offsetY = (containerHeight - imgHeight * scale) / 2;
    return {
        scale, offsetX, offsetY, imgWidth, imgHeight,
    };
}

function Canvas2DPanel(props: Canvas2DPanelProps): JSX.Element {
    const {
        job, frame, annotations, selectedLinkId, onSelectAnnotation,
    } = props;

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
        width: 0,
        height: 0,
    });
    const scaleInfoRef = useRef<ScaleInfo>({
        scale: 1, offsetX: 0, offsetY: 0, imgWidth: 0, imgHeight: 0,
    });

    // Observe container resizes
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                setContainerSize({ width, height });
            }
        });
        observer.observe(container);

        // Initial measurement
        const rect = container.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });

        return () => {
            observer.disconnect();
        };
    }, []);

    // Fetch frame image when job or frame changes
    useEffect(() => {
        if (!job) return;

        setLoading(true);
        setImage(null);

        const img = new Image();
        img.crossOrigin = 'use-credentials';
        img.src = `/api/jobs/${job.id}/data?type=frame&number=${frame}&quality=compressed`;

        img.onload = () => {
            setImage(img);
            setLoading(false);
        };
        img.onerror = () => {
            setImage(null);
            setLoading(false);
        };

        return () => {
            img.onload = null;
            img.onerror = null;
        };
    }, [job, frame]);

    // Draw everything onto the canvas
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { width, height } = containerSize;
        if (!width || !height) return;

        // Set canvas resolution to match container
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Clear
        ctx.clearRect(0, 0, width, height);

        if (!image) return;

        // Compute scaling to fit image in container
        const info = computeScale(width, height, image.naturalWidth, image.naturalHeight);
        scaleInfoRef.current = info;

        const {
            scale, offsetX, offsetY, imgWidth, imgHeight,
        } = info;

        // Draw image centered
        ctx.drawImage(image, offsetX, offsetY, imgWidth * scale, imgHeight * scale);

        // Draw bounding box overlays
        if (!annotations || annotations.length === 0) return;

        const rectAnnotations = annotations.filter(
            (state: any) => state.shapeType === 'rectangle' && !state.outside,
        );

        for (const state of rectAnnotations) {
            const linkId = getLinkIdFromState(state);
            const color = linkIdToColor(linkId);
            const isSelected = linkId !== null && linkId === selectedLinkId;
            const points = state.points || [];

            if (points.length < 4) continue;

            const [x1, y1, x2, y2] = points;

            // Scale annotation coords to display coords
            const dx1 = offsetX + x1 * scale;
            const dy1 = offsetY + y1 * scale;
            const dx2 = offsetX + x2 * scale;
            const dy2 = offsetY + y2 * scale;
            const bw = dx2 - dx1;
            const bh = dy2 - dy1;

            // Glow effect for selected annotation
            if (isSelected) {
                ctx.save();
                ctx.shadowColor = color;
                ctx.shadowBlur = 10;
                ctx.strokeStyle = color;
                ctx.lineWidth = 4;
                ctx.strokeRect(dx1, dy1, bw, bh);
                ctx.restore();
            } else {
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.strokeRect(dx1, dy1, bw, bh);
            }

            // Semi-transparent fill for selected
            if (isSelected) {
                ctx.fillStyle = `${color}22`;
                ctx.fillRect(dx1, dy1, bw, bh);
            }

            // Draw label text
            const labelName = state.label?.name || '';
            if (labelName) {
                const fontSize = Math.max(12, Math.min(16, 14 * scale));
                ctx.font = `bold ${fontSize}px sans-serif`;

                const textMetrics = ctx.measureText(labelName);
                const textHeight = fontSize;
                const padding = 3;

                const textBgX = dx1;
                const textBgY = dy1 - textHeight - padding * 2;
                const textBgW = textMetrics.width + padding * 2;
                const textBgH = textHeight + padding * 2;

                // Background behind label
                ctx.fillStyle = color;
                ctx.fillRect(textBgX, Math.max(0, textBgY), textBgW, textBgH);

                // Label text in white (or black for light colors)
                ctx.fillStyle = '#ffffff';
                ctx.textBaseline = 'top';
                ctx.fillText(
                    labelName,
                    textBgX + padding,
                    Math.max(0, textBgY) + padding,
                );
            }
        }
    }, [image, annotations, selectedLinkId, containerSize]);

    // Re-draw when dependencies change
    useEffect(() => {
        draw();
    }, [draw]);

    // Handle clicks to select/deselect annotations
    const handleCanvasClick = useCallback(
        (event: React.MouseEvent<HTMLCanvasElement>) => {
            const canvas = canvasRef.current;
            if (!canvas || !image || !annotations) return;

            const rect = canvas.getBoundingClientRect();
            const clickX = event.clientX - rect.left;
            const clickY = event.clientY - rect.top;

            const { scale, offsetX, offsetY } = scaleInfoRef.current;

            // Convert click to image coordinates
            const imgX = (clickX - offsetX) / scale;
            const imgY = (clickY - offsetY) / scale;

            // Check annotations in reverse order (top-most drawn last)
            const rectAnnotations = annotations.filter(
                (state: any) => state.shapeType === 'rectangle' && !state.outside,
            );

            for (let i = rectAnnotations.length - 1; i >= 0; i--) {
                const state = rectAnnotations[i];
                const points = state.points || [];
                if (points.length < 4) continue;

                const [x1, y1, x2, y2] = points;
                if (imgX >= x1 && imgX <= x2 && imgY >= y1 && imgY <= y2) {
                    onSelectAnnotation(state);
                    return;
                }
            }

            // Clicked empty space — deselect
            onSelectAnnotation(null);
        },
        [image, annotations, onSelectAnnotation],
    );

    const containerStyle: React.CSSProperties = {
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#1e1e1e',
    };

    const canvasStyle: React.CSSProperties = {
        width: '100%',
        height: '100%',
        display: 'block',
        cursor: 'pointer',
    };

    const loadingOverlayStyle: React.CSSProperties = {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#aaaaaa',
        fontSize: '14px',
        fontFamily: 'sans-serif',
        pointerEvents: 'none',
    };

    return (
        <div ref={containerRef} style={containerStyle}>
            <canvas
                ref={canvasRef}
                style={canvasStyle}
                onClick={handleCanvasClick}
            />
            {loading && (
                <div style={loadingOverlayStyle}>
                    Loading frame...
                </div>
            )}
        </div>
    );
}

export default Canvas2DPanel;

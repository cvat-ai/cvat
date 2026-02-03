// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    RefObject,
    useCallback, useEffect, useMemo, useRef, useState,
} from 'react';

interface Position {
    x: number;
    y: number;
}
export const useCanvasControl = (canvasRef: RefObject<HTMLCanvasElement>, fullscreenKey: string | undefined) => {
    const [zoomLevel, setZoomLevel] = useState<number>(1);

    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({
        x: 0,
        y: 0,
    });
    const positionRef = useRef<Position>({ x: 0, y: 0 });
    const animationFrameRef = useRef<number | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [brightness, setBrightness] = useState<number>(100);
    const [contrast, setContrast] = useState<number>(100);

    useEffect(() => {
        positionRef.current = { x: 0, y: 0 };
        if (canvasRef.current) {
            canvasRef.current.style.transform = `scale(${zoomLevel}) translate(0px, 0px)`;
        }
    }, [fullscreenKey]);

    const resetColorSetting = () => {
        setBrightness(100);
        setContrast(100);
    };
    const handleZoomChange = useCallback(
        (event: React.WheelEvent) => {
            const delta = event.deltaY;
            const newZoomLevel = zoomLevel - delta * 0.001;
            setZoomLevel(Math.max(0.5, Math.min(5, newZoomLevel)));
        },
        [zoomLevel],
    );

    const handleMouseMove = useCallback(
        (e: React.MouseEvent<HTMLCanvasElement>) => {
            if (e.buttons === 1 && isDragging && canvasRef.current) {
                const newPosition = {
                    x: (e.clientX - dragOffset.x) / zoomLevel,
                    y: (e.clientY - dragOffset.y) / zoomLevel,
                };
                positionRef.current = newPosition;
                if (animationFrameRef.current !== null) {
                    cancelAnimationFrame(animationFrameRef.current);
                }
                animationFrameRef.current = requestAnimationFrame(() => {
                    if (canvasRef.current) {
                        canvasRef.current.style.transform = `
                            scale(${zoomLevel}) translate(${positionRef.current.x}px, ${positionRef.current.y}px)`;
                    }
                    animationFrameRef.current = null;
                });
            } else if (e.buttons === 2) {
                const deltaX = e.movementX;
                const deltaY = e.movementY;

                const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

                if (deltaY !== 0) {
                    setContrast((prevContrast) => clamp(prevContrast + deltaY / 2, 50, 200));
                }

                if (deltaX !== 0) {
                    setBrightness((prevBrightness) => clamp(prevBrightness + deltaX / 2, 50, 200));
                }
            }
        }, [zoomLevel, isDragging, dragOffset]);

    const handleMouseDown = useCallback(
        (e: React.MouseEvent<HTMLCanvasElement>) => {
            if (e.button === 0) {
                setIsDragging(true);
                setDragOffset({
                    x: e.clientX - positionRef.current.x * zoomLevel,
                    y: e.clientY - positionRef.current.y * zoomLevel,
                });
                if (canvasRef.current) {
                    canvasRef.current.style.cursor = 'grabbing';
                }
            }
        },
        [zoomLevel],
    );

    const canvasStyle = useMemo(
        () => ({
            transform: `scale(${zoomLevel}) translate(${positionRef.current.x}px, ${positionRef.current.y}px)`,
            transformOrigin: 'center',
            cursor: isDragging ? 'grabbing' : 'grab',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            filter: `brightness(${brightness}%) contrast(${contrast}%)`,
        }),
        [zoomLevel, isDragging, brightness, contrast],
    );

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        if (canvasRef.current) {
            canvasRef.current.style.cursor = 'grab';
        }
        if (animationFrameRef.current !== null) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
    }, []);

    const handleMouseLeave = useCallback(() => {
        // setIsDragging(false);
        // if (canvasRef.current) {
        //     canvasRef.current.style.cursor = 'grab';
        // }
    }, []);

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
    }, []);

    return {
        handleContextMenu,
        handleZoomChange,
        handleMouseLeave,
        handleMouseUp,
        wrapperRef,
        canvasStyle,
        handleMouseDown,
        handleMouseMove,
        resetColorSetting,
    };
};

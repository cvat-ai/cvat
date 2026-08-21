// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    RefObject, useCallback, useEffect, useRef, useState,
} from 'react';

export interface TextareaFocusBookmark {
    element: HTMLTextAreaElement;
    caretOffset: number;
    marker: {
        left: number;
        top: number;
        height: number;
    };
}

// Textareas do not expose a DOM range for their caret, so this mirror is needed
// to place the visual marker at the saved text offset.
function getCaretMarkerPosition(textarea: HTMLTextAreaElement, caretOffset: number): TextareaFocusBookmark['marker'] {
    const styles = window.getComputedStyle(textarea);
    const mirror = window.document.createElement('div');
    const marker = window.document.createElement('span');

    Object.assign(mirror.style, {
        position: 'absolute',
        visibility: 'hidden',
        whiteSpace: 'pre-wrap',
        overflowWrap: 'break-word',
        top: '0',
        left: '-9999px',
        boxSizing: styles.boxSizing,
        width: styles.width,
        padding: styles.padding,
        border: styles.border,
        font: styles.font,
        lineHeight: styles.lineHeight,
    });

    mirror.textContent = textarea.value.slice(0, caretOffset);
    marker.textContent = '\u200b';
    mirror.append(marker);
    window.document.body.append(mirror);

    const position = {
        left: marker.offsetLeft - textarea.scrollLeft,
        top: marker.offsetTop - textarea.scrollTop,
        height: Number.parseFloat(styles.lineHeight) || Number.parseFloat(styles.fontSize),
    };

    mirror.remove();
    return position;
}

function isEditableTarget(target: EventTarget | null): boolean {
    return target instanceof Element && !!target.closest('input, select, textarea, [contenteditable="true"]');
}

export function useTextareaFocusBookmark(
    containerRef: RefObject<HTMLElement>,
    canRestore: (event: KeyboardEvent) => boolean,
    bookmarkScope: string,
): {
    bookmark: TextareaFocusBookmark | null;
} {
    const [bookmark, setBookmark] = useState<TextareaFocusBookmark | null>(null);
    const bookmarkRef = useRef<TextareaFocusBookmark | null>(null);
    const canRestoreRef = useRef(canRestore);
    canRestoreRef.current = canRestore;

    const clearBookmark = useCallback(() => {
        bookmarkRef.current = null;
        setBookmark(null);
    }, []);

    useEffect(() => {
        clearBookmark();
    }, [bookmarkScope, clearBookmark]);

    useEffect(() => {
        const handleFocusIn = (event: FocusEvent): void => {
            if (event.target instanceof Element && containerRef.current?.contains(event.target)) {
                clearBookmark();
            }
        };

        const handleKeyDown = (event: KeyboardEvent): void => {
            if (event.key !== 'Escape' || event.isComposing) {
                return;
            }

            const savedBookmark = bookmarkRef.current;
            if (event.target instanceof HTMLTextAreaElement && containerRef.current?.contains(event.target)) {
                const caretOffset = event.target.selectionEnd;

                event.preventDefault();
                event.stopPropagation();
                const nextBookmark: TextareaFocusBookmark = {
                    element: event.target,
                    caretOffset,
                    marker: getCaretMarkerPosition(event.target, caretOffset),
                };
                bookmarkRef.current = nextBookmark;
                setBookmark(nextBookmark);
                event.target.blur();
                return;
            }

            if (
                savedBookmark &&
                canRestoreRef.current(event) &&
                !isEditableTarget(event.target)
            ) {
                event.preventDefault();
                event.stopPropagation();
                clearBookmark();
                savedBookmark.element.focus({ preventScroll: true });
                savedBookmark.element.setSelectionRange(savedBookmark.caretOffset, savedBookmark.caretOffset);
            }
        };

        window.document.addEventListener('focusin', handleFocusIn, true);
        window.document.addEventListener('keydown', handleKeyDown, true);
        return () => {
            window.document.removeEventListener('focusin', handleFocusIn, true);
            window.document.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [clearBookmark, containerRef]);

    return { bookmark };
}

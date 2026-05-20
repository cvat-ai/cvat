// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useParams } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
    }, []);

    const submit = useCallback((updatedValue: string) => {
        if (guide) {
            guide.markdown = updatedValue;
            setFetching(true);
            guide.save().then((result: AnnotationGuide) => {
                setValue(result.markdown);
                setGuide(result);
                notification.info({ message: 'Annotation guide was saved successfully' });
            }).catch((error: unknown) => {
                notification.error({
                    message: 'Could not save guide on the server',
                    description: error instanceof Error ? error.message : '',
                });
            }).finally(() => {
                setFetching(false);
            });
        }
    }, [guide]);

    const handleInsertFiles = useCallback(
        async (files: FileList): Promise<void> => {
            if (mdEditorRef.current && guide?.id) {
                const assetsToAdd = Array.from(files);
                const addedAssets: [File, string][] = [];
                const { textArea } = mdEditorRef.current.commandOrchestrator;
                const { selectionStart, selectionEnd, value: textAreaValue } = textArea;
                const computeNewValue = (): string => {
                    const addedStrings = addedAssets.map(([file, uuid]) => {
                        if (file.type.startsWith('image/')) {
                            return `![image](/api/assets/${uuid})`;
                        }
                        return `[${file.name}](/api/assets/${uuid})`;
                    });

                    const stringsToAdd = assetsToAdd.map((file: File) => {
                        if (file.type.startsWith('image/')) {
                            return '![image](Loading...)';
                        }
                        return `![${file.name}](Loading...)`;
                    });

                    const beforeSelection = textAreaValue.slice(0, selectionStart);
                    const selection = addedStrings.concat(stringsToAdd).join('\n');
                    const afterSelection = textAreaValue.slice(selectionEnd);
                    return `${beforeSelection}${selection}${afterSelection}`;
                };

                setValue(computeNewValue());
                setFetching(true);
                try {
                    let file = assetsToAdd.shift();
                    while (file) {
                        try {
                            const { uuid } = await core.assets.create(file, guide.id);
                            addedAssets.push([file, uuid]);
                            setValue(computeNewValue());
                        } catch (error: any) {
                            notification.error({
                                message: 'Could not create a server asset',
                                description: error.toString(),
                            });
                        } finally {
                            file = assetsToAdd.shift();
                        }
                    }
                } finally {
                    setFetching(false);
                }

                await submit(computeNewValue());
            }
        },
        [guide, value],
    );
                const { textArea } = mdEditorRef.current.commandOrchestrator;
                const { selectionStart, selectionEnd, value: textAreaValue } = textArea;
                const computeNewValue = (): string => {
                    const addedStrings = addedAssets.map(([file, uuid]) => {
                        if (file.type.startsWith('image/')) {
                            return `![image](/api/assets/${uuid})`;
                        }
                        return `[${file.name}](/api/assets/${uuid})`;
                    });

                    const stringsToAdd = assetsToAdd.map((file: File) => {
                        if (file.type.startsWith('image/')) {
                            return '![image](Loading...)';
                        }
                        return `![${file.name}](Loading...)`;
                    });

                    const beforeSelection = textAreaValue.slice(0, selectionStart);
                    const selection = addedStrings.concat(stringsToAdd).join('\n');
                    const afterSelection = textAreaValue.slice(selectionEnd);
                    return `${beforeSelection}${selection}${afterSelection}`;
                };

                setValue(computeNewValue());
                setFetching(true);
                try {
                    let file = assetsToAdd.shift();
                    while (file) {
                        try {
                            const { uuid } = await core.assets.create(file, guide.id);
                            addedAssets.push([file, uuid]);
                            setValue(computeNewValue());
                        } catch (error: any) {
                            notification.error({
                                message: 'Could not create a server asset',
                                description: error.toString(),
                            });
                        } finally {
                            file = assetsToAdd.shift();
                        }
                    }
                } finally {
                    setFetching(false);
                }

                await submit(computeNewValue());
            }
        },
        [guide, value],
    );

    return (
        <Row justify='center' align='top' className='cvat-guide-page'>
            {fetching && <CVATLoadingSpinner />}
            <Col {...dimensions}>
                <div className='cvat-guide-page-top'>
                    <GoBackButton />
                </div>
                <div
                    className='cvat-guide-page-editor-wrapper'
                    onDragOver={(event: React.DragEvent) => {
                        if (!(event.target as HTMLElement).closest('.w-md-editor-preview')) {
                            event.preventDefault();
                        }
                    }}
                    onDrop={(event: React.DragEvent) => {
                        if ((event.target as HTMLElement).closest('.w-md-editor-preview')) {
                            return;
                        }
                        const { dataTransfer } = event;
                        const { files } = dataTransfer;
                        if (files.length) {
                            event.preventDefault();
                            handleInsertFiles(files);
                        }
                    }}
                >
                    <MDEditor
                        visibleDragbar={false}
                        height='100%'
                        data-color-mode='light'
                        ref={mdEditorRef}
                        value={value}
                        onChange={(val: string | undefined) => {
                            setValue(val || '');
                        }}
                        onPaste={(event: React.ClipboardEvent) => {
                            const { clipboardData } = event;
                            const { files } = clipboardData;
                            if (files.length) {
                                event.preventDefault();
                                handleInsertFiles(files);
                            }
                        }}
                        onDrop={(event: React.DragEvent) => {
                            if ((event.target as HTMLElement).closest('.w-md-editor-preview')) {
                                return;
                            }
                            const { dataTransfer } = event;
                            const { files } = dataTransfer;
                            if (files.length) {
                                event.preventDefault();
                                event.stopPropagation();
                                handleInsertFiles(files);
                            }
                        }}
                        style={{ whiteSpace: 'pre-wrap' }}
                        previewOptions={{ rehypePlugins: [[rehypeSanitize]] }}
                    />
                </div>
                <Space align='end' className='cvat-guide-page-bottom'>
                    <Button type='primary' disabled={fetching || !guide?.id} onClick={() => submit(value)}>
                        Submit
                    </Button>
                </Space>
            </Col>
        </Row>
    );
}

export default React.memo(AnnotationGuidePage);

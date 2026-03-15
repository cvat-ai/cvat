// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useParams, useHistory } from 'react-router';
import { Prompt } from 'react-router-dom';
import { LeftOutlined } from '@ant-design/icons';
import { Row, Col } from 'antd/lib/grid';
import notification from 'antd/lib/notification';
import Button from 'antd/lib/button';
import Text from 'antd/lib/typography/Text';
import Space from 'antd/lib/space';
import MDEditor, { commands } from '@uiw/react-md-editor';

import { getCore, AnnotationGuide } from 'cvat-core-wrapper';
import CVATLoadingSpinner from 'components/common/loading-spinner';
import dimensions from 'utils/dimensions';

const core = getCore();

function localStorageKey(instanceType: string, id: number): string {
    return `cvat_annotation_guide_draft_${instanceType}_${id}`;
}

function AnnotationGuidePage(): JSX.Element {
    const mdEditorRef = useRef<typeof MDEditor & { commandOrchestrator: commands.TextAreaCommandOrchestrator }>(null);
    const history = useHistory();
    const location = useLocation();
    const [value, setValue] = useState('');
    const instanceType = location.pathname.includes('projects') ? 'project' : 'task';
    const id = +useParams<{ id: string }>().id;
    const [guide, setGuide] = useState<AnnotationGuide | null>(null);
    const [fetching, setFetching] = useState(true);
    const [isDirty, setIsDirty] = useState(false);
    const savedValueRef = useRef('');

    useEffect(() => {
        const promise = instanceType === 'project' ? core.projects.get({ id }) : core.tasks.get({ id });
        promise
            .then((result) => result[0].guide())
            .then((existingGuide: AnnotationGuide | null) => {
                if (!existingGuide) {
                    const newGuide = new AnnotationGuide({
                        ...(instanceType === 'project' ? { project_id: id } : { task_id: id }),
                        markdown: '',
                    });
                    return newGuide.save();
                }

                return existingGuide;
            })
            .then((guideInstance: AnnotationGuide) => {
                savedValueRef.current = guideInstance.markdown;
                setGuide(guideInstance);

                const draftKey = localStorageKey(instanceType, id);
                const draft = localStorage.getItem(draftKey);

                if (draft !== null && draft !== guideInstance.markdown) {
                    setValue(draft);
                    setIsDirty(true);
                    notification.info({
                        message: 'Unsaved draft found',
                        description:
                            'An unsaved local draft was found for this guide. It has been restored for you. Submit to save it, or discard it to revert to the last saved version.',
                        duration: 0,
                        btn: (
                            <Button
                                size='small'
                                onClick={() => {
                                    localStorage.removeItem(draftKey);
                                    setValue(guideInstance.markdown);
                                    setIsDirty(false);
                                    notification.destroy();
                                }}
                            >
                                Discard draft
                            </Button>
                        ),
                    });
                } else {
                    setValue(guideInstance.markdown);
                }
            })
            .catch((error: unknown) => {
                notification.error({
                    message: `Could not receive guide for the ${instanceType} ${id}`,
                    description: error instanceof Error ? error.message : '',
                });
            })
            .finally(() => {
                setFetching(false);
            });
    }, []);

    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
            if (isDirty) {
                event.preventDefault();
                // eslint-disable-next-line no-param-reassign
                event.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isDirty]);

    const submit = useCallback(
        (updatedValue: string) => {
            if (guide) {
                guide.markdown = updatedValue;
                setFetching(true);
                guide
                    .save()
                    .then((result: AnnotationGuide) => {
                        savedValueRef.current = result.markdown;
                        setValue(result.markdown);
                        setGuide(result);
                        setIsDirty(false);
                        localStorage.removeItem(localStorageKey(instanceType, id));
                    })
                    .catch((error: unknown) => {
                        notification.error({
                            message: 'Could not save guide on the server',
                            description: error instanceof Error ? error.message : '',
                        });
                    })
                    .finally(() => {
                        setFetching(false);
                    });
            }
        },
        [guide, instanceType, id],
    );

    const handleInsertFiles = useCallback(
        async (files: FileList): Promise<void> => {
            if (mdEditorRef.current && guide?.id) {
                const assetsToAdd = Array.from(files);
                const addedAssets: [File, string][] = [];
                const { textArea } = mdEditorRef.current.commandOrchestrator;
                const { selectionStart, selectionEnd, value: textAreaValue } = textArea;
                const draftKey = localStorageKey(instanceType, id);
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
                setIsDirty(true);
                localStorage.setItem(draftKey, computeNewValue());
                setFetching(true);
                try {
                    let file = assetsToAdd.shift();
                    while (file) {
                        try {
                            const { uuid } = await core.assets.create(file, guide.id);
                            addedAssets.push([file, uuid]);
                            setValue(computeNewValue());
                            localStorage.setItem(draftKey, computeNewValue());
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
        [guide, value, instanceType, id],
    );

    return (
        <>
            <Prompt
                when={isDirty}
                message='The annotation guide has unsaved changes. Are you sure you want to leave?'
            />
            <Row justify='center' align='top' className='cvat-guide-page'>
                {fetching && <CVATLoadingSpinner />}
                <Col {...dimensions}>
                    <div className='cvat-guide-page-top'>
                        <Button
                            className='cvat-back-btn'
                            style={{ marginRight: 8 }}
                            onClick={() => history.push(`/${instanceType === 'project' ? 'projects' : 'tasks'}/${id}`)}
                        >
                            <LeftOutlined />
                        </Button>
                        <Text style={{ userSelect: 'none' }} strong>
                            Back
                        </Text>
                    </div>
                    <div className='cvat-guide-page-editor-wrapper'>
                        <MDEditor
                            visibleDragbar={false}
                            height='100%'
                            data-color-mode='light'
                            ref={mdEditorRef}
                            value={value}
                            onChange={(val: string | undefined) => {
                                const newVal = val || '';
                                setValue(newVal);
                                setIsDirty(newVal !== savedValueRef.current);
                                if (newVal !== savedValueRef.current) {
                                    localStorage.setItem(localStorageKey(instanceType, id), newVal);
                                } else {
                                    localStorage.removeItem(localStorageKey(instanceType, id));
                                }
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
                                const { dataTransfer } = event;
                                const { files } = dataTransfer;
                                if (files.length) {
                                    event.preventDefault();
                                    handleInsertFiles(files);
                                }
                            }}
                            style={{ whiteSpace: 'pre-wrap' }}
                        />
                    </div>
                    <Space align='end' className='cvat-guide-page-bottom'>
                        <Button type='primary' disabled={fetching || !guide?.id} onClick={() => submit(value)}>
                            Submit
                        </Button>
                    </Space>
                </Col>
            </Row>
        </>
    );
}

export default React.memo(AnnotationGuidePage);

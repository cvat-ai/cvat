// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React, {
    useState, useEffect, useRef, useCallback,
} from 'react';
import { useLocation, useParams } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import notification from 'antd/lib/notification';
import Button from 'antd/lib/button';
import Space from 'antd/lib/space';
import MDEditor, { commands } from '@uiw/react-md-editor';

import {
    getCore, Task, Project, AnnotationGuide,
} from 'cvat-core-wrapper';
import { useIsMounted } from 'utils/hooks';
import CVATLoadingSpinner from 'components/common/loading-spinner';
import GoBackButton from 'components/common/go-back-button';

const core = getCore();

function GuidePage(): JSX.Element {
    const mdEditorRef = useRef<typeof MDEditor & { commandOrchestrator: commands.TextAreaCommandOrchestrator }>(null);
    const location = useLocation();
    const isMounted = useIsMounted();
    const [value, setValue] = useState('');
    const instanceType = location.pathname.includes('projects') ? 'project' : 'task';
    const id = +useParams<{ id: string }>().id;
    const [guide, setGuide] = useState<AnnotationGuide>(
        new AnnotationGuide({
            ...(instanceType === 'project' ? { project_id: id } : { task_id: id }),
            markdown: value,
        }),
    );
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        const promise = instanceType === 'project' ? core.projects.get({ id }) : core.tasks.get({ id });
        promise.then(([instance]: [Task | Project]) => (
            instance.guide()
        )).then(async (guideInstance: AnnotationGuide | null) => {
            if (!guideInstance) {
                const createdGuide = await guide.save();
                return createdGuide;
            }

            return guideInstance;
        }).then((guideInstance: AnnotationGuide) => {
            if (isMounted()) {
                setValue(guideInstance.markdown);
                setGuide(guideInstance);
            }
        }).catch((error: any) => {
            if (isMounted()) {
                notification.error({
                    message: `Could not receive guide for the ${instanceType} ${id}`,
                    description: error.toString(),
                });
            }
        }).finally(() => {
            if (isMounted()) {
                setFetching(false);
            }
        });
    }, []);

    const submit = useCallback((currentValue: string) => {
        guide.markdown = currentValue;
        setFetching(true);
        guide.save().then((result: AnnotationGuide) => {
            if (isMounted()) {
                setValue(result.markdown);
                setGuide(result);
            }
        }).catch((error: any) => {
            if (isMounted()) {
                notification.error({
                    message: 'Could not save guide on the server',
                    description: error.toString(),
                });
            }
        }).finally(() => {
            if (isMounted()) {
                setFetching(false);
            }
        });
    }, [guide, fetching]);

    const handleInsert = async (event: React.ClipboardEvent | React.DragEvent, files: FileList): Promise<void> => {
        if (files.length && guide.id) {
            event.preventDefault();
            const assetsToAdd = Array.from(files);
            const addedAssets: [File, string][] = [];

            if (mdEditorRef.current) {
                const { textArea } = mdEditorRef.current.commandOrchestrator;
                const { selectionStart, selectionEnd } = textArea;
                const computeNewValue = (): string => {
                    const addedStrings = addedAssets.map(([file, uuid]) => {
                        if (file.type.startsWith('image/')) {
                            return (`![image](/api/assets/${uuid})`);
                        }
                        return (`[${file.name}](/api/assets/${uuid})`);
                    });

                    const stringsToAdd = assetsToAdd.map((file: File) => {
                        if (file.type.startsWith('image/')) {
                            return '![image](Loading...)';
                        }
                        return `![${file.name}](Loading...)`;
                    });

                    return `${value.slice(0, selectionStart)}\n${addedStrings.concat(stringsToAdd).join('\n')}\n${value.slice(selectionEnd)}`;
                };

                setValue(computeNewValue());
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

                const finalValue = computeNewValue();
                setValue(finalValue);
                submit(finalValue);
            }
        }
    };

    return (
        <Row
            justify='center'
            align='top'
            className='cvat-guide-page'
        >
            { fetching && <CVATLoadingSpinner /> }
            <Col md={22} lg={18} xl={16} xxl={14}>
                <div className='cvat-guide-page-top'>
                    <GoBackButton />
                </div>
                <div className='cvat-guide-page-editor-wrapper'>
                    <MDEditor
                        visibleDragbar={false}
                        height='100%'
                        data-color-mode='light'
                        ref={mdEditorRef}
                        value={value}
                        onChange={(val: string | undefined) => {
                            setValue(val || '');
                        }}
                        onPaste={async (event: React.ClipboardEvent) => {
                            const { clipboardData } = event;
                            const { files } = clipboardData;
                            handleInsert(event, files);
                        }}
                        onDrop={async (event: React.DragEvent) => {
                            const { dataTransfer } = event;
                            const { files } = dataTransfer;
                            handleInsert(event, files);
                        }}
                        style={{ whiteSpace: 'pre-wrap' }}
                    />
                </div>
                <Space align='end' className='cvat-guide-page-bottom'>
                    <Button
                        type='primary'
                        disabled={fetching || !guide.id}
                        onClick={() => submit(value)}
                    >
                        Submit
                    </Button>
                </Space>
            </Col>
        </Row>
    );
}

export default React.memo(GuidePage);

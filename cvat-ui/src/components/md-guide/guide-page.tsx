// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React, { useState, useEffect, useRef } from 'react';
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
    const [fetching, setFetching] = useState(false);

    useEffect(() => {
        setFetching(true);
        const promise = instanceType === 'project' ? core.projects.get({ id }) : core.tasks.get({ id });
        promise.then(([instance]: [Task | Project]) => (
            instance.guide()
        )).then((guideInstance: AnnotationGuide | null) => {
            if (guideInstance) {
                return (async () => guideInstance)();
            }
            return guide.save();
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

    const handleInsert = async (event: React.ClipboardEvent | React.DragEvent, files: FileList): Promise<void> => {
        if (files.length) {
            event.preventDefault();
            const addedAssets = [];
            if (mdEditorRef.current) {
                const { textArea } = mdEditorRef.current.commandOrchestrator;
                const { selectionStart, selectionEnd } = textArea;
                for (const file of files) {
                    const { uuid } = await core.assets.create(file, guide.id);
                    if (file.type.startsWith('image/')) {
                        addedAssets.push(`![image](/api/assets/${uuid})`);
                    } else {
                        addedAssets.push(`[${file.name}](/api/assets/${uuid})`);
                    }
                }

                setValue(`${value.slice(0, selectionStart)}\n${addedAssets.join('\n')}\n${value.slice(selectionEnd)}`);
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
                        disabled={fetching}
                        onClick={() => {
                            let guideInstance = guide;
                            if (!guideInstance) {
                                guideInstance = new AnnotationGuide({
                                    ...(instanceType === 'project' ? { project_id: id } : { task_id: id }),
                                    markdown: value,
                                });
                            } else {
                                guideInstance.markdown = value;
                            }

                            setFetching(true);
                            guideInstance.save().then((result: AnnotationGuide) => {
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
                        }}
                    >
                        Submit
                    </Button>
                </Space>
            </Col>
        </Row>
    );
}

export default React.memo(GuidePage);

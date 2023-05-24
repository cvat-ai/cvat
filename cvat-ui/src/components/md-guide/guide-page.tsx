// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useParams } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import notification from 'antd/lib/notification';
import Text from 'antd/lib/typography/Text';
import Button from 'antd/lib/button';

import MDEditor from '@uiw/react-md-editor';
import {
    getCore, Task, Project, AnnotationGuide,
} from 'cvat-core-wrapper';
import { useIsMounted } from 'utils/hooks';

const core = getCore();

function GuidePage(): JSX.Element {
    // отображение гайда на странице джобы
    // сделать нормальную страничку с редактированием гайда
    // копирование гайда с ассетами с проверкой доступа

    // production

    // удаление ассетов без гайда через какой то время
    // refactoring, check db performance
    // добавить обработку правил через rego файлы, iam организации
    // todo: add working with a local storage
    // todo: Ctrl + S добавить шорткат
    // добавить ассеты и гайды в админ панель
    // merge migration files

    const mdEditorRef = useRef();
    const location = useLocation();
    const isMounted = useIsMounted();
    const [value, setValue] = useState('');
    const [guide, setGuide] = useState<AnnotationGuide | null>(null);
    const [fetching, setFetching] = useState(false);
    const id = +useParams<{ id: string }>().id;
    const instanceType = location.pathname.includes('projects') ? 'project' : 'task';

    useEffect(() => {
        setFetching(true);
        const promise = instanceType === 'project' ? core.projects.get({ id }) : core.tasks.get({ id });
        promise.then(([instance]: [Task | Project]) => {
            const { guideId } = instance;
            if (guideId !== null) {
                return core.guides.get({ id: guideId });
            }
            return Promise.resolve(null);
        }).then((guideInstance: AnnotationGuide | null) => {
            if (guideInstance && isMounted()) {
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
            console.log(error.toString());
        }).finally(() => {
            if (isMounted()) {
                setFetching(false);
            }
        });
    }, []);

    // todo: add fetching overlay

    return (
        <>
            <div>
                Header
                {/* add back arrow */}
            </div>
            <div data-color-mode='light'>
                <MDEditor
                    ref={mdEditorRef}
                    value={value}
                    onChange={(val: string | undefined) => {
                        // todo: debounce
                        setValue(val || '');
                    }}
                    onPaste={async (event: React.ClipboardEvent) => {
                        const { clipboardData } = event;
                        const { files } = clipboardData;
                        if (files.length) {
                            const selection = window.getSelection();
                            if (!selection || !selection.rangeCount) return false;
                            event.preventDefault();
                            for (const file of files) {
                                const { uuid } = await core.assets.create(file);
                                const { selectionStart, selectionEnd } = mdEditorRef.current.textarea;
                                let text = '';
                                if (file.type.startsWith('image/')) {
                                    text = `![image](/api/assets/${uuid})`;
                                } else {
                                    text = `[${file.name}](/api/assets/${uuid})`;
                                }

                                setValue(`${value.slice(0, selectionStart)}${text}${value.slice(selectionEnd)}`);
                            }
                        }
                    }}
                    onDrop={async (event: React.DragEvent) => {
                        const { dataTransfer } = event;
                        const { files } = dataTransfer;
                        if (files.length) {
                            const selection = window.getSelection();
                            if (!selection || !selection.rangeCount) return false;
                            event.preventDefault();
                            for (const file of files) {
                                const { uuid } = await core.assets.create(file);
                                const { selectionStart, selectionEnd } = mdEditorRef.current.textarea;
                                let text = '';
                                if (file.type.startsWith('image/')) {
                                    text = `![image](/api/assets/${uuid})`;
                                } else {
                                    text = `[${file.name}](/api/assets/${uuid})`;
                                }

                                setValue(`${value.slice(0, selectionStart)}${text}${value.slice(selectionEnd)}`);
                            }
                        }
                    }}
                    style={{ whiteSpace: 'pre-wrap' }}
                />
            </div>
            <div>
                {/* add submit arrow */}
                <Button
                    loading={fetching}
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
            </div>
        </>
    );
}

export default React.memo(GuidePage);

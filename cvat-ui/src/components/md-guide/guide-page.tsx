// Copyright (C) 2023-2024 CVAT.ai Corporation
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

import { getCore, AnnotationGuide } from 'cvat-core-wrapper';
import CVATLoadingSpinner from 'components/common/loading-spinner';
import GoBackButton from 'components/common/go-back-button';

const core = getCore();

const handleTextItem = (textItem: string, guideId: number): Promise<string> => {
    const regex = /!\[image\]\((\/api\/assets\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}))\)/g;
    return new Promise<string>((resolve) => {
        const promises: Promise<void>[] = [];
        const replacements: Record<number, [string, string]> = {};
        let match = regex.exec(textItem);

        while (match !== null) {
            const url = match[1];
            const { index } = match as RegExpExecArray;
            const fullMatch = match[0];
            const currentUUID = match[2];

            const promise = fetch(url)
                .then((response) => response.blob())
                .then((blob: Blob) => {
                    const type = blob.type.split('/');
                    if (type.length < 1) {
                        throw new Error('Unknown file extension');
                    }
                    return new File([blob], `file.${type[1]}`, { type: blob.type });
                })
                .then((file: File) => core.assets.create(file, guideId))
                .then(({ uuid }: { uuid: string }): void => {
                    const result = `![image](/api/assets/${uuid})`;
                    replacements[index] = [fullMatch, result];
                }).catch((error: unknown) => {
                    notification.error({
                        message: 'Could not insert asset',
                        description: `Asset ${fullMatch} was not inserted. ${error instanceof Error ? error.message : ''}`,
                    });
                    const result = `<!--- ERROR: Could not update asset ${currentUUID} --->`;
                    replacements[index] = [fullMatch, result];
                });

            promises.push(promise);
            match = regex.exec(textItem);
        }

        Promise.allSettled(promises).then(() => {
            const keys = Object.keys(replacements).map((key) => +key).sort((a, b) => a - b);
            if (keys.length) {
                let handled = textItem.slice(0, keys[0]) + replacements[keys[0]][1];
                for (let i = 1; i < keys.length; i++) {
                    const prevKey = keys[i - 1];
                    const key = keys[i];
                    handled += textItem.slice(prevKey + replacements[prevKey][0].length, key);
                    const [, to] = replacements[key];
                    handled += to;
                }
                const lastKey = keys[keys.length - 1];
                handled += textItem.slice(lastKey + replacements[lastKey][0].length);
                resolve(handled);
            } else {
                resolve(textItem);
            }
        });
    });
};

function GuidePage(): JSX.Element {
    const mdEditorRef = useRef<typeof MDEditor & { commandOrchestrator: commands.TextAreaCommandOrchestrator }>(null);
    const location = useLocation();
    const [value, setValue] = useState('');
    const instanceType = location.pathname.includes('projects') ? 'project' : 'task';
    const id = +useParams<{ id: string }>().id;
    const [guide, setGuide] = useState<AnnotationGuide | null>(null);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        const promise = instanceType === 'project' ? core.projects.get({ id }) : core.tasks.get({ id });
        promise.then((result) => result[0].guide())
            .then((existingGuide: AnnotationGuide | null) => {
                if (!existingGuide) {
                    const newGuide = new AnnotationGuide({
                        ...(instanceType === 'project' ? { project_id: id } : { project_id: id }),
                        markdown: '',
                    });
                    return newGuide.save();
                }

                return existingGuide;
            }).then((guideInstance: AnnotationGuide) => {
                setValue(guideInstance.markdown);
                setGuide(guideInstance);
            }).catch((error: unknown) => {
                notification.error({
                    message: `Could not receive guide for the ${instanceType} ${id}`,
                    description: error instanceof Error ? error.message : '',
                });
            }).finally(() => {
                setFetching(false);
            });
    }, []);

    const submit = useCallback((currentValue: string) => {
        if (guide) {
            guide.markdown = currentValue;
            setFetching(true);
            guide.save().then((result: AnnotationGuide) => {
                setValue(result.markdown);
                setGuide(result);
            }).catch((error: unknown) => {
                notification.error({
                    message: 'Could not save guide on the server',
                    description: error instanceof Error ? error.message : '',
                });
            }).finally(() => {
                setFetching(false);
            });
        }
    }, [guide, fetching]);

    const handleInsertFiles = async (event: React.ClipboardEvent | React.DragEvent, files: FileList): Promise<void> => {
        if (files.length && guide?.id) {
            // files are inserted to the guide

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

    const handleInsertText = async (event: React.ClipboardEvent, items: DataTransferItem[]): Promise<void> => {
        const stringifiedItems: string[] = [];

        if (mdEditorRef.current && guide?.id) {
            const { textArea } = mdEditorRef.current.commandOrchestrator;
            const { selectionStart, selectionEnd } = textArea;

            const computeNewValue = (): string => {
                const beforeSelection = value.slice(0, selectionStart);
                const selection = stringifiedItems.join('\n');
                const afterSelection = value.slice(selectionEnd);
                return `${beforeSelection}${selection}${afterSelection}`;
            };

            for await (const item of items) {
                const originalItem = await new Promise<string>((resolve) => {
                    item.getAsString((data: string) => {
                        resolve(data);
                    });
                });

                stringifiedItems.push(originalItem);
                setValue(computeNewValue());
            }

            for (let i = 0; i < stringifiedItems.length; i++) {
                const stringifiedItem = stringifiedItems[i];
                const updatedItem = await handleTextItem(stringifiedItem, guide.id);
                stringifiedItems[i] = updatedItem;
                setValue(computeNewValue());
            }

            const finalValue = computeNewValue();
            setValue(finalValue);
            submit(finalValue);
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
                            const { files, items } = clipboardData;
                            if (files.length) {
                                handleInsertFiles(event, files);
                            } else {
                                handleInsertText(event, items);
                            }
                        }}
                        onDrop={async (event: React.DragEvent) => {
                            const { dataTransfer } = event;
                            const { files } = dataTransfer;
                            handleInsertFiles(event, files);
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

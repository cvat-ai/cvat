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
import dimensions from 'utils/dimensions';

const core = getCore();

const handleTextItem = (textItem: string, guideId: number, onRequest: () => void): Promise<string> => {
    const regex = /\(\/api\/assets\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)/g;
    return new Promise<string>((resolve) => {
        const promises: Promise<void>[] = [];
        const replacements: Record<number, [string, string]> = {};
        let match = regex.exec(textItem);

        while (match !== null) {
            onRequest();
            const { index } = match as RegExpExecArray;
            const assetURL = match[0];
            const currentUUID = match[1];

            const promise = fetch(assetURL.slice(1, -1))
                .then((response) => {
                    if (response.status !== 200) {
                        throw new Error('Asset request failed');
                    }

                    return response.blob()
                        .then((blob: Blob) => {
                            const type = blob.type.split('/');
                            if (type.length < 1) {
                                throw new Error('Unknown asset extension received');
                            }
                            return new File([blob], `file.${type[1]}`, { type: blob.type });
                        })
                        .then((file: File) => core.assets.create(file, guideId))
                        .then(({ uuid }: { uuid: string }): void => {
                            const result = `(/api/assets/${uuid})`;
                            replacements[index] = [assetURL, result];
                        }).catch((error: unknown) => {
                            const comment = `ERROR: Could not update asset "${currentUUID}".` +
                                ` ${error instanceof Error ? error.message : ''}`;
                            const result = `<!--- ${comment} --->`;
                            replacements[index] = [assetURL, result];
                        });
                }).catch(() => {
                    replacements[index] = [assetURL, assetURL];
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

function AnnotationGuidePage(): JSX.Element {
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

    const submit = useCallback((updatedValue: string) => {
        if (guide) {
            guide.markdown = updatedValue;
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
    }, [guide]);

    const handleInsertFiles = useCallback(async (files: FileList): Promise<void> => {
        if (mdEditorRef.current && guide?.id) {
            const assetsToAdd = Array.from(files);
            const addedAssets: [File, string][] = [];
            const { textArea } = mdEditorRef.current.commandOrchestrator;
            const { selectionStart, selectionEnd, value: textAreaValue } = textArea;
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
    }, [guide, value]);

    const handleInsertText = useCallback(async (items: DataTransferItem[]): Promise<void> => {
        if (mdEditorRef.current && guide?.id) {
            const stringifiedItems: string[] = [];
            const { textArea } = mdEditorRef.current.commandOrchestrator;
            const { selectionStart, selectionEnd, value: textAreaValue } = textArea;

            const computeNewValue = (): string => {
                const beforeSelection = textAreaValue.slice(0, selectionStart);
                const selection = stringifiedItems.join('\n');
                const afterSelection = textAreaValue.slice(selectionEnd);
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

            let hasToSave = false;
            try {
                for (let i = 0; i < stringifiedItems.length; i++) {
                    const stringifiedItem = stringifiedItems[i];
                    const updatedItem = await handleTextItem(stringifiedItem, guide.id, () => setFetching(true));

                    if (updatedItem !== stringifiedItem) {
                        stringifiedItems[i] = updatedItem;
                        setValue(computeNewValue());
                        hasToSave = true;
                    }
                }
            } finally {
                setFetching(false);
            }

            textArea.setSelectionRange(selectionEnd, selectionEnd);
            if (hasToSave) {
                await submit(computeNewValue());
            }
        }
    }, [guide]);

    return (
        <Row justify='center' align='top' className='cvat-guide-page'>
            { fetching && <CVATLoadingSpinner /> }
            <Col {...dimensions}>
                <div className='cvat-guide-page-top'>
                    <GoBackButton />
                </div>
                <div className='cvat-guide-page-editor-wrapper'>
                    <MDEditor
                        visibleDragbar={false}
                        data-color-mode='light'
                        ref={mdEditorRef}
                        value={value}
                        height='100%'
                        onChange={(val: string | undefined) => {
                            setValue(val || '');
                        }}
                        onPaste={async (event: React.ClipboardEvent) => {
                            const { clipboardData } = event;
                            const { files, items } = clipboardData;
                            event.preventDefault();

                            if (files.length) {
                                await handleInsertFiles(files);
                            } else {
                                await handleInsertText(Array.from(items).filter((item) => item.type === 'text/plain'));
                            }
                        }}
                        onDrop={async (event: React.DragEvent) => {
                            const { dataTransfer } = event;
                            const { files } = dataTransfer;
                            event.preventDefault();
                            if (files.length) {
                                await handleInsertFiles(files);
                            }
                        }}
                        style={{ whiteSpace: 'pre-wrap' }}
                    />
                </div>
                <Space align='end' className='cvat-guide-page-bottom'>
                    <Button
                        type='primary'
                        disabled={fetching || !guide?.id}
                        onClick={() => submit(value)}
                    >
                        Submit
                    </Button>
                </Space>
            </Col>
        </Row>
    );
}

export default React.memo(AnnotationGuidePage);

// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React, {
    useState, useEffect, useRef, useCallback,
} from 'react';
import { useHistory, useLocation, useParams } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import notification from 'antd/lib/notification';
import Button from 'antd/lib/button';
import Space from 'antd/lib/space';
import MDEditor, { commands } from '@uiw/react-md-editor';
import rehypeSanitize from 'rehype-sanitize';

import { getCore, AnnotationGuide } from 'cvat-core-wrapper';
import CVATLoadingSpinner from 'components/common/loading-spinner';
import GoBackButton from 'components/common/go-back-button';
import dimensions from 'utils/dimensions';

const core = getCore();
const confirmationMessage = 'You have unsaved changes, please confirm leaving this page.';

function AnnotationGuidePage(): JSX.Element {
    const mdEditorRef = useRef<typeof MDEditor & { commandOrchestrator: commands.TextAreaCommandOrchestrator }>(null);
    const history = useHistory();
    const location = useLocation();
    const [value, setValue] = useState('');
    const instanceType = location.pathname.includes('projects') ? 'project' : 'task';
    const id = +useParams<{ id: string }>().id;
    const [guide, setGuide] = useState<AnnotationGuide | null>(null);
    const [fetching, setFetching] = useState(true);
    // keep value and guide available in ref also so we can read actual
    // new/old values in callbacks without having dependencies on state
    const valueRef = useRef(value);
    const guideRef = useRef<AnnotationGuide | null>(guide);

    const updateValue = useCallback((updatedValue: string): void => {
        valueRef.current = updatedValue;
        setValue(updatedValue);
    }, []);

    const updateGuide = useCallback((updatedGuide: AnnotationGuide): void => {
        guideRef.current = updatedGuide;
        setGuide(updatedGuide);
    }, []);

    // we want this handler not to have dependencies on the state
    // so we don't have to re-register listeners on every value change
    const checkForUnsavedChanges = useCallback(
        (): boolean => !!guideRef.current && valueRef.current !== guideRef.current.markdown, []);
    const hasUnsavedChanges = guide && value !== guide.markdown;

    // handle standard beforeunload - warn about unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent): string | undefined => {
            if (!checkForUnsavedChanges()) {
                return undefined;
            }

            event.preventDefault();
            // eslint-disable-next-line no-param-reassign
            event.returnValue = confirmationMessage;
            return confirmationMessage;
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [checkForUnsavedChanges]);

    // handle react-router navigation - warn about unsaved changes
    useEffect(() => history.block((nextLocation) => {
        if (checkForUnsavedChanges() && nextLocation.pathname !== location.pathname) {
            return confirmationMessage;
        }

        return undefined;
    }), [checkForUnsavedChanges, location, history]);

    useEffect(() => {
        const promise = instanceType === 'project' ? core.projects.get({ id }) : core.tasks.get({ id });
        promise.then((result) => result[0].guide())
            .then((existingGuide: AnnotationGuide | null) => {
                if (!existingGuide) {
                    const newGuide = new AnnotationGuide({
                        ...(instanceType === 'project' ? { project_id: id } : { task_id: id }),
                        markdown: '',
                    });
                    return newGuide.save();
                }

                return existingGuide;
            }).then((guideInstance: AnnotationGuide) => {
                updateValue(guideInstance.markdown);
                updateGuide(guideInstance);
            }).catch((error: unknown) => {
                notification.error({
                    message: `Could not receive guide for the ${instanceType} ${id}`,
                    description: error instanceof Error ? error.message : '',
                });
            }).finally(() => {
                setFetching(false);
            });
    }, [id, instanceType, updateGuide, updateValue]);

    const submit = useCallback((updatedValue: string) => {
        if (guide) {
            // keep the guide in state unchanged until the server responds with the updated guide
            // otherwise, if the server responds with an error, the user might lose their changes w/o a warning
            const updatedGuide = new AnnotationGuide({
                id: guide.id,
                task_id: guide.taskId,
                project_id: guide.projectId,
                markdown: updatedValue,
            });
            setFetching(true);
            updatedGuide.save().then((result: AnnotationGuide) => {
                updateValue(result.markdown);
                updateGuide(result);
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
    }, [guide, updateGuide, updateValue]);

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

            updateValue(computeNewValue());
            setFetching(true);
            try {
                let file = assetsToAdd.shift();
                while (file) {
                    try {
                        const { uuid } = await core.assets.create(file, guide.id);
                        addedAssets.push([file, uuid]);
                        updateValue(computeNewValue());
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
    }, [guide, submit, updateValue]);

    return (
        <Row
            justify='center'
            align='top'
            className='cvat-guide-page'
        >
            { fetching && <CVATLoadingSpinner /> }
            <Col {...dimensions}>
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
                            updateValue(val || '');
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
                        previewOptions={{ rehypePlugins: [[rehypeSanitize]] }}
                    />
                </div>
                <Space align='end' className='cvat-guide-page-bottom'>
                    <Button
                        type='primary'
                        disabled={fetching || !guide?.id || !hasUnsavedChanges}
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

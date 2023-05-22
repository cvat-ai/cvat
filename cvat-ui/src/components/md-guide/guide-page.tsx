// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React, { useState, useEffect } from 'react';
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
    // добавить эндпоинты для получения гайда
    // добавить guides пространство имен в cvat-core

    // создать эндпоинт для загрузки ассетов на стороне клиента
    // завершить эндпоинт для загрузки ассетов на стороне сервера
    // сделать загрузку ассетов с сервера

    // сделать нормальную страничку с редактированием гайда
    // todo: add working with a local storage

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
                return core.guides.get(guideId);
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
                    value={value}
                    onChange={(val: string | undefined) => {
                        // todo: debounce
                        setValue(val || '');
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
                        }

                        setFetching(true);
                        guideInstance.save().then((result: AnnotationGuide) => {
                            setValue(result.markdown);
                            setGuide(result);
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

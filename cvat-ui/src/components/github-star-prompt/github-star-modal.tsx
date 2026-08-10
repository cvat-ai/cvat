// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useEffect, useRef } from 'react';
import Modal from 'antd/lib/modal';
import Button from 'antd/lib/button';
import Typography from 'antd/lib/typography';
import { StarFilled } from '@ant-design/icons';
import SVGGitHubStarPromptArrow from '../../assets/github-star-prompt-arrow.svg';

const { Title, Paragraph } = Typography;

interface Props {
    open: boolean;
    onShown: () => void;
    onSupport: () => void;
    onClose: () => void;
}

function GitHubStarModal(props: Props): JSX.Element {
    const {
        open,
        onShown,
        onSupport,
        onClose,
    } = props;
    const shown = useRef(false);

    useEffect(() => {
        if (open && !shown.current) {
            shown.current = true;
            onShown();
        }
    }, [open, onShown]);

    return (
        <Modal
            className='cvat-github-star-modal'
            wrapClassName='cvat-github-star-modal-wrap'
            open={open}
            getContainer={false}
            footer={null}
            width={1088}
            title={null}
            onCancel={onClose}
        >
            <div className='cvat-github-star-modal-layout'>
                <section className='cvat-github-star-modal-copy'>
                    <div className='cvat-github-star-modal-spark' aria-hidden='true'>
                        <i />
                        <i />
                        <i />
                    </div>
                    <Title level={1} className='cvat-github-star-modal-title'>
                        Like labeling
                        <br />
                        with <span>CVAT?</span>
                    </Title>
                    <Title level={3} className='cvat-github-star-modal-subtitle'>
                        Help others find it too. <StarFilled />
                    </Title>
                    <Paragraph className='cvat-github-star-modal-text'>
                        Your GitHub star helps more people discover CVAT.
                    </Paragraph>
                    <div className='cvat-github-star-modal-actions'>
                        <Button
                            type='primary'
                            size='large'
                            icon={<StarFilled />}
                            className='cvat-github-star-modal-support-button cvat-github-star-prompt-open-button'
                            onClick={() => {
                                onSupport();
                                onClose();
                            }}
                        >
                            Star CVAT on GitHub
                        </Button>
                        <Button
                            type='link'
                            className='cvat-github-star-prompt-not-now-button'
                            onClick={onClose}
                        >
                            Maybe later
                        </Button>
                    </div>
                    <div className='cvat-github-star-modal-arrow' aria-hidden='true'>
                        <SVGGitHubStarPromptArrow />
                    </div>
                </section>
                <section className='cvat-github-star-modal-scene' aria-hidden='true'>
                    <img src='/assets/github-star-prompt-annotation-scene.webp' alt='' />
                </section>
            </div>
        </Modal>
    );
}

export default React.memo(GitHubStarModal);

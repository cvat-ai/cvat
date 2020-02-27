// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';

import {
    Button,
    Icon,
    Popover,
} from 'antd';

import {
    FacebookShareButton,
    LinkedinShareButton,
    TwitterShareButton,
    TelegramShareButton,
    WhatsappShareButton,
    VKShareButton,
    RedditShareButton,
    ViberShareButton,
    FacebookIcon,
    TwitterIcon,
    TelegramIcon,
    WhatsappIcon,
    VKIcon,
    RedditIcon,
    ViberIcon,
    LinkedinIcon,
} from 'react-share';

import Text from 'antd/lib/typography/Text';

function renderContent(): JSX.Element {
    const githubURL = 'https://github.com/opencv/cvat';
    const githubImage = 'https://raw.githubusercontent.com/opencv/'
        + 'cvat/develop/cvat/apps/documentation/static/documentation/images/cvat.jpg';
    const questionsURL = 'https://gitter.im/opencv-cvat/public';
    const feedbackURL = 'https://gitter.im/opencv-cvat/public';

    return (
        <>
            <Icon type='star' />
            <Text style={{ marginLeft: '10px' }}>
                Star us on
                <a target='_blank' rel='noopener noreferrer' href={githubURL}> GitHub</a>
            </Text>
            <br />
            <Icon type='like' />
            <Text style={{ marginLeft: '10px' }}>
                Leave a
                <a target='_blank' rel='noopener noreferrer' href={feedbackURL}> feedback</a>
            </Text>
            <hr />
            <div style={{ display: 'flex' }}>
                <FacebookShareButton url={githubURL} quote='Computer Vision Annotation Tool'>
                    <FacebookIcon size={32} round />
                </FacebookShareButton>
                <VKShareButton url={githubURL} title='Computer Vision Annotation Tool' image={githubImage} description='CVAT'>
                    <VKIcon size={32} round />
                </VKShareButton>
                <TwitterShareButton url={githubURL} title='Computer Vision Annotation Tool' hashtags={['CVAT']}>
                    <TwitterIcon size={32} round />
                </TwitterShareButton>
                <RedditShareButton url={githubURL} title='Computer Vision Annotation Tool'>
                    <RedditIcon size={32} round />
                </RedditShareButton>
                <LinkedinShareButton url={githubURL}>
                    <LinkedinIcon size={32} round />
                </LinkedinShareButton>
                <TelegramShareButton url={githubURL} title='Computer Vision Annotation Tool'>
                    <TelegramIcon size={32} round />
                </TelegramShareButton>
                <WhatsappShareButton url={githubURL} title='Computer Vision Annotation Tool'>
                    <WhatsappIcon size={32} round />
                </WhatsappShareButton>
                <ViberShareButton url={githubURL} title='Computer Vision Annotation Tool'>
                    <ViberIcon size={32} round />
                </ViberShareButton>
            </div>
            <hr />
            <Text style={{ marginTop: '50px' }}>
                Do you need help? Contact us on
                <a target='_blank' rel='noopener noreferrer' href={questionsURL}> gitter</a>
            </Text>
        </>
    );
}

export default function Feedback(): JSX.Element {
    const [visible, setVisible] = React.useState(false);

    return (
        <>
            <Popover
                placement='leftTop'
                title={
                    <Text className='cvat-text-color'>Help to make CVAT better</Text>
                }
                content={renderContent()}
                visible={visible}
            >
                <Button
                    style={{ color: '#ff4d4f' }}
                    className='cvat-feedback-button'
                    type='link'
                    onClick={(): void => {
                        setVisible(!visible);
                    }}
                >
                    { visible ? <Icon type='close-circle' theme='filled' />
                        : <Icon type='message' theme='twoTone' /> }
                </Button>
            </Popover>
        </>
    );
}

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
    LineIcon,
} from 'react-share';

import Text from 'antd/lib/typography/Text';

interface State {
    active: boolean;
}

export default class Feedback extends React.PureComponent<{}, State> {
    public constructor(props: {}) {
        super(props);
        this.state = {
            active: false,
        }
    }

    private renderContent() {
        const githubURL = 'https://github.com/opencv/cvat';
        const githubImage = 'https://raw.githubusercontent.com/opencv/'
            + 'cvat/develop/cvat/apps/documentation/static/documentation/images/cvat.jpg';
        const questionsURL = 'https://gitter.im/opencv-cvat/public';
        const feedbackURL = 'https://gitter.im/opencv-cvat/public';

        return (
            <>
                <Icon type='star'/>
                <Text style={{marginLeft: '10px'}}>
                    Star us on <a target='_blank' href={githubURL}>GitHub</a>
                </Text>
                <br/>
                <Icon type='like'/>
                <Text style={{marginLeft: '10px'}}>
                    Left a <a target='_blank' href={feedbackURL}>feedback</a>
                </Text>
                <hr/>
                <div style={{display: 'flex'}}>
                    <FacebookShareButton url={githubURL} quote='Computer Vision Annotation Tool'>
                        <FacebookIcon size={32} round={true} />
                    </FacebookShareButton>
                    <VKShareButton url={githubURL} title='Computer Vision Annotation Tool' image={githubImage} description='CVAT'>
                        <VKIcon size={32} round={true} />
                    </VKShareButton>
                    <TwitterShareButton url={githubURL} title='Computer Vision Annotation Tool' hashtags={['CVAT']}>
                        <TwitterIcon size={32} round={true} />
                    </TwitterShareButton>
                    <RedditShareButton url={githubURL} title='Computer Vision Annotation Tool'>
                        <RedditIcon size={32} round={true} />
                    </RedditShareButton>
                    <LinkedinShareButton url={githubURL}>
                        <LineIcon size={32} round={true} />
                    </LinkedinShareButton>
                    <TelegramShareButton url={githubURL} title='Computer Vision Annotation Tool'>
                        <TelegramIcon size={32} round={true} />
                    </TelegramShareButton>
                    <WhatsappShareButton url={githubURL} title='Computer Vision Annotation Tool'>
                        <WhatsappIcon size={32} round={true} />
                    </WhatsappShareButton>
                    <ViberShareButton url={githubURL} title='Computer Vision Annotation Tool'>
                        <ViberIcon size={32} round={true} />
                    </ViberShareButton>
                </div>
                <hr/>
                <Text style={{marginTop: '50px'}}>
                    Do you need help? Contact us on <a href={questionsURL}>gitter</a>
                </Text>
            </>
        );
    }

    public render() {
        return (
            <>
                <Popover
                    placement='leftTop'
                    title={
                        <Text className='cvat-title'>Help to make CVAT better</Text>
                    }
                    content={this.renderContent()}
                    visible={this.state.active}
                >
                    <Button style={{color: '#ff4d4f'}} className='cvat-feedback-button' type='link' onClick={() => {
                        this.setState({
                            active: !this.state.active,
                        });
                    }}>
                        { this.state.active ? <Icon type='close-circle' theme='filled'/> :
                        <Icon type='message' theme='twoTone'/> }
                    </Button>
                </Popover>
            </>
        );
    }
}
// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';
import Modal from 'antd/lib/modal';

import {
    removeAnnotationsinRange as removeAnnotationsinRangeAction ,
    changeRemoveAnnotationRange as changeRemoveAnnotationRangeAction,
    removeObjectAsync,
    removeObjectsinRangeAsync,
    changeFrameAsync,
} from 'actions/annotation-actions';

import { CombinedState } from 'reducers/interfaces';
import RemoveRangeConfirmComponent from 'components/annotation-page/top-bar/remove-range-confirm';

interface StateToProps {
    objectStates: any[];
    frameNumber: number;
    stopFrame: number;
    jobInstance: any;
    startFrame: number;
    endFrame: number;
}

interface DispatchToProps {
    cancel(): void;
    removeObject(sessionInstance: any, objectState: any): void;
    removeObjectsinRange(sessionInstance: any, startFrame: number, endFrame: number): void;
    changeRemoveAnnotationsRange(startFrame: number, endFrame: number): void;
    changeFrame(toFrame: number): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            annotations: { states: objectStates },
            removeinrange: {
                sessionInstance: jobInstance,
                startFrame: startFrame,
                endFrame: endFrame,
            },
            job: {
                instance: { stopFrame },
            },
            player: {
                frame: { number: frameNumber },
            },
        },
    } = state;

    return {
        objectStates,
        frameNumber,
        stopFrame,
        jobInstance,
        startFrame,
        endFrame
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        removeObjectsinRange(sessionInstance: any, startFrame: number, endFrame: number): void {
            dispatch((removeObjectsinRangeAsync(sessionInstance, startFrame, endFrame, true)));
        },
        removeObject(sessionInstance: any, objectState: any): void {
            dispatch((removeObjectAsync(sessionInstance, objectState, true)));
        },
        changeRemoveAnnotationsRange(startFrame: number, endFrame: number): void {
            console.log("Cont Function Ivoked: changeRange: " +startFrame+" "+endFrame);
            dispatch(changeRemoveAnnotationRangeAction(startFrame,endFrame));
        },
        async changeFrame(toFrame: number){
            return dispatch(await changeFrameAsync(toFrame));
        },
        cancel(): void {
            dispatch(removeAnnotationsinRangeAction(null));
        },
    };
}

type Props = StateToProps & DispatchToProps;
class RemoveAnnotationsRangeContainer extends React.PureComponent<Props> {
    private removeObject = (): void => {
        console.log("Reached removeRange()");
        const {
            removeObject, removeObjectsinRange,objectStates,jobInstance, cancel, startFrame, endFrame
        } = this.props;
        console.log("startFrame:" +  startFrame + " endFrame:" + endFrame);
        removeObjectsinRange(jobInstance, startFrame, endFrame);
        cancel();
        // for(let frame=startFrame; frame<endFrame+1; frame++){
        //     changeFrame(frame).then(()=>{
        //         objectStates.forEach((objectState: any) => {
        //             if(objectState.lock){
        //                 Modal.confirm({
        //                     className: 'cvat-modal-confirm',
        //                     title: 'Object '+ objectState.label.id + objectState.clientID + ' is locked',
        //                     content: 'Are you sure you want to remove it?',
        //                     onOk() {
        //                         removeObject(jobInstance,objectState);
        //                     },
        //                 });
        //             }else{
        //                 removeObject(jobInstance,objectState);
        //             }
        //         });
        //     });
        // }
    };


    private changeRemoveAnnotationsRange = (startFrame: number, endFrame: number): void => {
        console.log("Cont Function Ivoked: changeRange: " +startFrame+" "+endFrame);
        const { changeRemoveAnnotationsRange } = this.props;
        changeRemoveAnnotationsRange(startFrame,endFrame);
    };


    public render(): JSX.Element {
        const {
            startFrame,frameNumber, endFrame, stopFrame, cancel, jobInstance,
        } = this.props;


        return (
            <RemoveRangeConfirmComponent
                visible={jobInstance !== null}
                startFrame={startFrame}
                endFrame={endFrame}
                frameNumber={frameNumber}
                stopFrame={stopFrame}
                removeObject={this.removeObject}
                changeRemoveAnnotationsRange={this.changeRemoveAnnotationsRange}
                cancel={cancel}
            />
        );
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(RemoveAnnotationsRangeContainer);

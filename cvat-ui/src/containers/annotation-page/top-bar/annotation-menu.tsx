// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { connect } from 'react-redux';

import { CombinedState } from 'reducers';
import AnnotationMenuComponent from 'components/annotation-page/top-bar/annotation-menu';
import { updateJobAsync } from 'actions/jobs-actions';
import {
    saveAnnotationsAsync,
    setForceExitAnnotationFlag as setForceExitAnnotationFlagAction,
    removeAnnotationsAsync as removeAnnotationsAsyncAction,
} from 'actions/annotation-actions';
import { exportActions } from 'actions/export-actions';
import { importActions } from 'actions/import-actions';
import { Job } from 'cvat-core-wrapper';

interface StateToProps {
    jobInstance: Job;
}

interface DispatchToProps {
    showExportModal: (jobInstance: Job) => void;
    showImportModal: (jobInstance: Job) => void;
    removeAnnotations(startnumber: number, endnumber: number, delTrackKeyframesOnly: boolean): void;
    setForceExitAnnotationFlag(forceExit: boolean): void;
    saveAnnotations(afterSave?: () => void): void;
    updateJob(jobInstance: Job): Promise<boolean>;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            job: {
                instance: jobInstance,
            },
        },
    } = state;

    return { jobInstance: jobInstance as Job };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        showExportModal(jobInstance: Job): void {
            dispatch(exportActions.openExportDatasetModal(jobInstance));
        },
        showImportModal(jobInstance: Job): void {
            dispatch(importActions.openImportDatasetModal(jobInstance));
        },
        removeAnnotations(startnumber: number, endnumber: number, delTrackKeyframesOnly:boolean) {
            dispatch(removeAnnotationsAsyncAction(startnumber, endnumber, delTrackKeyframesOnly));
        },
        setForceExitAnnotationFlag(forceExit: boolean): void {
            dispatch(setForceExitAnnotationFlagAction(forceExit));
        },
        saveAnnotations(afterSave?: () => void): void {
            dispatch(saveAnnotationsAsync(afterSave));
        },
        updateJob(jobInstance: Job): Promise<boolean> {
            return dispatch(updateJobAsync(jobInstance));
        },
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(AnnotationMenuComponent);

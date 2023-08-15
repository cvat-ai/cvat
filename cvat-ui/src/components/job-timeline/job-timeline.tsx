import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CombinedState } from '../../reducers';
import { changeFrameAsync } from '../../actions/annotation-actions';

function extractFramesForLabel(labelName, allObjects) {
    const framesToMark = new Set();
    for (let i = 0; i < allObjects.length; i++) {
        if (allObjects[i].label.name === labelName && !allObjects[i].outside) {
            framesToMark.add(allObjects[i].frame);
        }
    }
    return framesToMark;
}
function getTextColor(hexColor) {
    // Convert hexadecimal color code to RGB values
    const red = parseInt(hexColor.slice(1, 3), 16);
    const green = parseInt(hexColor.slice(3, 5), 16);
    const blue = parseInt(hexColor.slice(5, 7), 16);

    // Calculate luminance using the formula
    const luminance = (red * 0.299) + (green * 0.587) + (blue * 0.114);

    // Compare luminance with threshold and return text color
    return luminance > 186 ? '#000000' : '#ffffff';
}

function coloredCell(index, colorr, actualData, key, currentFrame) {
    if (index === currentFrame) {
        if (actualData.has(index)) {
            return (
                <div
                    key={key}
                    style={{
                        height: '4px', backgroundColor: colorr, border: '1px dashed red',
                    }}
                />
            );
        } return <div key={key} style={{ height: '4px', backgroundColor: 'white', border: '1px dashed red' }} />;
    }
    if (actualData.has(index)) {
        return (
            <div
                key={key}
                style={{
                    height: '4px', backgroundColor: colorr,
                }}
            />
        );
    } return <div key={key} style={{ height: '4px', backgroundColor: 'white' }} />;
}

function DrawALineForLabel(props): JSX.Element {
    // eslint-disable-next-line react/prop-types
    const {
        label, color, allObjectesForJob, job, currentFrame,
    } = props;
    const framesForLabel = extractFramesForLabel(label, allObjectesForJob);
    const startIndex = job.startFrame;
    const endIndex = job.stopFrame;
    const rowIndexes = [];
    for (let i = startIndex; i <= endIndex; i++) {
        rowIndexes.push(i);
    }
    return (
        <>
            {
                rowIndexes.map((number, index) => (
                    coloredCell(number, color, framesForLabel, index, currentFrame)
                ))
            }
        </>
    );
}

function LabelComponent({
    labelName, color, setEnabledLabels,
}) {
    function switchLabelVisibility() {
        setEnabledLabels((prevEnabledLabels) => ({
            ...prevEnabledLabels,
            [labelName]: !prevEnabledLabels[labelName],
        }));
        setLabelEnabled(!labelEnabled);
    }
    const [labelEnabled, setLabelEnabled] = useState(true);
    if (labelEnabled) {
        return (
            <div
                style={{
                    cursor: 'pointer', backgroundColor: color, padding: '2px 8px', margin: '2px', marginLeft: '16px',
                }}
                onClick={switchLabelVisibility}
            >
                <span style={{ color: getTextColor(color) }}>{labelName}</span>
            </div>
        );
    }
    return (
        <div
            style={{
                cursor: 'pointer', backgroundColor: '#dddddd', padding: '2px 8px', margin: '2px', marginLeft: '16px',
            }}
            onClick={switchLabelVisibility}
        >
            <span style={{ color: 'black' }}>{labelName}</span>
        </div>
    );
}

function FramelineComponent({
    job,
}: { job: any | null }): JSX.Element {
    const dispatch = useDispatch();
    const labelsNamesColors = {};
    const { currentFrame, allAnnotationsForJob } = useSelector((state: CombinedState) => ({
        currentFrame: state.annotation.player.frame.number,
        allAnnotationsForJob: state.annotation.annotations.allObjectsForJob,
    }));
    const enabledL = {};
    job.labels.forEach((label) => {
        labelsNamesColors[label.name] = label.color;
        enabledL[label.name] = true;
    });

    const [enabledLabels, setEnabledLabels] = useState(enabledL);
    const step = 1;
    // eslint-disable-next-line max-len
    const frames = Array.from({ length: (job.stopFrame - job.startFrame) / step + 1 }, (_, i) => job.startFrame + i * step);
    return (
        <>
            <div style={{
                display: 'flex',
                maxWidth: window.innerWidth,
                justifyContent: 'center',
                alignItems: 'center',
                alignContent: 'center',
            }}
            >
                {Object.keys(labelsNamesColors).map((label, index) => (
                    <LabelComponent
                        key={index}
                        labelName={label}
                        color={labelsNamesColors[label]}
                        setEnabledLabels={setEnabledLabels}
                    />
                ))}
            </div>
            <div style={{
                overflow: 'auto',
                maxWidth: window.innerWidth,
                display: 'grid',
                rowGap: '3px',
                columnGap: '4px',
                gridTemplateColumns: `repeat(${frames.length}, 1fr)`,
            }}
            >
                {frames.map((number, index) => {
                    if (currentFrame === number) {
                        return (
                            <a
                                style={{ border: '2px dashed red' }}
                                key={index}
                                onClick={() => {
                                    dispatch(changeFrameAsync(number));
                                }}
                            >
                                {number}
                            </a>
                        );
                    } return (
                        <a
                            key={index}
                            onClick={() => {
                                dispatch(changeFrameAsync(number));
                            }}
                        >
                            {number}
                        </a>
                    );
                })}
                {Object.keys(labelsNamesColors).map((label, index) => {
                    if (enabledLabels[label]) {
                        return (
                            <DrawALineForLabel
                                currentFrame={currentFrame}
                                allObjectesForJob={allAnnotationsForJob}
                                label={label}
                                key={index}
                                job={job}
                                color={labelsNamesColors[label]}
                            />
                        );
                    }
                })}

            </div>
        </>
    );
}

export default FramelineComponent;

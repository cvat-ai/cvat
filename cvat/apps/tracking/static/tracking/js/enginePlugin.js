/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* global showMessage userConfirm */

/*
 * Copyright (C) 2019
 *
 * SPDX-License-Identifier: MIT
 */

/* exported ShapeTracker ShapeTrackerController ShapeTrackerView buildShapeTracker */

/* global
   Mousetrap: false
   Listener: false
   showOverlay: false
   Logger: false
*/


document.addEventListener('DOMContentLoaded', () => {
    const TrackerTypes = {
        BOOSTING: 'BOOSTING',
        MIL: 'MIL',
        KCF: 'KCF',
        CSRT: 'CSRT',
        MEDIANFLOW: 'MEDIANFLOW',
        TLD: 'TLD',
        MOSSE: 'MOSSE',
        GOTRUN: 'GOTRUN',
    };
    
    const EndFrameModes = {
        nextKeyframe: 'nextKeyframe',
        nextUserKeyframe: 'nextUserKeyframe',
        nextUserKeyframeMax: 'nextUserKeyframeMax',
        end: 'end',
    };
    
    
    //TODO: Why does the class Listener is not called Observable or Listenable?
    /** Class to track shapes
     *
     * This tracks a object that is marked with a bounding box in consecutive
     * images by adding new keyframes.
     * . */
    class ShapeTrackerModel extends Listener {
        constructor(shapeCollection) {
            super('onShapeTrackerModelUpdate', () => this._state);
            this._shapeCollection = shapeCollection;
            this.trackerOptions = {
                trackerType: TrackerTypes.BOOSTING,
            };
            this._endFrameMode = EndFrameModes.nextUserKeyframe;
            this.maxNrOfFrames = 20;
            this._state = {
                jobRunning: false,
            };
        }

        // Setter and getters    
        set trackerType(value) {
            if (value in TrackerTypes) {
                this.trackerOptions.trackerType = value;
            } else {
                console.error('Wrong tracker type:'+value);
            }
        }
    
        get trackerType() {
            return this.trackerOptions.trackerType;
        }
    
        set endFrameMode(value) {
            if (value in EndFrameModes) {
                this._endFrameMode = value;
            } else {
                console.error('Wrong end frame mode:'+value);
            }
        }
    
        get endFrameMode() {
            return this._endFrameMode;
        }

        // Actions
        /* Run the tracker on the currently selected shape. 
        *  This insert new shapes from tracker. 
        */
        async trackCurrentSelectedShape() {
            // TODO: Allow to track multiple shapes in parallel
            this._state.jobRunning = true;
            this.notify('startTracking');
    
            const { activeShape } = this._shapeCollection;
            if (activeShape) {
                await this._trackShape(activeShape);
            }
    
            this._state.jobRunning = false;
            this.notify('stopTracking');
        }

        /* Run the tracker on the specified shape. 
        *  This insert new shapes from tracker into the shapeCollection.
        */
        async _trackShape(shape) {
            // Can only track box shapes in interpolation mode
            if (shape.type.startsWith('annotation')) {
                showMessage('Can only track interpolation shapes.\n'+
                            'Make sure the you choose Interpolation instead of'+
                            'Annotation in the bottom right.');
                return;
            }
            if (!shape.type.endsWith('box')) {
                showMessage('Can only track box shapes.\n'+
                            'Make sure the you choose Box in the bottom right.');
                return;
            }

            // Save shapes from all frames for undu/redo
            const oldPositions = JSON.parse(JSON.stringify(shape._positions));

            // Determine first and last frame the tracker should be applied to
            const { startFrame, stopFrame } = this._getStartStopFrame(shape);

            // Send request to server and insert new shapes
            try {
                let track = await this._makeRequest(shape, startFrame, stopFrame);
                this._insertTrackedShapes(shape, track);
            } catch (error) {
                // _makeRequest has been rejected
                console.error(error);
                showMessage(error);
                return;
            }
     
            // Undo/redo code for complete tracking action
            window.cvat.addAction('Track object', () => {
                shape._positions = oldPositions;
            }, () => {
                result.forEach(track => this._insertTrackedShapes(shape, track));
            }, startFrame);
            // End of undo/redo code
        }
    
        /* Return the frist and last frame (number) this tracker should be
        * applied to as an array of the form.
        * {startFrame:<number>, stopFrame:<number>}
        * 
        *  startFrame: start tracking at this frame (included)
        *  stopFrame: track until this frame (exluded)
        * This is determined by the settings (frame mode etc.).
        */
        _getStartStopFrame(shape) {
            const startFrame = window.cvat.player.frames.current;
            if (this._endFrameMode === EndFrameModes.nextKeyframe) {
                // Track until the next keyframe (or the end if there is none)
                const nextKeyFrame = shape.nextKeyFrame();
                const stopFrame = nextKeyFrame != null ? nextKeyFrame
                    : window.cvat.player.frames.stop+1;
                return { startFrame, stopFrame };
            }
            if (this._endFrameMode === EndFrameModes.nextUserKeyframe) {
                // Option: Track until keyframe by human
                // nextHumanFrame == null if there is no such frame
                const nextHumanFrame = shape.nextKeyFrame(frame => !frame.byMachine);
                const stopFrame = Math.min(nextHumanFrame != null ? nextHumanFrame
                    : window.cvat.player.frames.stop+1, window.cvat.player.frames.stop + 1);
                return { startFrame, stopFrame };
            }
            if (this._endFrameMode === EndFrameModes.nextUserKeyframeMax) {
                // Track at most 10 frames and until keyframe by human
                // nextHumanFrame == null if there is no such frame
                const nextHumanFrame = shape.nextKeyFrame(frame => !frame.byMachine);
                const stopFrame = Math.min(window.cvat.player.frames.current + 10,
                    nextHumanFrame != null ? nextHumanFrame
                        : window.cvat.player.frames.stop + 1,
                    window.cvat.player.frames.stop + 1);
                return { startFrame, stopFrame };
            }
    
            return { startFrame, stopFrame: window.cvat.player.frames.stop+1 };
        }
    
        async _makeRequest(shape, startFrame, stopFrame) {
            const exportedCollection = this._shapeCollection.export();
            const serverReprAndclientReprPairs = exportedCollection[1];
            const track = serverReprAndclientReprPairs
                .filter(serverAndClient => serverAndClient[1] === shape)[0][0];
    
            if (!track) {
                // Should never happen.
                return new Error('Tracker: Could not transform to server model!');
            }
    
            const trackingJob = {
                trackId: track.id,
                track,
                startFrame,
                stopFrame,
                trackerOptions: this.trackerOptions,
            };
    
            const data = {
                jobId:window.cvat.job.id,
                trackingJob: trackingJob,
            };
    
            return new Promise((resolve, reject) => {
                $.ajax({
                    url: '/tracking/track',
                    type: 'POST',
                    data: JSON.stringify(data),
                    contentType: 'application/json',
                }).done((newShapes) => {
                    resolve(newShapes);
                }).fail((errorData) => {
                    const message = `Could not track shape. Code: ${errorData.status}. `
                        + `Message: ${errorData.responseText || errorData.statusText}`;
                    reject(new Error(message));
                });
            });
        }
    
        _insertTrackedShapes(shape, trackingJobResult) {
            trackingJobResult.shapes.forEach((serverShape) => {
                // eslint-disable-next-line no-underscore-dangle
                const position = window.cvat.translate._boxTranslator
                    .serverToClient(serverShape);
                position.byMachine = true;
                position.outside = serverShape.outside;
                position.occluded = serverShape.occluded;
                position.z_order =  serverShape.z_order;
                // Insert/update postion silenty, i.e. wihtout adding to undo 
                // stack. Complete tracking action is added to undo 
                shape.updatePosition(serverShape.frame, position, true);
            });
        }

        _logStatus() {
            console.log(
                'ShapeTrackerModel:',
                this.trackerOptions,
                this._endFrameMode,
                this.maxNrOfFrames,
                this._state,
            );
        }
    }
    
    class ShapeTrackerController {
        constructor(shapeTrackerModel) {
            this._shapeTrackerModel = shapeTrackerModel;
        }
    
        trackCurrentSelectedShape() {
            this._shapeTrackerModel.trackCurrentSelectedShape();
        }
    
        setTrackerType(type) {
            this._shapeTrackerModel.trackerType = type;
        }
    
        setEndFrame(mode) {
            this._shapeTrackerModel.endFrameMode = mode;
        }
    
        setMaxNrOfFrames(frames) {
            this._shapeTrackerModel.maxNrOfFrames = frames;
        }
    }
    
    class ShapeTrackerView {
        constructor(shapeTrackerModel, shapeTrackerController) {
            this._shapeTrackerModel = shapeTrackerModel;
            this._shapeTrackerController = shapeTrackerController;
            this._shapeTrackerModel.subscribe(this);
            this._overlay = null;
            this._setupSettingGUI();
            this._setupContextMenuGUI();
            this._setupKeybindings();
        }

        /* Setup key bindings.*/
        _setupKeybindings(){
            // TODO: Should the userConfig.js file be modified instead?
            // Insert entry for new short cut
            window.cvat.config._shortkeys.track = {
                value: ['t'],
                view_value: 'T',
                description: 'Track',
            };

            // Connect shortcuts for actions
            const trackHandler = Logger.shortkeyLogDecorator(() => {
                this._shapeTrackerController.trackCurrentSelectedShape();
            }).bind(this);
    
            Mousetrap.bind(
                window.cvat.config._shortkeys.track.value,
                trackHandler.bind(this),
                'keydown',
            );
        }

        /* Create and connect DOM elemtents in settings page. */
        _setupSettingGUI(){
            // Create DOM elements in settings menu
            // TODO: Should the annotation.html be modified instead?
            // TODO: How does this work with React?
            let otherSettings = $('#otherSettigns');
            otherSettings.css('height','60%');
            $(` <div id="shapeTrackerSetings" style="width: 48%; height: 30%; float: left;">
                <center> <label class="semiBold h1"> Tracker Settings </label> </center>
                <table style="border-collapse: separate; border-spacing: 10px; overflow-y: auto;" class="regular">
                    <tr>
                        <td> <label> Tracker Type </label> </td>
                        <td>
                            <select id="shapeTrackerTypeSelect" class="regular h3">
                                <option value="BOOSTING"> OpenCV Boosting</option>
                                <option value="MIL"> OpenCV MIL </option>
                                <option value="KCF"> OpenCV KCF  </option>
                                <option value="CSRT"> OpenCV CSRT </option>
                                <option value="MEDIANFLOW"> OpenCV MedianFlow </option>
                                <option value="TLD" selected> OpenCV TLD </option>
                                <option value="MOSSE"> OpenCV MOSSE </option>
                                <option value="GOTRUN"> OpenCV GOTRUN </option>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <td> <label> Track until </label> </td>
                            <td>
                                <select id="shapeTrackerEndSelect" class="regular h3">
                                    <option value="nextKeyframe"> Next keyframe </option>
                                    <option value="nextUserKeyframe"> Next manual keyframe </option>
                                    <option value="nextUserKeyframeMax2"> Next manual keyframe (at most 2)</optiona>
                                    <option value="nextUserKeyframeMax5"> Next manual keyframe (at most 5)</optiona>
                                    <option value="nextUserKeyframeMax10"> Next manual keyframe (at most 10)</optiona>
                                    <option value="nextUserKeyframeMax15"> Next manual keyframe (at most 15)</optiona>
                                    <option value="nextUserKeyframeMax20"> Next manual keyframe (at most 20)</optiona>
                                    <option value="nextUserKeyframeMax30"> Next manual keyframe (at most 30)</optiona>
                                    <option value="nextUserKeyframeMax50"> Next manual keyframe (at most 50)</optiona>
                                    <option value="end"> End </option>
                                </select>
                            </td>
                    </tr>
                </table>
                </div>
            `).insertAfter(otherSettings);

            // Connect to setting UI
            // Bind Tracker type selection
            this._shapeTrackerTypeSelect = $('#shapeTrackerTypeSelect');
            this._shapeTrackerTypeSelect.on('change',
                e => this._shapeTrackerController.setTrackerType(e.target.value));
    
            // Bind Selection of tracker mode for next frame
            this._shapeTrackerEndSelect = $('#shapeTrackerEndSelect');
            this._shapeTrackerEndSelect.on('change', (e) => {
                const { target: { value } } = e;
                if (value.startsWith(EndFrameModes.nextUserKeyframeMax)) {
                    const maxNrOfFrames = parseInt(
                        value.replace(EndFrameModes.nextUserKeyframeMax, ''), 10,
                    );
    
                    this._shapeTrackerController.setMaxNrOfFrames(maxNrOfFrames);
                    this._shapeTrackerController.setEndFrame(
                        EndFrameModes.nextUserKeyframeMax,
                    );
                } else {
                    this._shapeTrackerController.setEndFrame(value);
                }
            });

            this._updateSetting();
       }

        /* Create and connect DOM elemtents in context menu. */
        _setupContextMenuGUI(){
            // Create DOM elements
            let shapeContextMenu = $('#shapeContextMenu');
            $(`<li action="trackShape">Track</li>`).appendTo(shapeContextMenu);

            // Connect menue entry in context menu
            $('#shapeContextMenu li').click((e) => {
                switch ($(e.target).attr('action')) {
                case 'trackShape':
                    this._shapeTrackerController.trackCurrentSelectedShape();
                    break;
                default:
                    break;
                }
            });
       }
    
        /* Update setting gui according to model. */
        _updateSetting() {
            this._shapeTrackerTypeSelect.val(this._shapeTrackerModel.trackerType);
            let trackerEndSelectVal = this._shapeTrackerModel.endFrameMode
                === EndFrameModes.nextUserKeyframeMax
                ? EndFrameModes.nextUserKeyframeMax + this._shapeTrackerModel.maxNrOfFrames
                : this._shapeTrackerModel.endFrameMode;
            this._shapeTrackerEndSelect.val(trackerEndSelectVal);
        }
    
        /* Called whenever the shapeTrackerModel changes. */
        onShapeTrackerModelUpdate(state) {
            if (state.jobRunning) {
                this._overlay = showOverlay('Wait for tracking result ...');
            } else if (this._overlay) {
                this._overlay.remove();
                this._overlay = null;
            }
        }
    }
    
    function buildShapeTracker(shapeCollectionModel) {
        let trackerModel =  new ShapeTrackerModel(shapeCollectionModel);
        let trackerContoller = new ShapeTrackerController(trackerModel);
        let trackerView = new ShapeTrackerView(trackerModel, trackerContoller);

        // TODO: remove (only attached to window for easy debugging)
        window.trackerModel = trackerModel;
        window.trackerController = trackerContoller;
        window.trackerView = trackerView;
    }

    // Patch the shape collection constructor to get a reference
    // to the shape collection
    // TODO: Should tracker be integrated into engine instead of a enginePlugin?
    function ShapeCollectionModelWrapper(OriginalClass) {
        // Constructor will patch some properties for each instance
        function constructorDecorator(...args) {
            const shapeCollectionModel = new OriginalClass(...args);
            buildShapeTracker(shapeCollectionModel);
            return shapeCollectionModel;
        }
    
        constructorDecorator.prototype = OriginalClass.prototype;
        constructorDecorator.prototype.constructor = constructorDecorator;
        return constructorDecorator;
    }

    // Apply patch for classes
    ShapeCollectionModel = ShapeCollectionModelWrapper(ShapeCollectionModel);
});





// SPDX-License-Identifier: MIT

// Exercises the actual CVAT ObjectState, SkeletonTrack and Undo implementation without a browser.
import assert from 'node:assert/strict';
import { Label } from '../../cvat-core/src/labels';
import ObjectState from '../../cvat-core/src/object-state';
import History from '../../cvat-core/src/annotations-history';
import { trackFactory } from '../../cvat-core/src/annotations-objects';
import { DimensionType, JobType } from '../../cvat-core/src/enums';
import copyPose from '../../cvat-ui/src/utils/copy-skeleton-pose';

// SVG rendering is unrelated to pose coordinates; use an empty SVG for the test schema.
Label.parseUntrustedSvg = () => ({ innerHTML: '' } as SVGSVGElement);
const label = new Label({
    id: 1, name: 'Pose', type: 'skeleton', attributes: [],
    sublabels: Array.from({ length: 5 }, (_, i) => ({
        id: i + 2, name: `point${i}`, type: 'points', attributes: [{
            id: i + 100, name: 'visibility', mutable: true, input_type: 'select',
            default_value: 'UNSET', values: ['UNSET', 'VISIBLE', 'OCCLUDED', 'AMBIGUOUS'],
        }],
    })),
} as any);

function fixture() {
    const history = new History();
    let nextID = 2;
    const labels = Object.fromEntries([label, ...label.structure.sublabels].map((l) => [l.id, l]));
    const shape = (frame, i?) => ({
        id: frame * 100 + (i ?? 99), frame, type: i === undefined ? 'skeleton' : 'points',
        points: i === undefined ? [] : [100 + i + frame, 200 + i + frame],
        attributes: i === undefined ? [] : [{ spec_id: i + 100, value: frame === 46 ? 'OCCLUDED' : 'VISIBLE' }],
        occluded: frame === 46, outside: frame === 46 && i === 4, rotation: 0, z_order: 0,
    });
    const track = trackFactory({
        id: 1000, frame: 44, label_id: 1, group: 0, source: 'auto', attributes: [],
        shapes: [44, 45, 46, 47].map((f) => shape(f)),
        elements: label.structure.sublabels.map((l, i) => ({
            id: i + 1001, frame: 44, label_id: l.id, attributes: [],
            shapes: [44, 45, 46, 47].map((f) => shape(f, i)),
        })),
    } as any, 1, {
        history, labels, groupsInfo: { max: 0, colors: {} }, dimension: DimensionType.DIMENSION_2D,
        jobType: JobType.ANNOTATION, nextClientID: () => nextID++, getMasksOnFrame: () => [],
        framesInfo: Object.assign(Object.fromEntries([44, 45, 46, 47].map((f) => [f, { width: 1920, height: 1080 }])), {
            isFrameDeleted: () => false,
        }),
    });
    return { history, track, state: (frame) => new ObjectState(track.get(frame)) };
}

async function main() {
    const { history, track, state } = fixture();
    // Simulate a user editing frame 45, without saving anything to the server.
    const edited = state(45);
    edited.elements.forEach((el, i) => { el.points = [400 + i, 500 + i]; });
    await edited.save();
    const before = JSON.stringify(track.toJSON());
    const historySize = history.get().undo.length;
    const targetBefore = state(46);
    const previous = state(45);
    const target = state(46);
    assert.equal(copyPose(previous, target), true);
    await target.save();
    assert.equal(history.get().undo.length, historySize + 1, 'one Undo for all 5 points');
    assert.deepEqual(state(46).elements.map((e) => e.points), previous.elements.map((e) => e.points));
    assert.deepEqual(state(46).elements.map((e) => [e.attributes, e.occluded, e.outside, e.serverID]),
        targetBefore.elements.map((e) => [e.attributes, e.occluded, e.outside, e.serverID]));
    assert.deepEqual(state(45).elements.map((e) => e.points), previous.elements.map((e) => e.points));
    const after = JSON.stringify(track.toJSON());
    await history.undo(1);
    assert.equal(JSON.stringify(track.toJSON()), before, 'Undo restores exact serialized track, including other frames');
    await history.redo(1);
    // CVAT updates the parent source to semi-auto on Redo; compare all annotation data separately.
    const withoutSource = (data) => JSON.parse(JSON.stringify(data, (key, value) => (key === 'source' ? undefined : value)));
    assert.deepEqual(withoutSource(track.toJSON()), withoutSource(JSON.parse(after)), 'Redo restores copied annotation data');
    assert.equal(copyPose(state(45), state(46)), false, 'identical pose is a no-op');

    const blocked = fixture();
    const locked = blocked.state(46);
    locked.elements[2].lock = true;
    assert.throws(() => copyPose(blocked.state(45), locked), /Unlock/);
    const invalid = blocked.state(45);
    invalid.elements[4].points = [NaN, 0];
    const untouched = blocked.state(46);
    const untouchedPoints = untouched.elements.map((e) => e.points);
    assert.throws(() => copyPose(invalid, untouched), /invalid/);
    assert.deepEqual(untouched.elements.map((e) => e.points), untouchedPoints, 'validation is atomic');
    assert.throws(() => copyPose(blocked.state(44), blocked.state(46)), /consecutive/);
    const otherTrack = Object.create(previous, { clientID: { value: 999 } }) as ObjectState;
    assert.throws(() => copyPose(otherTrack, state(46)), /same skeleton/);
    const reversed = Object.create(blocked.state(45), {
        elements: { value: blocked.state(45).elements.reverse() },
    }) as ObjectState;
    const matching = blocked.state(46);
    copyPose(reversed, matching);
    assert.deepEqual(matching.elements.map((e) => e.points), blocked.state(45).elements.map((e) => e.points));
    console.log('PASS: unsaved frame 45 edits, 5-point copy, single Undo/Redo, target visibility/IDs, neighboring frames, no-op, locks, invalid pose, track/frame guards, label matching.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });

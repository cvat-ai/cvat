/* AutoLabel controls for CVAT. The browser sends its CVAT session; no service PAT enters this script. */
(() => {
    'use strict';

    const backend = '/autolabel/api/v1/video/jobs';
    const active = new Set(['queued', 'extracting', 'propagating']);
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
    let panel = null;
    let cvatTaskId = null;
    let cvatJobId = null;
    let job = null;
    let queue = null;
    let busy = false;
    let error = '';
    let manifest = null;
    let sourceFps = null;
    let sam3Capabilities = { vlm_box_rescue: false };
    let vlmBoxRescue = false;
    let boxRescueState = { status: 'disabled', proposals: [] };
    let sequenceClasses = 'car,person';
    let availableClasses = null;
    let classesEdited = false;

    const style = document.createElement('style');
    style.textContent = `
        .autolabel-open { align-self: center; flex-shrink: 0; height: 32px; margin-left: 8px;
            border: 1px solid #1677ff; color: #1677ff; background: white;
            border-radius: 6px; padding: 5px 12px; cursor: pointer; }
        .autolabel-backdrop { position: fixed; inset: 0; z-index: 10000; display: flex;
            justify-content: center; align-items: flex-start; padding-top: 8vh;
            background: rgba(0, 0, 0, .45); }
        .autolabel-panel { width: min(760px, 94vw); max-height: 82vh; overflow: auto;
            padding: 22px 26px; background: white; border-radius: 9px; box-shadow: 0 10px 35px #0003;
            font: 14px/1.5 Arial, sans-serif; color: #222; }
        .autolabel-panel h2 { margin: 0 0 10px; font-size: 21px; }
        .autolabel-panel button { margin: 8px 8px 8px 0; padding: 7px 12px; cursor: pointer;
            border: 1px solid #1677ff; border-radius: 6px; color: white; background: #1677ff; }
        .autolabel-panel button:disabled { opacity: .5; cursor: wait; }
        .autolabel-panel .autolabel-close { float: right; color: #333; border-color: #ccc; background: white; }
        .autolabel-panel .autolabel-error { padding: 9px; color: #9f2222; background: #fff1f0; }
        .autolabel-panel .autolabel-success { padding: 9px; color: #146b38; background: #f0fff2; }
        .autolabel-panel .autolabel-queue { max-height: 240px; overflow: auto; }
        .autolabel-panel .autolabel-queue p { margin: 5px 0; }
        .autolabel-panel .autolabel-suggestion { border: 1px solid #ddd; border-radius: 6px; padding: 10px; margin: 10px 0; }
        .autolabel-panel .autolabel-suggestion img { display: block; max-width: 100%; max-height: 260px; margin: 8px 0; }
        .autolabel-panel progress { width: 100%; height: 12px; }
        .autolabel-panel .autolabel-setting { display: flex; gap: 12px; align-items: center; margin: 10px 0; }
        .autolabel-panel .autolabel-setting select, .autolabel-panel .autolabel-setting input {
            padding: 6px; border: 1px solid #aaa; border-radius: 4px; }
    `;
    document.head.appendChild(style);

    function el(tag, text, className) {
        const node = document.createElement(tag);
        if (text !== undefined) node.textContent = text;
        if (className) node.className = className;
        return node;
    }

    async function api(path, options) {
        const requestOptions = { ...options, credentials: 'include' };
        if (requestOptions.method && requestOptions.method.toUpperCase() !== 'GET') {
            const csrf = document.cookie.split('; ').find((part) => part.startsWith('csrftoken='));
            if (csrf) {
                requestOptions.headers = {
                    ...requestOptions.headers,
                    'X-CSRFToken': decodeURIComponent(csrf.slice('csrftoken='.length)),
                };
            }
        }
        const response = await fetch(`${backend}${path}`, requestOptions);
        if (!response.ok) {
            let detail = `AutoLabel HTTP ${response.status}`;
            try { detail = (await response.json()).detail || detail; } catch (_) { /* use status */ }
            const failure = new Error(String(detail));
            failure.status = response.status;
            throw failure;
        }
        return response.json();
    }

    async function refresh() {
        if (!panel) return;
        try {
            job = await api(`/cvat-jobs/${cvatJobId}`);
            if (job.manifest_sha256 && (!manifest || manifest.job_id !== job.job_id)) {
                manifest = await api(`/${job.job_id}/manifest`);
            }
            if (job.status === 'awaiting_review') {
                queue = await api(`/${job.job_id}/review-queue`);
            }
            boxRescueState = await api(`/${job.job_id}/box-rescue`);
            error = '';
        } catch (failure) {
            if (failure.status === 404) { job = null; queue = null; manifest = null; error = ''; }
            else error = failure.message;
        }
        render();
    }

    async function loadAvailableClasses() {
        try {
            const [names, capabilities] = await Promise.all([
                api(`/cvat-jobs/${cvatJobId}/labels`), api(`/cvat-jobs/${cvatJobId}/capabilities`),
            ]);
            if (!panel) return;
            availableClasses = names;
            sam3Capabilities = capabilities;
            const preferred = ['car', 'person', 'pedestrian', 'truck'];
            const matching = preferred.filter((name) => names.includes(name));
            if (matching.length && !classesEdited) sequenceClasses = matching.join(',');
            render();
        } catch (failure) {
            if (panel) { error = failure.message; render(); }
        }
    }

    function requestedClasses() {
        const classes = sequenceClasses.split(',').map((value) => value.trim()).filter(Boolean);
        if (!classes.length || new Set(classes).size !== classes.length) {
            throw new Error('Enter unique CVAT class names separated by commas.');
        }
        if (availableClasses) {
            const missing = classes.filter((name) => !availableClasses.includes(name));
            if (missing.length) {
                throw new Error(`Unknown CVAT class: ${missing.join(', ')}. Available: ${availableClasses.join(', ')}.`);
            }
        }
        return classes;
    }

    function classSetting(content) {
        const classesRow = el('label', 'CVAT class names', 'autolabel-setting');
        const classesInput = el('input');
        classesInput.value = sequenceClasses;
        classesInput.addEventListener('input', () => {
            sequenceClasses = classesInput.value;
            classesEdited = true;
        });
        classesRow.appendChild(classesInput);
        content.appendChild(classesRow);
        if (availableClasses) content.appendChild(el('p', `Available in this CVAT job: ${availableClasses.join(', ') || '(none)'}. Use the exact names.`));
    }

    async function operate(action) {
        if (busy) return;
        busy = true;
        error = '';
        render();
        try { await action(); await refresh(); }
        catch (failure) { error = failure.message; }
        finally { busy = false; render(); }
    }

    async function saveCvatAnnotations() {
        const save = document.querySelector('.cvat-annotation-header-save-button');
        if (!save) throw new Error('CVAT Save button is unavailable. Save annotations and retry.');
        save.click();
        await new Promise((resolve) => setTimeout(resolve, 600));
        const deadline = Date.now() + 15000;
        while (save.textContent.includes('Saving') && Date.now() < deadline) {
            await new Promise((resolve) => setTimeout(resolve, 150));
        }
        if (save.textContent.includes('Saving')) throw new Error('CVAT is still saving. Retry after it finishes.');
    }

    function button(text, action) {
        const node = el('button', text);
        node.disabled = busy;
        node.addEventListener('click', () => operate(action));
        return node;
    }

    function render() {
        if (!panel) return;
        const content = panel.querySelector('.autolabel-content');
        content.replaceChildren();
        if (error) content.appendChild(el('p', error, 'autolabel-error'));
        content.appendChild(el('p', 'AutoLabel tracks objects through the video and ranks frames for human review.'));
        content.appendChild(el('p', 'SAM3 text prompts process every source frame in private Kaggle batches. Legacy jobs retain their original sampling.'));
        if (!job) {
            content.appendChild(el('p', 'SAM3 observes every source frame. All labels remain preliminary and require review.'));
            const fpsRow = el('label', 'CVAT source FPS', 'autolabel-setting');
            const fpsInput = el('input');
            fpsInput.type = 'number';
            fpsInput.min = '0.001';
            fpsInput.step = '0.001';
            fpsInput.placeholder = 'Enter the actual video FPS';
            fpsInput.value = sourceFps === null ? '' : String(sourceFps);
            fpsInput.addEventListener('change', () => { sourceFps = Number(fpsInput.value); });
            fpsRow.appendChild(fpsInput);
            content.appendChild(fpsRow);
            if (sam3Capabilities.vlm_box_rescue) {
                vlmBoxRescue = true;
                content.appendChild(el('p', 'Claude Sonnet reviews at most 20 frames and offers at most 20 boxes. Occluded-object boxes estimate full extent and require human review. Suggestions stay separate until Accept.'));
            }
            classSetting(content);
            content.appendChild(button(vlmBoxRescue ? 'Run SAM3 + Claude suggestions' : 'Run SAM3 on full video', async () => {
                const classes = requestedClasses();
                if (!Number.isFinite(sourceFps) || sourceFps <= 0) {
                    throw new Error('Enter the actual source FPS.');
                }
                job = await api(`/cvat-jobs/${cvatJobId}/import`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ strategy: 'all_frames', source_fps: sourceFps,
                        auto_start_sequence: true, sequence_classes: classes,
                        vlm_box_rescue: vlmBoxRescue }),
                });
            }));
            return;
        }
        if (manifest && !['uniform', 'all_frames'].includes(manifest.sampling_strategy)) {
            content.appendChild(el('p', 'This job uses the retired frame-0 workflow. Existing annotations remain in CVAT; use the legacy API to recover an unfinished job.'));
            content.appendChild(el('p', `Legacy job status: ${job.status}`));
            return;
        }
        const runningSequence = job.stage === 'sequence_running' && job.status === 'propagating';
        content.appendChild(el('p', runningSequence
            ? `Status: SAM3 running on Kaggle Â· ${job.progress_total} sampled frames Â· waiting for batch results`
            : `Status: ${job.stage} Â· ${job.progress_current}/${job.progress_total} frames`));
        if (['uniform', 'all_frames'].includes(manifest?.sampling_strategy)) {
            content.appendChild(el('p', manifest.sampling_strategy === 'all_frames'
                ? `Original video: ${manifest.source_frame_count} frames at ${manifest.source_fps} FPS. SAM3 processes all ${manifest.frames.length} source frames.`
                : `Legacy sampled job: ${manifest.frames.length}/${manifest.source_frame_count} frames at ${manifest.target_fps} FPS.`));
            content.appendChild(el('p', 'Preliminary labels awaiting human review. Missing observations are not model predictions; legacy sampled jobs use geometric interpolation. Review warnings are not confirmed errors.'));
        } else if (job.status === 'extracting') {
            content.appendChild(el('p', `Preparing input frames: ${job.progress_current}/${job.progress_total}. This is frame preparation, not SAM3 inference.`));
        }
        const progress = el('progress');
        progress.max = job.progress_total || 1;
        if (!runningSequence) progress.value = job.progress_current;
        content.appendChild(progress);
        if (manifest) {
            content.appendChild(el('p', `${manifest.frames.length} selected / ${manifest.source_frame_count || manifest.frames.length} CVAT frames Â· ${manifest.sampling_strategy || 'all frames'}`));
        }
        if (job.error_message) content.appendChild(el('p', job.error_message, 'autolabel-error'));
        if (job.status === 'failed' && /^video_extraction_/.test(job.error_code || '')) {
            content.appendChild(button('Retry frame import', async () => {
                job = await api(`/${job.job_id}/retry-import`, { method: 'POST' });
            }));
        }
        const sequenceJob = ['uniform', 'all_frames'].includes(manifest?.sampling_strategy);
        if (job.status === 'awaiting_seed' && sequenceJob) {
            content.appendChild(el('p', 'Frame extraction finished. Start or resume SAM3 text tracking without a frame-0 seed.'));
            content.appendChild(button('Start SAM3 sequence', async () => {
                job = await api(`/${job.job_id}/sequence`, { method: 'POST' });
            }));
        }
        if (job.status === 'propagating' && sequenceJob) {
            content.appendChild(el('p', 'SAM3 is processing the sampled video on Kaggle. The full CVAT video remains available for playback.'));
        }
        if (job.status === 'failed' && /^sequence_/.test(job.error_code || '')) {
            classSetting(content);
            content.appendChild(button('Retry SAM3 with these classes', async () => {
                job = await api(`/${job.job_id}/sequence/classes`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestedClasses()),
                });
            }));
            content.appendChild(el('p', 'This retry reuses the frames already prepared; it does not upload or extract the video again.'));
        }
        if (job.status === 'awaiting_review' && !job.publish_sha256 &&
            ['sequence_draft_ready', 'sequence_draft_exporting'].includes(job.stage)) {
            content.appendChild(el('p', 'SAM3 finished. The worker is adding pending tracks to CVAT automatically.'));
        } else if (job.status === 'awaiting_review' && !job.publish_sha256) {
            content.appendChild(button('Add AI tracks to this CVAT job', async () => {
                await saveCvatAnnotations();
                await api(`/${job.job_id}/publish`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ expected_annotation_revision: null }),
                });
                location.reload();
            }));
        }
        if (job.publish_sha256) {
            content.appendChild(el('p', `${job.published_track_count} AI track(s) added to CVAT`, 'autolabel-success'));
            content.appendChild(el('p', 'Save any edits you are making in CVAT before reloading to view the new tracks.'));
            content.appendChild(button('Reload CVAT to see AI tracks', async () => { location.reload(); }));
        }
        if (boxRescueState && boxRescueState.status !== 'disabled') {
            content.appendChild(el('h3', 'Claude Sonnet box suggestions'));
            if (boxRescueState.completed_frame_count) {
                content.appendChild(el('p', `Saved results from ${boxRescueState.completed_frame_count} completed frame(s).`));
            }
            content.appendChild(el('p', `Status: ${boxRescueState.status} Â· ${boxRescueState.proposal_count || 0} proposal(s). These are suggestions, not confirmed objects.`));
            if (boxRescueState.truncated_proposal_count) {
                content.appendChild(el('p', `${boxRescueState.truncated_proposal_count} additional suggestions were saved in frame artifacts but omitted from the 20-proposal review limit.`));
            }
            if (boxRescueState.error) content.appendChild(el('p', boxRescueState.error, 'autolabel-error'));
            if (boxRescueState.status === 'failed') {
                content.appendChild(button('Retry Claude Sonnet review (no SAM rerun)', async () => {
                    boxRescueState = await api(`/${job.job_id}/box-rescue/retry`, { method: 'POST' });
                }));
            }
            for (const proposal of (boxRescueState.proposals || [])) {
                const card = el('section', undefined, 'autolabel-suggestion');
                const sourceFrame = manifest?.frames[proposal.frame_index]?.source_frame_index ?? proposal.source_frame_index;
                const link = el('a', `Source frame ${sourceFrame}`);
                link.href = `/tasks/${cvatTaskId}/jobs/${cvatJobId}?frame=${sourceFrame}`;
                card.appendChild(link);
                card.appendChild(el('p', `${proposal.label} Â· confidence ${proposal.confidence} Â· ${proposal.occlusion} occlusion Â· [${proposal.bbox.map((v) => v.toFixed(3)).join(', ')}] normalized`));
                card.appendChild(el('p', proposal.reason));
                card.appendChild(el('p', proposal.box_extent === 'amodal_estimate'
                    ? 'Estimated full object extent, including occluded parts. Check geometry before accepting.'
                    : 'Legacy visible-part box.'));
                const image = el('img');
                image.src = `${backend}/${job.job_id}/box-rescue/${proposal.proposal_id}/preview`;
                image.alt = `SAM boxes and Claude Sonnet proposal for frame ${sourceFrame}`;
                card.appendChild(image);
                if (['pending', 'accepting'].includes(proposal.status)) {
                    const acceptButton = button(proposal.status === 'accepting' ? 'Retry Accept (outcome unknown)' : 'Accept as CVAT track', async () => {
                        await saveCvatAnnotations();
                        const annotations = await api(`/${job.job_id}/box-rescue/revision`);
                        await api(`/${job.job_id}/box-rescue/${proposal.proposal_id}/accept`, {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ expected_annotation_revision: annotations.revision }),
                        });
                        error = 'Accepted suggestion was added as a one-frame CVAT track. Reload to display it.';
                    });
                    const rejectButton = button('Reject', async () => {
                        await api(`/${job.job_id}/box-rescue/${proposal.proposal_id}/reject`, { method: 'POST' });
                    });
                    acceptButton.disabled ||= boxRescueState.status !== 'done';
                    rejectButton.disabled ||= boxRescueState.status !== 'done' || proposal.status === 'accepting';
                    card.append(acceptButton, rejectButton);
                    if (boxRescueState.status !== 'done') {
                        card.appendChild(el('p', 'Review actions become available after the Claude Sonnet pass finishes.'));
                    }
                } else {
                    const reviewed = ['accepted', 'rejected'].includes(proposal.status);
                    card.appendChild(el('p', `Status: ${proposal.status}`, reviewed ? 'autolabel-success' : 'autolabel-error'));
                }
                content.appendChild(card);
            }
            if (boxRescueState.proposals?.some((item) => item.status === 'accepted')) {
                content.appendChild(button('Reload CVAT to see accepted suggestions', async () => { location.reload(); }));
            }
        }
        if (queue && queue.units.length) {
            content.appendChild(el('h3', 'Review queue'));
            const list = el('div', undefined, 'autolabel-queue');
            [...queue.units].sort((a, b) =>
                (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9) ||
                (b.review_score ?? 0) - (a.review_score ?? 0) || a.frame_start - b.frame_start
            ).forEach((unit) => {
                const row = el('p');
                const sourceStart = manifest?.frames[unit.frame_start]?.source_frame_index ?? unit.frame_start;
                const sourceEnd = manifest?.frames[unit.frame_end]?.source_frame_index ?? unit.frame_end;
                const link = el('a', `Frame ${sourceStart}${sourceEnd > sourceStart ? `â€“${sourceEnd}` : ''}`);
                link.href = `/tasks/${cvatTaskId}/jobs/${cvatJobId}?frame=${sourceStart}`;
                row.append(link, document.createTextNode(` Â· ${unit.priority} Â· ${unit.reason_codes.join(', ')}`));
                list.appendChild(row);
            });
            content.appendChild(list);
        }
    }

    function openPanel(taskId, jobId) {
        cvatTaskId = taskId;
        cvatJobId = jobId;
        job = null;
        queue = null;
        manifest = null;
        error = '';
        availableClasses = null;
        boxRescueState = { status: 'disabled', proposals: [] };
        classesEdited = false;
        panel = el('div', undefined, 'autolabel-backdrop');
        const dialog = el('section', undefined, 'autolabel-panel');
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-label', 'AutoLabel video');
        const close = el('button', 'Close', 'autolabel-close');
        close.addEventListener('click', closePanel);
        dialog.append(close, el('h2', 'AutoLabel video'), el('div', undefined, 'autolabel-content'));
        panel.appendChild(dialog);
        panel.addEventListener('click', (event) => { if (event.target === panel) closePanel(); });
        document.body.appendChild(panel);
        render();
        refresh();
        loadAvailableClasses();
    }

    function closePanel() {
        if (panel) panel.remove();
        panel = null;
    }

    function mountButton() {
        const match = location.pathname.match(/^\/tasks\/(\d+)\/jobs\/(\d+)/);
        const leftGroup = document.querySelector('.cvat-annotation-header-left-group');
        if (!match || !leftGroup) return;
        const existing = document.querySelector('.autolabel-open');
        if (existing) {
            if (existing.parentElement !== leftGroup) leftGroup.appendChild(existing);
            return;
        }
        const launch = el('button', 'AutoLabel video', 'autolabel-open');
        launch.addEventListener('click', () => {
            const current = location.pathname.match(/^\/tasks\/(\d+)\/jobs\/(\d+)/);
            if (current) openPanel(Number(current[1]), Number(current[2]));
        });
        leftGroup.appendChild(launch);
    }

    window.setInterval(() => {
        mountButton();
        if (panel && job && (active.has(job.status) || ['queued', 'running'].includes(boxRescueState.status)) && !busy) refresh();
    }, 1800);
    mountButton();
    const current = location.pathname.match(/^\/tasks\/(\d+)\/jobs\/(\d+)/);
    if (current && sessionStorage.getItem(`autolabel-reopen-${current[2]}`)) {
        sessionStorage.removeItem(`autolabel-reopen-${current[2]}`);
        openPanel(Number(current[1]), Number(current[2]));
    }
})();

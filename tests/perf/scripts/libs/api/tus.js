// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT
import http from 'k6/http';
import encoding from "k6/encoding";
import { validateResponse } from '../../utils/validation.js';
import { BASE_URL } from '../../variables/constants.js';

function toBase64(str) {
    return encoding.b64encode(str);
}

function tusUploadInit(authKey, taskId, filePath, fileSize) {
    let res = http.post(`${BASE_URL}/tasks/${taskId}/data/`, null,
        {
            headers: {
                Authorization: `Token ${authKey}`,
                "Upload-Length": `${fileSize}`,
                "Upload-Metadata": `filename ${toBase64(filePath)}`,
            }
        }
    )
    validateResponse(res, 201, "Task data Upload-Start")
    return res
}

function tusUploadFinish(authKey, taskId, finishOpts) {
    const url = `${BASE_URL}/tasks/${taskId}/data/`
    const res = http.post(url, JSON.stringify(finishOpts), {
        headers: {
            Authorization: `Token ${authKey}`,
            'Upload-Finish': '',
            'Content-Type': 'application/json',
        },
    });

    validateResponse(res, 202, "Task data Upload-Finish")
    return res;
}

/**
 * Uploads a local file to a CVAT task via TUS protocol. Uses a single batch.
 * @param {string} authKey
 * @param {string} taskId
 * @param {string} fileName
 */
export function tusUploadFile(authKey, taskId, fileName, fileData) {
    const fileSize = fileData.byteLength;
    // 1. Upload-Init
    let res = tusUploadInit(authKey, taskId, fileName, fileSize);
    // 2. Create upload URL (CVAT sends Location header)
    const uploadUrl = res.headers["Location"];
    if (!uploadUrl) {
        throw new Error("CVAT did not return upload URL in Location header");
    }
    // 3. Send file chunks (we’ll send it in one go here)
    res = http.patch(uploadUrl, fileData, {
        headers: {
            Authorization: `Token ${authKey}`,
            "Upload-Offset": "0",
            "Content-Type": "application/offset+octet-stream",
        },
    });
    validateResponse(res, 204, "Task data Upload-Chunk")
    tusUploadFinish(authKey, taskId, fileName, { image_quality: 70, client_files: [] });
}

// Single large file with TUS (Upload-Length + PATCH)
function tusUploadSingleFile(authKey, taskId, file) {
    const size = file.bytes.byteLength;
    let res = tusUploadInit(authKey, taskId, file.name, size)
    const uploadUrl = res.headers.Location;
    let offset = 0;
    const CHUNK_SIZE = 10 * 1024 * 1024;
    while (offset < size) {
        const end = Math.min(offset + CHUNK_SIZE, size);
        const chunk = file.bytes.slice(offset, end);

        res = http.patch(uploadUrl, chunk, {
            headers: {
                Authorization: `Token ${authKey}`,
                'Tus-Resumable': '1.0.0',
                'Upload-Offset': String(offset),
                'Content-Type': 'application/offset+octet-stream',
            },
        });
        validateResponse(res, 204, "Upload Patch")
        offset = Number(res.headers['Upload-Offset']);
    }
}

const MAX_REQUEST_SIZE = 50 * 1024 * 1024; // 50 MB threshold

function splitFilesByRequests(files) {
    const bulk = [];
    const separate = [];
    let total = 0;
    for (const f of files) {
        if (f.bytes.byteLength > MAX_REQUEST_SIZE) {
            separate.push(f);
        } else {
            bulk.push(f);
        }
        total += f.bytes.byteLength;
    }

    const groups = [];
    let current = [];
    let currentSize = 0;
    for (const f of bulk) {
        if (currentSize + f.bytes.byteLength > MAX_REQUEST_SIZE) {
            groups.push({ files: current, size: currentSize });
            current = [];
            currentSize = 0;
        }
        current.push(f);
        currentSize += f.bytes.byteLength;
    }
    if (current.length) groups.push({ files: current, size: currentSize });
    return { groups, separate, total };
}

function tusUploadFiles(
    authKey,
    taskId,
    files,      // [{ name: "a.jpg", bytes: ArrayBuffer }, ...]
    finishOpts, // { image_quality, sorting_method, ... }
) {
    const url = `${BASE_URL}/tasks/${taskId}/data`;
    const { groups, separate } = splitFilesByRequests(files);
    // If sorting method is predefined -> pass upload_file_order
    if (
        finishOpts.sorting_method &&
        String(finishOpts.sorting_method).toLowerCase() === 'predefined'
    ) {
        finishOpts.upload_file_order = files.map((f) => f.name);
    }
    // ---- Bulk files via Upload-Multiple
    for (const { files: group } of groups) {
        const formData = {};
        group.forEach((f, i) => {
            formData[`client_files[${i}]`] = http.file(f.bytes, f.name);
        });
        formData['image_quality'] = finishOpts.image_quality;

        const res = http.post(url, formData, {
            headers: {
                Authorization: `Token ${authKey}`,
                'Upload-Multiple': '',
            },
        });
        validateResponse(res, 200, "Upload-Multiple");
    }

    // ---- Large files via TUS
    for (const f of separate) {
        tusUploadSingleFile(authKey, taskId, f);
    }

    tusUploadFinish(authKey, taskId, finishOpts);
}


export default { tusUploadFiles, tusUploadFile }
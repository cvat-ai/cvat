// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/* eslint-disable no-restricted-globals */

const MAX_RETRIES = 10;
const BASE_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 60000;
const MIN_CHUNK_SIZE_FOR_TELEMETRY_BYTES = 2 * 1024 * 1024;

class DownloadError extends Error {
    public code: number;

    constructor(message: string, code: number) {
        super(message);
        this.code = code;
    }
}

class DownloadReadError extends Error {
    public receivedBytes: number;
    public downloadTimeMs: number;

    constructor(message: string, receivedBytes: number, downloadTimeMs: number) {
        super(message);
        this.receivedBytes = receivedBytes;
        this.downloadTimeMs = downloadTimeMs;
    }
}

interface ChunkIdentity {
    checksum: string;
    updatedDate: string;
}

interface DownloadTelemetry {
    chunkSizeBytes: number;
    downloadTimeMs: number;
    retries: number;
}

function sleep(timeout: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, timeout);
    });
}

function parseRetryAfter(retryAfter: string | null): number | null {
    if (!retryAfter || !/^\d+$/.test(retryAfter)) {
        return null;
    }

    return Number(retryAfter) * 1000;
}

function getRetryDelay(response: Response | null, retry: number): number {
    const retryAfter = parseRetryAfter(response?.headers.get('retry-after') ?? null);
    if (retryAfter !== null) {
        return retryAfter;
    }

    return Math.min(BASE_RETRY_DELAY_MS * 2 ** retry, MAX_RETRY_DELAY_MS);
}

function shouldRetry(response: Response | null): boolean {
    const retryableStatuses = [
        429, // Too Many Requests: request is throttled, retry is allowed, Retry-After is provided.
        502, // Bad Gateway: Traefik -> Nginx -> Uvicorn (restarting, deployed on wrong port, etc.).
        503, // Service Unavailable: Traefik -> Nginx (No server pods listening (during deployment or bad config)).
        504, // Gateway Timeout: Traefik -> Nginx -> Uvicorn (Server is overloaded and cant produce response in time).
    ];

    return !response || retryableStatuses.includes(response.status);
}

function appendParams(url: string, params: Record<string, string | number | boolean>): string {
    const result = new URL(url, self.location.origin);
    for (const [key, value] of Object.entries(params || {})) {
        result.searchParams.set(key, `${value}`);
    }

    return result.toString();
}

function parseContentRange(headers: Record<string, string>): { start: number } | null {
    const value = headers['content-range'];
    if (!value) {
        return null;
    }

    const matched = /^bytes\s+(\d+)-\d+\/(?:\d+|\*)$/i.exec(value);
    if (!matched) {
        return null;
    }

    return {
        start: +matched[1],
    };
}

function getChunkSize(headers: Record<string, string>): number | null {
    const value = headers['x-chunk-size'];
    if (value === undefined) {
        return null;
    }

    if (!/^\d+$/.test(value)) {
        throw new Error('Unexpected X-Chunk-Size header');
    }

    const size = Number(value);
    if (!Number.isSafeInteger(size)) {
        throw new Error('Unexpected X-Chunk-Size header');
    }

    return size;
}

function headersToObject(headers: Headers): Record<string, string> {
    return Object.fromEntries([...headers.entries()]);
}

function getChunkIdentity(headers: Record<string, string>): ChunkIdentity {
    // The update date identifies the chunk generation, while the checksum also guards against stale cached content.
    const checksum = headers['x-checksum'];
    const updatedDate = headers['x-updated-date'];
    if (!checksum || !updatedDate) {
        throw new Error('Missing chunk identity headers');
    }

    return { checksum, updatedDate };
}

function isSameChunk(first: ChunkIdentity, second: ChunkIdentity): boolean {
    return first.checksum === second.checksum && first.updatedDate === second.updatedDate;
}

function mergeChunks(chunks: Uint8Array[], totalLength: number): ArrayBuffer {
    const data = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
        data.set(chunk, offset);
        offset += chunk.byteLength;
    }

    return data.buffer;
}

async function readResponse(
    response: Response,
    chunks: Uint8Array[],
    receivedBytes: number,
): Promise<{ receivedBytes: number; downloadTimeMs: number }> {
    // fetch() has already resolved, so this timer excludes server-side chunk preparation.
    const downloadStartedAt = performance.now();
    const reader = response.body.getReader();
    let nextReceivedBytes = receivedBytes;

    while (true) {
        let result: ReadableStreamReadResult<Uint8Array>;
        try {
            result = await reader.read();
        } catch (error) {
            throw new DownloadReadError(
                error instanceof Error ? error.message : `${error}`,
                nextReceivedBytes,
                performance.now() - downloadStartedAt,
            );
        }

        const { done, value } = result;
        if (done) {
            return {
                receivedBytes: nextReceivedBytes,
                downloadTimeMs: performance.now() - downloadStartedAt,
            };
        }

        chunks.push(value);
        nextReceivedBytes += value.byteLength;
    }
}

/*
 * Initial GET (no Range)
 *          |
 *          v
 *        200 OK
 *          |
 *          +-- X-Chunk-Size is missing --> accept the completed stream for backward compatibility
 *          |
 *          +-- received bytes == X-Chunk-Size --> done
 *          |
 *          `-- received bytes < X-Chunk-Size
 *                         |
 *                         v
 *              GET Range: bytes=<received>-
 *                         |
 *                         +-- 206 Partial Content --> validate and append the remaining bytes
 *                         |
 *                         `-- 200 OK --> Range was ignored; discard partial bytes and download from byte 0
 */
async function fetchData(url: string, requestConfig): Promise<{
    data: ArrayBuffer;
    headers: Record<string, string>;
    telemetry?: DownloadTelemetry;
}> {
    const requestUrl = appendParams(url, requestConfig.params);
    let chunks: Uint8Array[] = [];
    let receivedBytes = 0;
    let expectedSize: number | null = null;
    let chunkIdentity: ChunkIdentity | null = null;
    let requestCount = 0;
    let bodyDownloadTimeMs = 0;

    let retry = 0;
    while (retry <= MAX_RETRIES) {
        const rangeRequested = receivedBytes > 0;
        let response: Response | null = null;

        requestCount++;
        try {
            const headers = new Headers(requestConfig.headers ?? {});
            if (rangeRequested) {
                headers.set('Range', `bytes=${receivedBytes}-`);
            }

            response = await fetch(requestUrl, { method: 'GET', credentials: 'include', headers });
            if (!response.ok) {
                if (retry < MAX_RETRIES && shouldRetry(response)) {
                    await sleep(getRetryDelay(response, retry));
                    retry++;
                    continue;
                }

                throw new DownloadError(await response.text(), response.status);
            }

            const responseHeaders = headersToObject(response.headers);
            const responseChunkIdentity = getChunkIdentity(responseHeaders);
            const responseChunkSize = getChunkSize(responseHeaders);

            if (!rangeRequested) {
                if (response.status !== 200) {
                    throw new Error(`Unexpected response status: ${response.status}`);
                }

                chunkIdentity = responseChunkIdentity;
            } else if (response.status === 206) {
                const contentRange = parseContentRange(responseHeaders);
                if (!contentRange || contentRange.start !== receivedBytes) {
                    throw new Error('Unexpected Content-Range header');
                }

                if (chunkIdentity && !isSameChunk(chunkIdentity, responseChunkIdentity)) {
                    await response.body?.cancel();
                    return fetchData(url, requestConfig);
                }

                chunkIdentity = responseChunkIdentity;
            } else if (response.status === 200) {
                // A proxy ignored or removed Range. This is a complete representation starting at byte 0,
                // so previously received bytes must not be combined with it.
                chunks = [];
                receivedBytes = 0;
                chunkIdentity = responseChunkIdentity;
                expectedSize = null;
            } else {
                throw new Error(`Unexpected response status: ${response.status}`);
            }

            if (responseChunkSize !== null) {
                expectedSize = responseChunkSize;
            }

            const readResult = await readResponse(response, chunks, receivedBytes);
            receivedBytes = readResult.receivedBytes;
            bodyDownloadTimeMs += readResult.downloadTimeMs;

            if (expectedSize !== null && receivedBytes > expectedSize) {
                throw new Error(`Received more bytes than expected: ${receivedBytes}/${expectedSize}`);
            }

            if (expectedSize !== null && receivedBytes < expectedSize) {
                if (retry < MAX_RETRIES) {
                    await sleep(getRetryDelay(response, retry));
                    retry++;
                    continue;
                }

                throw new Error(`Received fewer bytes than expected: ${receivedBytes}/${expectedSize}`);
            }

            if (expectedSize === null || receivedBytes === expectedSize) {
                const telemetry = receivedBytes >= MIN_CHUNK_SIZE_FOR_TELEMETRY_BYTES ? {
                    chunkSizeBytes: receivedBytes,
                    // Includes body reading across resumed and restarted requests.
                    downloadTimeMs: bodyDownloadTimeMs,
                    retries: requestCount - 1,
                } : undefined;

                return {
                    data: mergeChunks(chunks, receivedBytes),
                    headers: {
                        ...responseHeaders,
                        'content-length': `${expectedSize ?? receivedBytes}`,
                    },
                    telemetry,
                };
            }
        } catch (error) {
            if (error instanceof DownloadReadError) {
                receivedBytes = error.receivedBytes;
                // The partial bytes remain available for resuming, so include the time spent downloading them.
                bodyDownloadTimeMs += error.downloadTimeMs;
            }

            if (retry < MAX_RETRIES && (error instanceof DownloadReadError || shouldRetry(response))) {
                await sleep(getRetryDelay(response, retry));
                retry++;
                continue;
            }

            throw error;
        }
    }

    throw new Error('Maximum download retries exceeded');
}

onmessage = (e) => {
    fetchData(e.data.url, e.data.config)
        .then((response) => {
            postMessage({
                responseData: response.data,
                headers: response.headers,
                telemetry: response.telemetry,
                id: e.data.id,
                isSuccess: true,
            });
        })
        .catch((error) => {
            const message = {
                id: e.data.id,
                message: error.message,
                isSuccess: false,
                ...(typeof error.code === 'number' ? { code: error.code } : {}),
            };

            postMessage(message);
        });
};

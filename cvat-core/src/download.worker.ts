// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/* eslint-disable no-restricted-globals */

// Progress-making attempts reset this counter; it limits repeated failures that do not add bytes.
const MAX_NO_PROGRESS_RETRIES = 10;
const BASE_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 60000;

class DownloadError extends Error {
    public code: number;

    constructor(message: string, code: number) {
        super(message);
        this.code = code;
    }
}

class DownloadReadError extends Error {
    public receivedBytes: number;

    constructor(message: string, receivedBytes: number) {
        super(message);
        this.receivedBytes = receivedBytes;
    }
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

function parseContentRange(value: string | null): { start: number; total: number | null } | null {
    if (!value) {
        return null;
    }

    const matched = /^bytes\s+(\d+)-(\d+)\/(\d+|\*)$/i.exec(value);
    if (!matched) {
        return null;
    }

    return {
        start: +matched[1],
        total: matched[3] === '*' ? null : +matched[3],
    };
}

function headersToObject(headers: Headers): Record<string, string> {
    return Object.fromEntries([...headers.entries()]);
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
): Promise<number> {
    const reader = response.body.getReader();
    let nextReceivedBytes = receivedBytes;

    while (true) {
        let result: ReadableStreamReadResult<Uint8Array>;
        try {
            result = await reader.read();
        } catch (error) {
            throw new DownloadReadError(error instanceof Error ? error.message : `${error}`, nextReceivedBytes);
        }

        const { done, value } = result;
        if (done) {
            return nextReceivedBytes;
        }

        chunks.push(value);
        nextReceivedBytes += value.byteLength;
    }
}

async function fetchData(url: string, requestConfig): Promise<{
    data: ArrayBuffer;
    headers: Record<string, string>;
}> {
    const requestUrl = appendParams(url, requestConfig.params);
    const chunks: Uint8Array[] = [];
    let receivedBytes = 0;
    let responseHeaders: Record<string, string> = {};
    let expectedSize: number | null = null;

    let retry = 0;
    while (retry <= MAX_NO_PROGRESS_RETRIES) {
        let response: Response | null = null;
        const receivedBytesBeforeRequest = receivedBytes;
        try {
            const headers = new Headers(requestConfig.headers ?? {});
            if (receivedBytes) {
                headers.set('Range', `bytes=${receivedBytes}-`);
            }

            response = await fetch(requestUrl, {
                method: 'GET',
                credentials: 'include',
                headers,
            });

            responseHeaders = headersToObject(response.headers);

            if (!response.ok) {
                if (retry < MAX_NO_PROGRESS_RETRIES && shouldRetry(response)) {
                    await sleep(getRetryDelay(response, retry));
                    retry++;
                    continue;
                }

                throw new DownloadError(await response.text(), response.status);
            }

            if (receivedBytes) {
                if (response.status === 206) {
                    const contentRange = parseContentRange(response.headers.get('content-range'));
                    if (!contentRange || contentRange.start !== receivedBytes) {
                        throw new Error('Unexpected Content-Range header');
                    }

                    expectedSize = contentRange.total;
                } else {
                    throw new Error(`Unexpected response status: ${response.status}`);
                }
            } else {
                expectedSize = null;
            }

            receivedBytes = await readResponse(response, chunks, receivedBytes);

            if (expectedSize !== null && receivedBytes > expectedSize) {
                throw new Error(`Received more bytes than expected: ${receivedBytes}/${expectedSize}`);
            }

            if (expectedSize !== null && receivedBytes < expectedSize) {
                if (receivedBytes > receivedBytesBeforeRequest) {
                    retry = 0;
                    await sleep(getRetryDelay(response, retry));
                    continue;
                }

                if (retry < MAX_NO_PROGRESS_RETRIES) {
                    await sleep(getRetryDelay(response, retry));
                    retry++;
                    continue;
                }

                throw new Error(`Received fewer bytes than expected: ${receivedBytes}/${expectedSize}`);
            }

            if (expectedSize === null || receivedBytes === expectedSize) {
                return {
                    data: mergeChunks(chunks, receivedBytes),
                    headers: {
                        ...responseHeaders,
                        ...(expectedSize !== null ? { 'content-length': `${expectedSize}` } : {}),
                    },
                };
            }
        } catch (error) {
            if (error instanceof DownloadReadError) {
                receivedBytes = error.receivedBytes;
            }

            if (retry < MAX_NO_PROGRESS_RETRIES && (error instanceof DownloadReadError || shouldRetry(response))) {
                const madeProgress = receivedBytes > receivedBytesBeforeRequest;
                await sleep(getRetryDelay(response, madeProgress ? 0 : retry));
                if (madeProgress) {
                    retry = 0;
                } else {
                    retry++;
                }
                continue;
            }

            throw error;
        }
    }

    throw new Error('Maximum download retries without progress exceeded');
}

onmessage = (e) => {
    fetchData(e.data.url, e.data.config)
        .then((response) => {
            postMessage({
                responseData: response.data,
                headers: response.headers,
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

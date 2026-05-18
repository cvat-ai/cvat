// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/* eslint-disable no-restricted-globals */

const MAX_RETRIES = 10;
const BASE_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 60000;

class DownloadError extends Error {
    public code: number;

    constructor(message: string, code: number) {
        super(message);
        this.code = code;
    }
}

class DownloadReadError extends Error {}

function sleep(timeout: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, timeout);
    });
}

function getRetryDelay(response: Response | null, retry: number): number {
    const retryAfter = response?.headers.get('retry-after');
    if (retryAfter && /^\d+$/.test(retryAfter)) {
        return +retryAfter * 1000;
    }

    return Math.min(BASE_RETRY_DELAY_MS * 2 ** retry, MAX_RETRY_DELAY_MS);
}

function shouldRetry(response: Response | null): boolean {
    const retryableStatuses = [
        408, // Request Timeout: the server closed the request before completing the download.
        429, // Too Many Requests: retry is allowed, especially when Retry-After is provided.
        502, // Bad Gateway: a proxy/upstream failure may be temporary.
        503, // Service Unavailable: the server may recover after a short delay.
        504, // Gateway Timeout: a proxy/upstream timeout may be temporary.
    ];

    return !response || retryableStatuses.includes(response.status);
}

function shouldRetryError(error: unknown, response: Response | null): boolean {
    return !response || shouldRetry(response) || (response.ok && error instanceof DownloadReadError);
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

function getContentLength(response: Response): number | null {
    const contentLength = response.headers.get('content-length');
    if (contentLength === null) {
        return null;
    }

    const parsedContentLength = Number(contentLength);
    return Number.isInteger(parsedContentLength) && parsedContentLength >= 0 ? parsedContentLength : null;
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
        const { done, value } = await reader.read();
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

    for (let retry = 0; retry <= MAX_RETRIES; retry++) {
        let response: Response | null = null;
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
                if (retry < MAX_RETRIES && shouldRetry(response)) {
                    await sleep(getRetryDelay(response, retry));
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
                expectedSize = getContentLength(response);
            }

            try {
                receivedBytes = await readResponse(response, chunks, receivedBytes);
            } catch (error) {
                throw new DownloadReadError(error instanceof Error ? error.message : `${error}`);
            }

            if (expectedSize !== null && receivedBytes > expectedSize) {
                throw new Error(`Received more bytes than expected: ${receivedBytes}/${expectedSize}`);
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
            if (retry < MAX_RETRIES && shouldRetryError(error, response)) {
                await sleep(getRetryDelay(response, retry));
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
                id: e.data.id,
                isSuccess: true,
            });
        })
        .catch((error) => {
            postMessage({
                id: e.data.id,
                message: error.message,
                code: error.code || 0,
                isSuccess: false,
            });
        });
};

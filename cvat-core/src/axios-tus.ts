// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import Axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import * as tus from 'tus-js-client';

class AxiosHttpResponse implements tus.HttpResponse {
    readonly #axiosResponse: AxiosResponse;

    constructor(axiosResponse: AxiosResponse) {
        this.#axiosResponse = axiosResponse;
    }

    getStatus(): number {
        return this.#axiosResponse.status;
    }
    getHeader(header: string): string | undefined {
        return this.#axiosResponse.headers[header.toLowerCase()];
    }
    getBody(): string {
        return this.#axiosResponse.data;
    }
    getUnderlyingObject(): AxiosResponse {
        return this.#axiosResponse;
    }
}

class AxiosHttpRequest implements tus.HttpRequest {
    readonly #axiosConfig: AxiosRequestConfig;
    readonly #abortController: AbortController;

    constructor(method: string, url: string) {
        this.#abortController = new AbortController();
        this.#axiosConfig = {
            method,
            url,
            headers: {},
            signal: this.#abortController.signal,
            validateStatus: () => true,
        };
    }

    getMethod(): string {
        return this.#axiosConfig.method;
    }
    getURL(): string {
        return this.#axiosConfig.url;
    }

    setHeader(header: string, value: string): void {
        this.#axiosConfig.headers[header.toLowerCase()] = value;
    }
    getHeader(header: string): string | undefined {
        return this.#axiosConfig.headers[header.toLowerCase()];
    }

    setProgressHandler(handler: (bytesSent: number) => void): void {
        this.#axiosConfig.onUploadProgress = (progressEvent) => {
            handler(progressEvent.loaded);
        };
    }

    async send(body: any): Promise<tus.HttpResponse> {
        const axiosResponse = await Axios({ ...this.#axiosConfig, data: body });
        return new AxiosHttpResponse(axiosResponse);
    }

    async abort(): Promise<void> {
        this.#abortController.abort();
    }

    getUnderlyingObject(): AxiosRequestConfig {
        return this.#axiosConfig;
    }
}

class AxiosHttpStack implements tus.HttpStack {
    createRequest(method: string, url: string): tus.HttpRequest {
        return new AxiosHttpRequest(method, url);
    }
    getName(): string {
        return 'AxiosHttpStack';
    }
}

export const axiosTusHttpStack = new AxiosHttpStack();

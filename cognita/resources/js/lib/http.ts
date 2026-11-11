/**
 * The few lines every request in the call page needs, in one place.
 *
 * Before this file each call site rebuilt the CSRF header, the JSON content
 * type and the error message by hand; now a call site says what it wants and
 * gets a typed payload or an ApiError that already reads like a sentence.
 */

export class ApiError extends Error {
    constructor(
        message: string,
        readonly status: number,
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

export function csrfToken(): string {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
}

type JsonRequest = Omit<RequestInit, 'body'> & { json?: unknown; body?: BodyInit };

/** Fetch JSON and unwrap the app's `{ data: ... }` envelope. */
export async function requestData<T>(url: string, init: JsonRequest = {}): Promise<T> {
    const response = await send(url, init);

    if (!response.ok) {
        throw new ApiError(await describeError(response), response.status);
    }

    const payload = (await response.json()) as { data: T };

    return payload.data;
}

/** Fetch JSON without an envelope: the health report and other plain replies. */
export async function requestJson<T>(url: string, init: JsonRequest = {}): Promise<T> {
    const response = await send(url, init);

    if (!response.ok) {
        throw new ApiError(await describeError(response), response.status);
    }

    return (await response.json()) as T;
}

/** Best-effort request for pings and heartbeats: failures are not the user's problem. */
export async function sendQuietly(url: string, init: JsonRequest = {}): Promise<void> {
    try {
        await send(url, init);
    } catch {
        /* the next heartbeat retries */
    }
}

/** FormData posts carry their own content type, so the header is left alone. */
export function postForm<T>(url: string, form: FormData): Promise<T> {
    return requestData<T>(url, { method: 'POST', body: form });
}

export function postJson<T>(url: string, json: unknown = {}): Promise<T> {
    return requestData<T>(url, { method: 'POST', json });
}

export function patchJson<T>(url: string, json: unknown): Promise<T> {
    return requestData<T>(url, { method: 'PATCH', json });
}

/**
 * Leave a page in a way that survives it: `sendBeacon` when the browser offers
 * it, a keepalive fetch otherwise.
 */
export function leaveBeacon(url: string): void {
    const form = new FormData();
    form.append('_token', csrfToken());

    try {
        if (typeof navigator !== 'undefined' && navigator.sendBeacon(url, form)) {
            return;
        }
    } catch {
        /* fall through to fetch */
    }

    void sendQuietly(url, { method: 'POST', body: form, keepalive: true });
}

async function send(url: string, init: JsonRequest): Promise<Response> {
    const { json, headers, ...rest } = init;

    return fetch(url, {
        credentials: 'same-origin',
        ...rest,
        headers: {
            Accept: 'application/json',
            'X-CSRF-TOKEN': csrfToken(),
            ...(json === undefined ? {} : { 'Content-Type': 'application/json' }),
            ...(headers as Record<string, string> | undefined),
        },
        body: json === undefined ? rest.body : JSON.stringify(json),
    });
}

async function describeError(response: Response): Promise<string> {
    try {
        const body = (await response.json()) as { message?: string; errors?: Record<string, string[]> };
        const first = body.errors ? Object.values(body.errors)[0]?.[0] : undefined;

        return first ?? body.message ?? `That did not work (${response.status}).`;
    } catch {
        return `That did not work (${response.status}).`;
    }
}

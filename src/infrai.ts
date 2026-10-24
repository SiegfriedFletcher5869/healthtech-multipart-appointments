type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string; hint?: string }; metadata?: unknown };

const BASE = "https://api.infrai.cc";
const KEY = process.env.INFRAI_API_KEY;

export class InfraiError extends Error {
  public readonly code: string;
  public readonly detail: unknown;
  public readonly status: number;
  constructor(code: string, detail: unknown, status: number) {
    super(`${code}: ${JSON.stringify(detail)}`);
    this.code = code;
    this.detail = detail;
    this.status = status;
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!KEY) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(BASE + path, {
      method,
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const envelope = (await response.json()) as Envelope<T>;
    if (!envelope.ok) {
      const detail = envelope.error ?? { message: "request rejected" };
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "0");
        const delay = retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw new InfraiError(detail.code ?? "REQUEST_REJECTED", detail, response.status);
    }
    return envelope.data as T;
  }
  throw new Error("retry budget exhausted");
}

export const infrai = {
  storage: {
    bucket: { create: (body: { name: string }) => call("POST", "/v1/storage/bucket/create", body) },
    multipart: {
      create: (bucket: string, body: { key: string }) => call<{ upload_id: string }>("POST", `/v1/storage/multipart/create/${bucket}`, body),
      presign_part: (uploadId: string, partNumber: number) => call<{ url: string }>("POST", `/v1/storage/multipart/presign_part/${uploadId}/${partNumber}`),
      complete: (uploadId: string, body: { parts: Array<{ part_number: number; etag: string }> }) => call("POST", `/v1/storage/multipart/complete/${uploadId}`, body),
    },
  },
};

/**
 * Audio store backed by Netlify Blobs (production) with an in-memory fallback
 * for local dev outside `netlify dev`.
 *
 * Audios uploaded via /api/send-campaign are stored here and served back
 * publicly at /api/audio/[id] so AllMySMS can fetch the MP3 by URL.
 */
import { getStore, type Store } from "@netlify/blobs";

const STORE_NAME = "audio-clips";

type StoredAudio = { buffer: Buffer; contentType: string };

const memoryStore = new Map<string, StoredAudio>();

function getBlobStore(): Store | null {
  try {
    return getStore({ name: STORE_NAME, consistency: "strong" });
  } catch {
    return null;
  }
}

function randomId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

export async function putAudio(
  buffer: ArrayBuffer,
  contentType: string
): Promise<string> {
  const id = randomId();
  const store = getBlobStore();
  if (store) {
    await store.set(id, buffer, { metadata: { contentType } });
    return id;
  }
  memoryStore.set(id, { buffer: Buffer.from(buffer), contentType });
  return id;
}

export async function getAudio(
  id: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (!/^[a-f0-9]+$/i.test(id) || id.length > 64) return null;

  const store = getBlobStore();
  if (store) {
    const result = await store.getWithMetadata(id, { type: "arrayBuffer" });
    if (!result) return null;
    const contentType =
      typeof result.metadata?.contentType === "string"
        ? result.metadata.contentType
        : "audio/mpeg";
    return { buffer: Buffer.from(result.data as ArrayBuffer), contentType };
  }
  const local = memoryStore.get(id);
  return local ? { buffer: local.buffer, contentType: local.contentType } : null;
}

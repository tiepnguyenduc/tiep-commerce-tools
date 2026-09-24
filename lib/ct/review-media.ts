import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { reviewMediaError, reviewMediaKind } from "../review-media";
import type { ReviewMedia, ReviewMediaType } from "../types";

/** Ids are generated here, so anything else must never reach the filesystem. */
const MEDIA_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export class ReviewMediaError extends Error {
  readonly status = 400;
}

function storageDirectory() {
  return process.env.REVIEW_MEDIA_DIR || path.join(process.cwd(), ".data", "review-media");
}

const payloadPath = (id: string) => path.join(storageDirectory(), `${id}.bin`);
const metadataPath = (id: string) => path.join(storageDirectory(), `${id}.json`);

export function reviewMediaUrl(id: string) {
  return `/api/review-media/${id}`;
}

export function assertValidReviewMedia(files: File[]) {
  const message = reviewMediaError(files);
  if (message) throw new ReviewMediaError(message);
}

/** Persists the attachments and returns the metadata stored alongside the review. */
export async function storeReviewMedia(files: File[]): Promise<ReviewMedia[]> {
  assertValidReviewMedia(files);
  if (!files.length) return [];

  await mkdir(storageDirectory(), { recursive: true });

  return Promise.all(
    files.map(async (file) => {
      const id = randomUUID();
      const contentType = file.type.split(";")[0].trim().toLowerCase();
      const media: ReviewMedia = {
        id,
        type: reviewMediaKind(contentType) as ReviewMediaType,
        url: reviewMediaUrl(id),
        contentType,
        // Only the basename is kept; the stored file is named after its id.
        name: path.basename(file.name || "").slice(0, 120) || undefined,
      };

      await writeFile(payloadPath(id), Buffer.from(await file.arrayBuffer()));
      await writeFile(metadataPath(id), JSON.stringify(media));
      return media;
    }),
  );
}

export async function readStoredReviewMedia(id: string) {
  if (!MEDIA_ID.test(id)) return null;

  try {
    const [body, metadata] = await Promise.all([
      readFile(payloadPath(id)),
      readFile(metadataPath(id), "utf8"),
    ]);
    const { contentType } = JSON.parse(metadata) as ReviewMedia;
    return { body, contentType: reviewMediaKind(contentType) ? contentType : "application/octet-stream" };
  } catch {
    return null;
  }
}

/** Keeps stored media trustworthy: ids and URLs always come from this module. */
export function sanitizeStoredMedia(value: unknown): ReviewMedia[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    const media = entry as Partial<ReviewMedia>;
    const contentType = typeof media?.contentType === "string" ? media.contentType : "";
    const kind = reviewMediaKind(contentType);
    if (!kind || typeof media.id !== "string" || !MEDIA_ID.test(media.id)) return [];

    return [{
      id: media.id,
      type: kind,
      url: reviewMediaUrl(media.id),
      contentType,
      ...(typeof media.name === "string" && media.name ? { name: media.name.slice(0, 120) } : {}),
    }];
  });
}

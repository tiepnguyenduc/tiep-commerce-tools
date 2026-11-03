import type { ReviewMediaType } from "./types";

/** One review carries either a few photos or a single video, never both. */
export const REVIEW_MEDIA_LIMITS = {
  maxImages: 3,
  maxVideos: 1,
  maxBytes: 100 * 1024 * 1024,
};

export const REVIEW_MEDIA_MAX_MB = Math.round(
  REVIEW_MEDIA_LIMITS.maxBytes / (1024 * 1024),
);

export const REVIEW_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
];
export const REVIEW_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
];
export const REVIEW_MEDIA_ACCEPT = [
  ...REVIEW_IMAGE_TYPES,
  ...REVIEW_VIDEO_TYPES,
].join(",");

/** Copy shown under the upload field, kept in one place so both sides agree. */
export const REVIEW_MEDIA_HINT =
  `Upload up to ${REVIEW_MEDIA_LIMITS.maxImages} photos or ${REVIEW_MEDIA_LIMITS.maxVideos} video. ` +
  `Maximum file size: ${REVIEW_MEDIA_MAX_MB} MB.`;

export function reviewMediaKind(contentType: string): ReviewMediaType | null {
  const type = contentType.split(";")[0].trim().toLowerCase();
  if (REVIEW_IMAGE_TYPES.includes(type)) return "image";
  if (REVIEW_VIDEO_TYPES.includes(type)) return "video";
  return null;
}

type UploadCandidate = { type: string; size: number };

/**
 * Validates the attachments of one review as a set. Returns the message to show, or
 * null when the selection is fine; the API enforces the same rules.
 */
export function reviewMediaError(files: UploadCandidate[]): string | null {
  if (!files.length) return null;

  const kinds = files.map((file) => reviewMediaKind(file.type));
  if (kinds.some((kind) => kind === null)) {
    return "Attach JPEG, PNG, WebP, GIF or AVIF photos, or an MP4, WebM or MOV video.";
  }

  const videos = kinds.filter((kind) => kind === "video").length;
  const images = kinds.length - videos;

  if (videos > REVIEW_MEDIA_LIMITS.maxVideos || (videos && images)) {
    return `Attach up to ${REVIEW_MEDIA_LIMITS.maxImages} photos or ${REVIEW_MEDIA_LIMITS.maxVideos} video, not both.`;
  }
  if (images > REVIEW_MEDIA_LIMITS.maxImages) {
    return `Attach up to ${REVIEW_MEDIA_LIMITS.maxImages} photos.`;
  }
  if (files.some((file) => file.size > REVIEW_MEDIA_LIMITS.maxBytes)) {
    return `Each file has to stay under ${REVIEW_MEDIA_MAX_MB} MB.`;
  }
  if (files.some((file) => !file.size)) return "One of the files is empty.";

  return null;
}

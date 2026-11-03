import { NextResponse } from "next/server";
import { readStoredReviewMedia } from "@/lib/ct/review-media";

type Context = { params: Promise<{ mediaId: string }> };

/**
 * Serves a photo or video attached to a review. Only the image and video types the
 * upload accepted are ever returned, and never sniffed into something else.
 */
export async function GET(_request: Request, context: Context) {
  const { mediaId } = await context.params;
  const file = await readStoredReviewMedia(mediaId);

  if (!file)
    return NextResponse.json({ error: "Media not found." }, { status: 404 });

  return new NextResponse(new Uint8Array(file.body), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.body.byteLength),
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

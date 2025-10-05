import { NextResponse, type NextRequest } from "next/server";
import { list, put, del } from "@vercel/blob";
import { randomUUID } from "crypto";

const BLOB_PREFIX = "nocturne-uploads/";
const THIRTY_MINUTES = 30 * 60 * 1000;

export const runtime = "nodejs";

const encodeBlobUrl = (url: string) => Buffer.from(url).toString("base64url");

async function cleanupOldBlobs(token: string) {
  try {
    const { blobs } = await list({
      prefix: BLOB_PREFIX,
      token,
    });
    const threshold = Date.now() - THIRTY_MINUTES;

    const stale = blobs.filter((blob) => {
      const uploadedAt = new Date(blob.uploadedAt).getTime();
      return Number.isFinite(uploadedAt) && uploadedAt < threshold;
    });

    await Promise.all(
      stale.map((blob) =>
        del(blob.pathname, { token }).catch((error) => {
          console.error(`Failed to cleanup blob ${blob.pathname}`, error);
        })
      )
    );
  } catch (error) {
    console.error("Failed to list blobs for cleanup", error);
  }
}

export async function POST(request: NextRequest) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    console.error("BLOB_READ_WRITE_TOKEN is not configured.");
    return NextResponse.json(
      { error: "Storage is not configured." },
      { status: 500 }
    );
  }

  try {
    const { data } = await request.json();

    if (typeof data !== "string" || !data.startsWith("data:image")) {
      return NextResponse.json(
        { error: "Invalid image payload" },
        { status: 400 }
      );
    }

    const [, base64Data] = data.split(",");
    if (!base64Data) {
      return NextResponse.json(
        { error: "Malformed image data" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(base64Data, "base64");

    const blobPath = `${BLOB_PREFIX}${Date.now()}-${randomUUID()}.jpg`;
    const { url } = await put(blobPath, buffer, {
      access: "public",
      contentType: "image/jpeg",
      token,
    });

    // Fire-and-forget cleanup of stale uploads
    cleanupOldBlobs(token).catch(() => {});

    return NextResponse.json({ id: encodeBlobUrl(url), url });
  } catch (error) {
    console.error("Failed to save uploaded image", error);
    return NextResponse.json(
      { error: "Unable to save image" },
      { status: 500 }
    );
  }
}

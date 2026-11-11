import "dotenv/config";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
export const bucketName = process.env.R2_BUCKET_NAME || "kavi";
export const publicDomain = (
  process.env.R2_PUBLIC_DOMAIN || "https://s3.kavi.jeki.me"
).replace(/\/$/, "");

export type R2Folder = "pfp" | "posts" | "evidence";

export function normalizeR2Folder(raw?: string | null): R2Folder {
  const val = (raw || "").trim().toLowerCase();
  if (val === "pfp" || val === "avatar" || val === "avatars" || val === "profile") {
    return "pfp";
  }
  if (val === "evidence" || val === "resolution" || val === "verification") {
    return "evidence";
  }
  return "posts";
}

export const isR2Configured = Boolean(
  accountId && accessKeyId && secretAccessKey && bucketName && publicDomain
);

export const r2Client = new S3Client({
  region: "auto",
  endpoint: accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined,
  credentials: {
    accessKeyId: accessKeyId || "",
    secretAccessKey: secretAccessKey || "",
  },
});

export interface UploadResult {
  url: string;
  key: string;
  size: number;
  contentType: string;
}

/**
 * Upload an image/video buffer or file to Cloudflare R2
 */
export async function uploadToR2(
  buffer: Buffer,
  filename: string,
  contentType: string,
  folder = "evidence"
): Promise<UploadResult> {
  if (!isR2Configured) {
    throw new Error(
      "Cloudflare R2 is not fully configured in .env (Check R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_DOMAIN)"
    );
  }

  const cleanFilename = filename.toLowerCase().replace(/[^a-z0-9.]/g, "-");
  const ext = cleanFilename.split(".").pop() || "jpg";
  const uniqueId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const key = `${folder}/${uniqueId}.${ext}`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  const url = `${publicDomain}/${key}`;

  return {
    url,
    key,
    size: buffer.length,
    contentType,
  };
}

/**
 * Delete an object from Cloudflare R2 by key or public URL
 */
export async function deleteFromR2(keyOrUrl: string): Promise<boolean> {
  if (!isR2Configured || !keyOrUrl) return false;

  const key =
    publicDomain && keyOrUrl.startsWith(publicDomain)
      ? keyOrUrl.slice(publicDomain.length).replace(/^\/+/, "")
      : keyOrUrl.replace(/^\/+/, "");

  if (!key) return false;

  try {
    await r2Client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      })
    );
    return true;
  } catch (err) {
    console.warn("deleteFromR2 error:", err);
    return false;
  }
}

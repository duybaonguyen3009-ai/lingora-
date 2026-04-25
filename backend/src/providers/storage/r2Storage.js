/**
 * r2Storage.js
 *
 * Cloudflare R2 storage provider (S3-compatible API).
 *
 * Required environment variables:
 *   R2_ACCOUNT_ID        – Cloudflare account ID
 *   R2_ACCESS_KEY_ID     – R2 API token access key
 *   R2_SECRET_ACCESS_KEY – R2 API token secret
 *   R2_BUCKET_NAME       – Bucket name (default: "lingora-audio")
 *   R2_PUBLIC_URL        – Public bucket URL for download links (optional)
 *
 * CORS: The R2 bucket must be configured to allow PUT requests from
 * the frontend origin. Configure via Cloudflare dashboard:
 *   AllowedOrigins: ["https://your-frontend.com"]
 *   AllowedMethods: ["PUT", "GET"]
 *   AllowedHeaders: ["Content-Type"]
 *   MaxAgeSeconds: 3600
 *
 * Install dependencies:
 *   npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
 */

const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET_NAME = process.env.R2_BUCKET_NAME || "lingora-audio";
const PUBLIC_URL = process.env.R2_PUBLIC_URL; // e.g. "https://audio.lingora.app"

if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
  throw new Error(
    "[r2Storage] Missing required env vars: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY"
  );
}

const client = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

/**
 * Generate a pre-signed PUT URL for uploading an object.
 *
 * @param {string} key              – object key, e.g. "audio/user-123/abc.webm"
 * @param {string} contentType      – MIME type, e.g. "audio/webm"
 * @param {number} [expiresInSeconds=300] – URL validity window
 * @returns {Promise<{ uploadUrl: string, publicUrl: string }>}
 */
async function generateUploadUrl(key, contentType, expiresInSeconds = 300) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });

  // Public URL for direct access (if R2 public access is enabled)
  const publicUrl = PUBLIC_URL
    ? `${PUBLIC_URL}/${key}`
    : uploadUrl.split("?")[0]; // fallback: unsigned URL (won't work without public access)

  return { uploadUrl, publicUrl };
}

/**
 * Generate a pre-signed GET URL for downloading an object.
 *
 * @param {string} key
 * @param {number} [expiresInSeconds=300]
 * @returns {Promise<string>} pre-signed GET URL
 */
async function generateDownloadUrl(key, expiresInSeconds = 300) {
  // If public URL is configured, use it directly (no signing needed)
  if (PUBLIC_URL) {
    return `${PUBLIC_URL}/${key}`;
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

/**
 * Delete an object from the bucket.
 *
 * @param {string} key
 * @returns {Promise<void>}
 */
async function deleteObject(key) {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await client.send(command);
}

/**
 * Upload a buffer / typed array / readable stream directly to R2 from the
 * server. Used by seed scripts and back-office tooling (e.g. Listening seed)
 * where we don't want to round-trip a presigned URL through a browser.
 *
 * Keys are stored verbatim — callers are responsible for the prefix
 * convention (e.g. "listening/cam07/test3/part1.mp3").
 *
 * @param {string} key
 * @param {Buffer|Uint8Array|import("stream").Readable} body
 * @param {string} contentType
 * @returns {Promise<{ key: string }>}
 */
async function uploadObject(key, body, contentType) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await client.send(command);

  return { key };
}

module.exports = {
  generateUploadUrl,
  generateDownloadUrl,
  deleteObject,
  uploadObject,
};

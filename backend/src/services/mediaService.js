/**
 * mediaService.js
 *
 * Generates pre-signed upload/download URLs via the active storage provider.
 * Domain-agnostic — any module that needs to upload files uses this service.
 */

const crypto = require("crypto");
const { createStorageProvider } = require("../providers/storage/storageProvider");

const storage = createStorageProvider();

/**
 * Generate a pre-signed upload URL for an audio recording.
 *
 * @param {string} userId
 * @param {string} promptId    – speaking_prompt.id, used in the storage key path
 * @param {string} [contentType="audio/webm"]
 * @returns {Promise<{ uploadUrl: string, storageKey: string }>}
 */
async function getUploadUrl(userId, promptId, contentType = "audio/webm") {
  const fileId = crypto.randomUUID();
  const ext = contentType === "audio/webm" ? "webm" : "bin";
  const storageKey = `audio/${userId}/${promptId}/${fileId}.${ext}`;

  const { uploadUrl } = await storage.generateUploadUrl(storageKey, contentType, 300);

  return { uploadUrl, storageKey };
}

/**
 * Get a download URL for a stored object.
 *
 * @param {string} storageKey
 * @returns {Promise<string>}
 */
async function getDownloadUrl(storageKey) {
  return storage.generateDownloadUrl(storageKey, 300);
}

module.exports = {
  getUploadUrl,
  getDownloadUrl,
};

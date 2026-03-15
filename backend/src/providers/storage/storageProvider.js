/**
 * storageProvider.js
 *
 * Factory that returns the active storage provider based on STORAGE_PROVIDER env.
 *
 * ─── Provider interface ───
 *
 * Every storage provider must export an object with these methods:
 *
 *   generateUploadUrl(key, contentType, expiresInSeconds)
 *     @param {string} key              – object key, e.g. "audio/user-123/abc.webm"
 *     @param {string} contentType      – MIME type, e.g. "audio/webm"
 *     @param {number} [expiresInSeconds=300] – URL validity window
 *     @returns {Promise<{ uploadUrl: string, publicUrl: string }>}
 *
 *   generateDownloadUrl(key, expiresInSeconds)
 *     @param {string} key
 *     @param {number} [expiresInSeconds=300]
 *     @returns {Promise<string>}  – pre-signed GET URL
 *
 *   deleteObject(key)
 *     @param {string} key
 *     @returns {Promise<void>}
 */

let _provider = null;

function createStorageProvider() {
  if (_provider) return _provider;

  const provider = process.env.STORAGE_PROVIDER || "mock";

  switch (provider) {
    case "r2":
      _provider = require("./r2Storage");
      break;
    case "mock":
    default:
      _provider = require("./mockStorage");
      break;
  }

  return _provider;
}

module.exports = { createStorageProvider };

/**
 * speechProvider.js
 *
 * Factory that returns the active speech provider based on SPEECH_PROVIDER env.
 *
 * ─── Provider interface ───
 *
 * Every speech provider must export an object with this method:
 *
 *   assessPronunciation(audioUrl, referenceText, language)
 *     @param {string} audioUrl       – publicly accessible URL to the audio file
 *     @param {string} referenceText  – the expected utterance
 *     @param {string} [language="en-US"] – BCP-47 language code
 *     @returns {Promise<PronunciationResult>}
 *
 *   PronunciationResult = {
 *     overallScore:       number,   // 0-100
 *     accuracyScore:      number,   // 0-100
 *     fluencyScore:       number,   // 0-100
 *     completenessScore:  number,   // 0-100
 *     pronunciationScore: number,   // 0-100
 *     words: [
 *       {
 *         word:     string,
 *         score:    number,         // 0-100
 *         phonemes: [
 *           { phoneme: string, score: number, offset: number, duration: number }
 *         ]
 *       }
 *     ]
 *   }
 */

let _provider = null;

function createSpeechProvider() {
  if (_provider) return _provider;

  const provider = process.env.SPEECH_PROVIDER || "mock";

  switch (provider) {
    case "azure":
      _provider = require("./azureSpeech");
      break;
    case "mock":
    default:
      _provider = require("./mockSpeech");
      break;
  }

  return _provider;
}

module.exports = { createSpeechProvider };

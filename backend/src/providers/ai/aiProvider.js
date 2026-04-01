/**
 * aiProvider.js
 *
 * Factory that returns the active AI provider based on AI_PROVIDER env.
 *
 * --- Provider interface ---
 *
 * Every AI provider must export an object with these methods:
 *
 *   generateResponse(systemPrompt, conversationHistory, options)
 *     @param {string} systemPrompt       - scenario system prompt
 *     @param {Array}  conversationHistory - array of { role, content }
 *     @param {object} [options]           - e.g. { category }
 *     @returns {Promise<string>}
 *
 *   scoreConversation(systemPrompt, conversationHistory)
 *     @param {string} systemPrompt
 *     @param {Array}  conversationHistory
 *     @returns {Promise<object>} { overallScore, fluency, vocabulary, grammar, coachFeedback, turnFeedback }
 */

let _provider = null;

function createAiProvider() {
  if (_provider) return _provider;

  const provider = process.env.AI_PROVIDER || "mock";
  if (provider === "mock" && process.env.NODE_ENV === "production") {
    console.warn("[ai] WARNING: AI_PROVIDER is 'mock' in production. Users will receive fake AI responses.");
  }
  console.log(`[ai] Provider selected: "${provider}" (env AI_PROVIDER=${process.env.AI_PROVIDER || "(not set)"})`);

  switch (provider) {
    case "openai":
      _provider = require("./openaiProvider");
      break;
    case "mock":
    default:
      _provider = require("./mockAi");
      break;
  }

  return _provider;
}

module.exports = { createAiProvider };

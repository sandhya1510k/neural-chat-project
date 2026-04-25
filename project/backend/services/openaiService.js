/**
 * services/openaiService.js — OpenAI GPT integration
 * Abstracts all communication with the OpenAI API
 */

const OpenAI = require("openai");

// Initialize client (supports OpenAI and Groq via OpenAI-compatible SDK)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const SYSTEM_PROMPT = `You are a helpful, intelligent AI assistant. 
You provide clear, accurate, and concise responses. 
When asked about code, provide well-commented examples. 
Be conversational but professional.`;

/**
 * Send a message to OpenAI and get a response
 * @param {Array} messageHistory - Array of { role, content } objects
 * @param {String} userMessage - The latest user message
 * @returns {Object} { content, tokens }
 */
const getChatCompletion = async (messageHistory, userMessage) => {
  // Build the messages array for OpenAI (include history for context)
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    // Include up to last 20 messages for context window management
    ...messageHistory.slice(-20).map((msg) => ({
      role: msg.role === "bot" ? "assistant" : "user",
      content: msg.text,
    })),
    { role: "user", content: userMessage },
  ];

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "llama3-8b-8192",
    messages,
    max_tokens: 1000,
    temperature: 0.7,
    stream: false,
  });

  const botMessage = response.choices[0].message.content;
  const tokensUsed = response.usage?.total_tokens || 0;

  return {
    content: botMessage,
    tokens: tokensUsed,
  };
};

module.exports = { getChatCompletion };

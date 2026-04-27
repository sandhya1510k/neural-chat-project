const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const SYSTEM_PROMPT = `You are a helpful, intelligent AI assistant.
You provide clear, accurate, and concise responses.
When asked about code, provide well-commented examples.
Be conversational but professional.`;

const buildMessages = (messageHistory, userMessage) => [
  { role: "system", content: SYSTEM_PROMPT },
  ...messageHistory.slice(-20).map((msg) => ({
    role: msg.role === "bot" ? "assistant" : "user",
    content: msg.text,
  })),
  { role: "user", content: userMessage },
];

const getChatCompletion = async (messageHistory, userMessage) => {
  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "llama3-8b-8192",
    messages: buildMessages(messageHistory, userMessage),
    max_tokens: 1000,
    temperature: 0.7,
    stream: false,
  });

  return {
    content: response.choices[0].message.content,
    tokens: response.usage?.total_tokens || 0,
  };
};

/**
 * Streaming completion — calls onToken(chunk) for each text delta,
 * resolves with { content, tokens } when the stream ends.
 */
const getChatCompletionStream = async (messageHistory, userMessage, onToken) => {
  const stream = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "llama3-8b-8192",
    messages: buildMessages(messageHistory, userMessage),
    max_tokens: 1000,
    temperature: 0.7,
    stream: true,
  });

  let fullText = "";
  let tokens = 0;

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      fullText += delta;
      onToken(delta);
    }
    if (chunk.usage) {
      tokens = chunk.usage.total_tokens || 0;
    }
  }

  // Groq doesn't always return usage in stream mode; estimate from output length
  if (tokens === 0) tokens = Math.ceil(fullText.length / 4);

  return { content: fullText, tokens };
};

module.exports = { getChatCompletion, getChatCompletionStream };

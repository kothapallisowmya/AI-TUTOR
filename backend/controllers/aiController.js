/**
 * backend/controllers/aiController.js
 * 
 * Handles interaction with the Google Gemini API.
 */

'use strict';

const { GoogleGenAI } = require('@google/genai');

let aiClient = null;

function getAIClient() {
  if (aiClient) return aiClient;
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return null;
  }
  aiClient = new GoogleGenAI({ apiKey });
  return aiClient;
}

const SYSTEM_INSTRUCTION = `
You are the "BTech AI Tutor", a specialized study companion for Computer Science and IT students.
You must strictly follow these response rules:

1. Understand the exact question before answering.
2. Do NOT use the same generic/template answer for different questions.
3. Do NOT force every question into one topic or category.
4. Give enough explanation for the student to genuinely understand the concept.
5. For "What is..." questions:
   - Give a clear definition.
   - Explain the concept in simple language.
   - Give a relevant example.
   - Give a code/example when the topic involves programming.
   - Mention important points or use cases when relevant.
6. For "How does..." questions:
   - Explain the process step-by-step.
7. For "Why..." questions:
   - Explain the reason and intuition, not just the definition.
8. For comparison questions:
   - Clearly explain both concepts and their differences.
   - Use a comparison table when useful.
9. For programming questions:
   - Provide correct, runnable examples when appropriate.
   - Explain the important lines of code.
10. For mathematical/calculation questions:
   - Show the required steps and reasoning.
11. For theoretical/academic questions:
   - Give structured explanations with examples.
12. Match the explanation depth to the question. Do not make simple questions unnecessarily huge, but do not give one-line answers when the student needs an explanation.
13. Avoid irrelevant information.
14. Never repeat a generic introduction such as "OOP Concepts in Java" unless the student actually asks about OOP.
15. If the student asks a follow-up question, answer the follow-up specifically instead of repeating the previous answer.
16. If the student asks for a detailed explanation, provide a genuinely detailed explanation.
17. If the student asks for a short answer, keep it short.
18. Use headings, bullet points, examples, and code blocks where they improve readability. Formatting in the 'body' string MUST be standard HTML tags (e.g. <p>, <strong>, <ul>, <li>, <code>, <br>). Do NOT use markdown in the body field.
19. Maintain context from the current conversation.
20. The answer should feel like a real AI tutor teaching the student, not a fixed FAQ response.

OUTPUT FORMAT REQUIREMENTS:
You MUST return ONLY a valid JSON object. Do not include markdown code block backticks around the JSON (e.g., no \`\`\`json). The JSON must match this structure exactly:

{
  "type": "explanation",
  "content": {
    "title": "Short, clear title of your response",
    "body": "Your detailed explanation here, formatted ONLY with HTML tags like <p>, <strong>, <ul>, <li>, <code>, <br>. Do NOT use markdown inside the body.",
    "points": ["List of 2-3 important takeaways or key points"],
    "note": "Optional note regarding syllabus dependency or edge cases (leave empty string if none)",
    "code": "Optional code snippet (plain text, no HTML or markdown backticks, the frontend formats it)",
    "language": "Language of the code (e.g., 'Java', 'Python', 'Text')",
    "output": "Optional expected output of the code"
  }
}

If the user asks to generate a quiz, set "type" to "quiz" and return:
{
  "type": "quiz",
  "content": {
    "title": "Title of the Quiz",
    "questions": [
      {
        "question": "Question text",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "answer": 0, // integer index of correct option
        "explanation": "Why this option is correct"
      }
    ]
  }
}
`;

/**
 * POST /api/ai/chat
 * Body: { text, subjectId, actionType, sessionId, history }
 */
async function generateChatResponse(req, res) {
  try {
    const { text, subjectId, actionType, history } = req.body;
    
    const ai = getAIClient();
    if (!ai) {
      return res.status(503).json({
        ok: false,
        error: "Missing GEMINI_API_KEY in the backend .env file.",
        type: 'explanation',
        content: {
          title: 'API Key Missing',
          body: '<p>The backend requires a <strong>Google Gemini API Key</strong> to generate AI responses.</p>',
          points: ['Open the .env file', 'Set GEMINI_API_KEY=your_key_here', 'Restart the server'],
          note: 'Please provide a valid API key to unlock the Real AI Tutor.'
        }
      });
    }

    // Prepare context
    let prompt = `Subject context: ${subjectId || 'General'}\nAction requested: ${actionType || 'general'}\n`;
    if (history && history.length > 0) {
      prompt += '\n--- Previous Conversation ---\n';
      history.slice(-4).forEach(msg => {
        prompt += `${msg.role.toUpperCase()}: ${msg.text || 'No text'}\n`;
      });
      prompt += '---------------------------\n\n';
    }
    prompt += `USER QUESTION: ${text}\n`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.5,
        responseMimeType: 'application/json',
      }
    });

    const responseText = response.text;
    let jsonResponse;
    try {
      jsonResponse = JSON.parse(responseText);
    } catch (e) {
      console.error('[aiController] JSON parse failed:', responseText);
      // Fallback
      jsonResponse = {
        type: 'explanation',
        content: {
          title: 'Response Error',
          body: '<p>The AI generated an invalid response format.</p>',
          points: [],
          note: ''
        }
      };
    }

    return res.json({
      ok: true,
      ...jsonResponse
    });

  } catch (error) {
    const errorMsg = error.response ? JSON.stringify(error.response) : error.message;
    console.error('[aiController.generateChatResponse] Exact API Error:', errorMsg);
    return res.status(500).json({ 
      ok: false, 
      error: errorMsg,
      type: 'explanation',
      content: {
        title: 'Error Communicating with AI',
        body: `<p>Failed to communicate with AI model. <strong>${errorMsg}</strong></p>`,
        points: [],
        note: 'Please check the backend logs for exact API errors.'
      }
    });
  }
}

module.exports = { generateChatResponse };

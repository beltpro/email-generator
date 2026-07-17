// ============================================================
// WHAT THIS FILE DOES, IN PLAIN LANGUAGE
// ============================================================
// This is a small web server. Its only job is to sit between
// your webpage (the frontend) and Claude, and do three things:
//
//   1. Listen for a request from the webpage that contains a
//      product description.
//   2. Send that description to Claude, along with instructions
//      to write a 5-email sales sequence.
//   3. Send Claude's answer back to the webpage as JSON, so the
//      page can display it.
//
// Your Claude API key lives only here, on the server, and is
// never sent to the browser. That's the whole reason this
// backend exists.
// ============================================================

// ---- 1. Load the tools we need ----
// "require" pulls in code that other people have already written,
// so we don't have to build everything from scratch.

// Loads the ANTHROPIC_API_KEY from your .env file into process.env,
// so the rest of this file can read it.
require('dotenv').config();

// Express is the library that lets us create a web server and
// define "routes" (URLs the frontend can send requests to).
const express = require('express');

// CORS is a browser security rule. By default, a webpage running
// on one address (e.g. a file on your computer, or a different
// port) is blocked from talking to a server on another address.
// This package turns that off for our own server, so your
// frontend is allowed to call it.
const cors = require('cors');
const path = require('path');

// This is Anthropic's official library for talking to Claude
// from server-side code like this.
const Anthropic = require('@anthropic-ai/sdk');

// ---- 2. Set up the server and the Claude client ----

const app = express();
const PORT = process.env.PORT || 3000;

// This creates a reusable connection to the Claude API, already
// configured with your secret key from the .env file.
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Let the server understand JSON data sent from the frontend.
app.use(express.json());

// Allow requests from the browser (see CORS note above).
app.use(cors());
app.use(express.static(__dirname));
console.log("Serving files from:", __dirname);

// The 5 fixed stages of the sequence, in order. We reuse this
// both to tell Claude what to write, and to double check its
// answer has the right shape before we send it back.
const SEQUENCE_STAGES = [
  'Introduction',
  'Benefits',
  'Objection Handling',
  'Urgency',
  'Final Call to Action',
];

// ---- 3. The actual endpoint the frontend will call ----
//
// "POST /api/generate-email-sequence" means: when the frontend
// sends a POST request to this exact address, run the function
// below.
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'email-sequence-generator.html'));
});

app.post('/api/generate-email-sequence', async (req, res) => {
  try {
    // req.body is the JSON the frontend sent us. We expect it to
    // look like: { "description": "..." }
    const { description } = req.body;

    // Basic safety check: make sure a description was actually sent.
    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ error: 'A product description is required.' });
    }

    // This is the instruction set we give Claude. It explains the
    // task, the required structure, the tone, and importantly, the
    // exact JSON format we want back, so our server can read it
    // reliably.
    const systemPrompt = `You are an expert email marketer. You write 5-email sales sequences for products, based on a short product description.

The sequence must always have exactly 5 emails, in this order:
1. Introduction
2. Benefits
3. Objection Handling
4. Urgency
5. Final Call to Action

Tone: professional but warm. Write like a helpful person, not a hard-sell salesperson.

Respond with ONLY valid JSON, and nothing else - no preamble, no markdown code fences, no explanation. The JSON must be an array of exactly 5 objects, in this exact shape:

[
  { "stage": "Introduction", "subject": "...", "body": "..." },
  { "stage": "Benefits", "subject": "...", "body": "..." },
  { "stage": "Objection Handling", "subject": "...", "body": "..." },
  { "stage": "Urgency", "subject": "...", "body": "..." },
  { "stage": "Final Call to Action", "subject": "...", "body": "..." }
]`;

    // This is the actual request to Claude: which model to use,
    // how long the answer is allowed to be, the instructions
    // above, and the user's product description.
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Product description:\n\n${description}`,
        },
      ],
    });

   // Claude's reply comes back as a list of content blocks. Some
    // models include other block types (like "thinking") before
    // the actual answer, so instead of assuming the answer is the
    // very first block, we search for the block whose type is "text".
    const textBlock = message.content.find((block) => block.type === 'text');

    if (!textBlock) {
      console.error('No text block found in Claude response:', JSON.stringify(message.content, null, 2));
      return res.status(502).json({ error: 'Claude did not return a text response. Please try again.' });
    }

    const rawText = textBlock.text;

    // Claude was told to reply with only JSON, but models
    // sometimes add stray text or code fences around it anyway.
    // This strips those out before we try to parse it.
    const cleanedText = rawText.replace(/```json|```/g, '').trim();

    let emails;
    try {
      emails = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Could not parse Claude response as JSON:', rawText);
      return res.status(502).json({ error: 'Claude returned an unexpected format. Please try again.' });
    }

    // A quick sanity check: did we actually get 5 emails back?
    if (!Array.isArray(emails) || emails.length !== 5) {
      console.error('Unexpected email count from Claude:', emails);
      return res.status(502).json({ error: 'Claude did not return 5 emails. Please try again.' });
    }

    // Send the emails back to the frontend as JSON.
    res.json({ emails });

  } catch (error) {
    // If anything above throws an error (e.g. the Claude API call
    // fails, or the API key is missing/invalid), we land here.
    console.error('Error generating email sequence:', error);
    res.status(500).json({ error: 'Something went wrong while generating the email sequence.' });
  }
});

// ---- 4. Start the server ----
// This makes the server actually start listening for requests.

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
  console.log(`Frontend should send requests to http://localhost:${PORT}/api/generate-email-sequence`);
});

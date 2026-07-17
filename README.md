# Email Sequence Backend — Setup Guide

This is a small server that connects your webpage to Claude. It receives a
product description, asks Claude to write a 5-email sales sequence, and
sends the result back. No prior backend experience needed — just follow
the steps in order.

## What you need to install first

### 1. Node.js
Node.js is the program that lets your computer run JavaScript outside the
browser — it's what runs this server.

- Go to https://nodejs.org
- Download and install the **LTS** version (the one recommended for most
  people)
- To check it worked, open a terminal (Terminal on Mac, Command Prompt or
  PowerShell on Windows) and run:

  ```
  node -v
  ```

  You should see a version number like `v20.11.0`. If you see an error
  instead, the install didn't work — try again or restart your computer.

### 2. An Anthropic API key
This is your personal password that lets your server talk to Claude.

- Go to https://console.anthropic.com
- Sign up or log in
- Find the "API Keys" section and create a new key
- Copy it somewhere safe — you'll need it in step 3 below

## Setting up the project

### 1. Open a terminal in this folder
Navigate into the `email-sequence-backend` folder using `cd`, for example:

```
cd path/to/email-sequence-backend
```

### 2. Install the project's dependencies
Dependencies are pre-built pieces of code this project relies on (like the
Express web server, and Anthropic's library for talking to Claude). Run:

```
npm install
```

This downloads everything listed in `package.json` into a new folder
called `node_modules`. This can take a minute the first time.

### 3. Add your API key
- Find the file called `.env.example` in this folder
- Make a copy of it and rename the copy to `.env` (just `.env`, nothing
  after it)
- Open `.env` in a text editor and replace `your-api-key-goes-here` with
  the real key you copied earlier, so it looks like:

  ```
  ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
  ```

- Save the file

**Important:** never share your `.env` file or upload it anywhere public
(like GitHub). It contains your real key.

## Running the server

In the terminal, from inside this folder, run:

```
npm start
```

If it worked, you'll see something like:

```
Server is running at http://localhost:3000
Frontend should send requests to http://localhost:3000/api/generate-email-sequence
```

That means your backend is now running and listening for requests. Leave
this terminal window open — closing it stops the server.

## Connecting your frontend

Your webpage needs to send its request to:

```
http://localhost:3000/api/generate-email-sequence
```

The frontend I built you already has this wired up — as long as this
server is running (`npm start`), opening the webpage and clicking
"Generate Email Sequence" will call this backend automatically.

## How to test it without the frontend (optional)

If you want to check the backend works on its own, you can run this in a
second terminal window (keep the server running in the first one):

```
curl -X POST http://localhost:3000/api/generate-email-sequence \
  -H "Content-Type: application/json" \
  -d '{"description": "A reusable water bottle that keeps drinks cold for 24 hours"}'
```

You should get back a JSON response with 5 emails after a few seconds.

## Common problems

- **"command not found: npm"** — Node.js isn't installed correctly. Revisit
  the Node.js install step.
- **Server starts but requests fail with an authentication error** — double
  check your `.env` file has the correct key and is named exactly `.env`.
- **"Something went wrong while generating the email sequence"** — check
  the terminal running the server for a more detailed error message printed
  there.
- **Port 3000 already in use** — another program is using that port. Close
  it, or change `const PORT = 3000;` near the top of `server.js` to a
  different number like `3001` (and update the frontend's fetch URL to
  match).

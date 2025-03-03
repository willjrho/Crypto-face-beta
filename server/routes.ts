import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertMessageSchema } from "@shared/schema";
import fetch from "node-fetch"; // or "cross-fetch"

export async function registerRoutes(app: Express) {
  // Existing endpoints ----------------------------------------
  app.get("/api/messages", async (_req, res) => {
    const messages = await storage.getMessages();
    res.json(messages);
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const data = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage(data);
      res.json(message);
    } catch (error) {
      res.status(400).json({ error: "Invalid message data" });
    }
  });

  // NEW ENDPOINT: parseTransaction ----------------------------
  app.post("/api/parseTransaction", async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "Missing or invalid prompt" });
      }

      // 1) Call your Python Repl API:
      const pythonUrl = "https://cryptoface-api-willjrhodes20.replit.app/agent";
      const parseResp = await fetch(pythonUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!parseResp.ok) {
        const errTxt = await parseResp.text();
        return res
          .status(parseResp.status)
          .json({ error: `Python parse error: ${errTxt.slice(0, 200)}` });
      }

      // 2) Return the JSON from Python to the front end
      const parseData = await parseResp.json();
      // parseData typically: { done: true, messages: [...], parsed: {...} }

      res.json(parseData);
    } catch (err) {
      console.error("Error in /api/parseTransaction:", err);
      res.status(500).json({ error: "Internal parseTransaction error." });
    }
  });

  // Return the HTTP server for your index.ts to use
  return createServer(app);
}

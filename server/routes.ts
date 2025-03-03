import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertMessageSchema } from "@shared/schema";
import fetch from "node-fetch";

export async function registerRoutes(app: Express) {
  // existing routes
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

  // NEW parseTransaction route
  app.post("/api/parseTransaction", async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt || typeof prompt !== "string") {
        console.log("[DEBUG] Missing or invalid prompt. Body:", req.body);
        return res.status(400).json({ error: "Missing or invalid prompt" });
      }

      console.log("[DEBUG /api/parseTransaction] Received prompt:", prompt);

      // Call your Python API
      const pythonUrl = "https://cryptoface-api-willjrhodes20.replit.app/agent";
      const fetchResp = await fetch(pythonUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      console.log("[DEBUG /api/parseTransaction] pythonUrl:", pythonUrl);
      console.log("[DEBUG /api/parseTransaction] fetchResp status:", fetchResp.status);

      if (!fetchResp.ok) {
        const errTxt = await fetchResp.text();
        console.log("[DEBUG /api/parseTransaction] Python parse error:", errTxt);
        return res.status(fetchResp.status).json({ error: errTxt });
      }

      // Parse the JSON from Python
      const parseData = await fetchResp.json();

      console.log("[DEBUG /api/parseTransaction] parseData from Python:", parseData);

      // Return the parse data to the front end
      return res.json(parseData);

    } catch (err) {
      console.error("[ERROR /api/parseTransaction]", err);
      return res.status(500).json({ error: "Internal parseTransaction error." });
    }
  });

  return createServer(app);
}


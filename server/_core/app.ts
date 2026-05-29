import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerOpenAIAgentRoutes } from "./openaiAgents";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic } from "./vite";

export type CreateAppOptions = {
  serveClient?: boolean;
};

export function createApp(options: CreateAppOptions = {}) {
  const app = express();

  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    next();
  });

  app.use(express.json({ limit: process.env.BODY_LIMIT || "50mb" }));
  app.use(express.urlencoded({ limit: process.env.BODY_LIMIT || "50mb", extended: true }));

  app.get("/api/health", (_req, res) => {
    res.status(200).json({ ok: true, name: "lateen-notes", environment: process.env.NODE_ENV || "development" });
  });

  registerOAuthRoutes(app);
  registerOpenAIAgentRoutes(app);

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  if (options.serveClient) {
    serveStatic(app);
  }

  return app;
}

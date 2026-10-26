import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { atmosIdentityManifest } from "../identityManifest";
import { acceptAtmosReceipt, issueAtmosChallenge } from "../atmosDb";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.post("/v1/atmos/nodes/:nodeId/challenge", async (req, res) => {
    try {
      const result = await issueAtmosChallenge(req.params.nodeId);
      if (!result) return res.status(404).json({ error: "unknown_node" });
      return res.status(200).json(result);
    } catch (error) {
      console.error("[ATMOS] challenge issuance failed", error);
      return res.status(503).json({ error: "service_unavailable" });
    }
  });
  app.post("/v1/atmos/nodes/:nodeId/receipt", async (req, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      const required = ["challengeId", "nonce", "issuedAt", "expiresAt", "nodeVersion", "status", "capabilities", "signature"];
      if (required.some(field => typeof body[field] !== "string") || !Array.isArray(body.capabilities)) {
        return res.status(400).json({ error: "receipt_invalid", message: "Receipt fields are incomplete." });
      }
      if (!["ok", "degraded", "not_ready"].includes(body.status as string)) {
        return res.status(400).json({ error: "receipt_invalid", message: "Receipt status is unsupported." });
      }
      const result = await acceptAtmosReceipt({
        nodeId: req.params.nodeId,
        challengeId: body.challengeId as string,
        nonce: body.nonce as string,
        issuedAt: body.issuedAt as string,
        expiresAt: body.expiresAt as string,
        nodeVersion: body.nodeVersion as string,
        status: body.status as "ok" | "degraded" | "not_ready",
        capabilities: body.capabilities.filter((value): value is string => typeof value === "string"),
        signature: body.signature as string,
      });
      if (result.kind === "accepted") return res.status(201).json({ schema: "NEXINUS_ATMOS_RECEIPT_ACCEPTED/v1", accepted: true, nodeId: req.params.nodeId, applicationId: "root-identity", ...result });
      if (result.kind === "unknown_node") return res.status(404).json({ error: result.kind });
      if (result.kind === "replay") return res.status(409).json({ error: result.kind });
      return res.status(400).json({ error: result.kind });
    } catch (error) {
      console.error("[ATMOS] receipt processing failed", error);
      return res.status(503).json({ error: "service_unavailable" });
    }
  });
  app.get("/.well-known/atmos-identity.json", (_req, res) => {
    res
      .type("text/plain")
      .set("Cache-Control", "public, max-age=0, no-transform")
      .send(atmosIdentityManifest);
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);

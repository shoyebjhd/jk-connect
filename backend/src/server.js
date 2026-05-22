import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

import express from "express";
import cors from "cors";
import fs from "fs";
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

const possiblePaths = [
  path.join(__dirname, "../../frontend/dist"),
  path.join(process.cwd(), "../frontend/dist"),
  path.join(process.cwd(), "frontend/dist"),
];
let frontendDist = null;
for (const p of possiblePaths) {
  if (fs.existsSync(p)) { frontendDist = p; break; }
}
if (frontendDist) {
  console.log("Serving frontend from:", frontendDist);
  app.use(express.static(frontendDist));
} else {
  console.warn("Frontend dist not found at any of:", possiblePaths);
}

import authRoutes from "./routes/auth.js";
import projectRoutes from "./routes/projects.js";
import taskRoutes from "./routes/tasks.js";
import commentRoutes from "./routes/comments.js";
import timelogRoutes from "./routes/timelogs.js";
import invoiceRoutes from "./routes/invoices.js";
import clientRoutes from "./routes/clients.js";
import chatRoutes from "./routes/chat.js";
import networkRoutes from "./routes/network.js";
import userRoutes from "./routes/users.js";
import notificationRoutes from "./routes/notifications.js";
import uploadRoutes from "./routes/upload.js";
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/tasks/:taskId/comments", commentRoutes);
app.use("/api/timelogs", timelogRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/network", networkRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/upload", uploadRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

if (frontendDist) {
  app.get("*", (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
} else {
  app.get("*", (_req, res) => {
    const fallback = path.join(process.cwd(), "public/index.html");
    if (fs.existsSync(fallback)) return res.sendFile(fallback);
    res.status(200).send("Frontend not built yet. Run: cd frontend && npm run build");
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

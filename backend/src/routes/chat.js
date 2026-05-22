import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();
const generalRouter = Router();
const projectRouter = Router({ mergeParams: true });
const dmRouter = Router({ mergeParams: true });

const messageSchema = z.object({
  content: z.string().min(1).max(2000),
  attachmentUrl: z.string().optional(),
  attachmentName: z.string().optional(),
  attachmentType: z.string().optional(),
});

generalRouter.get("/", authenticate, async (req, res) => {
  try {
    const messages = await prisma.message.findMany({
      where: { projectId: null, connectionId: null },
      include: { author: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: "asc" },
      take: 100,
    });
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

function msgData(data) {
  return {
    content: data.content,
    ...(data.attachmentUrl && { attachmentUrl: data.attachmentUrl }),
    ...(data.attachmentName && { attachmentName: data.attachmentName }),
    ...(data.attachmentType && { attachmentType: data.attachmentType }),
  };
}

function notify(recipientId, title, message, link) {
  try {
    return prisma.notification.create({
      data: { userId: recipientId, type: "NEW_MESSAGE", title, message, link },
    });
  } catch {}
}

generalRouter.post("/", authenticate, async (req, res) => {
  try {
    const data = messageSchema.parse(req.body);
    const message = await prisma.message.create({
      data: { ...msgData(data), authorId: req.user.userId, projectId: null },
      include: { author: { select: { id: true, name: true, role: true } } },
    });
    res.status(201).json(message);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

projectRouter.get("/", authenticate, async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);
    const messages = await prisma.message.findMany({
      where: { projectId },
      include: { author: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: "asc" },
      take: 100,
    });
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

projectRouter.post("/", authenticate, async (req, res) => {
  try {
    const data = messageSchema.parse(req.body);
    const projectId = Number(req.params.projectId);
    const message = await prisma.message.create({
      data: { ...msgData(data), authorId: req.user.userId, projectId },
      include: { author: { select: { id: true, name: true, role: true } } },
    });

    try {
      const project = await prisma.project.findUnique({ where: { id: projectId }, select: { freelancerId: true, clientId: true } });
      if (project) {
        const recipientId = req.user.userId === project.freelancerId ? project.clientId : project.freelancerId;
        await notify(recipientId, `New message in project chat`, `${req.user.name}: ${data.content.slice(0, 100)}`, `/chat/project/${projectId}`);
      }
    } catch {}

    res.status(201).json(message);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

dmRouter.get("/", authenticate, async (req, res) => {
  try {
    const connectionId = Number(req.params.connectionId);

    const conn = await prisma.connection.findUnique({ where: { id: connectionId } });
    if (!conn) return res.status(404).json({ error: "Connection not found" });
    if (conn.freelancerId !== req.user.userId && conn.clientId !== req.user.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const messages = await prisma.message.findMany({
      where: { connectionId },
      include: { author: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: "asc" },
      take: 100,
    });
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

dmRouter.post("/", authenticate, async (req, res) => {
  try {
    const data = messageSchema.parse(req.body);
    const connectionId = Number(req.params.connectionId);

    const conn = await prisma.connection.findUnique({ where: { id: connectionId } });
    if (!conn) return res.status(404).json({ error: "Connection not found" });
    if (conn.freelancerId !== req.user.userId && conn.clientId !== req.user.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const message = await prisma.message.create({
      data: { ...msgData(data), authorId: req.user.userId, connectionId },
      include: { author: { select: { id: true, name: true, role: true } } },
    });

    try {
      const recipientId = req.user.userId === conn.freelancerId ? conn.clientId : conn.freelancerId;
      await notify(recipientId, `New message from ${req.user.name}`, data.content.slice(0, 100), "/chat");
    } catch {}

    res.status(201).json(message);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.use("/general", generalRouter);
router.use("/project/:projectId", projectRouter);
router.use("/dm/:connectionId", dmRouter);

export default router;

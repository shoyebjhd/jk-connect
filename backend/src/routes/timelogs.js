import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { authenticate, requireFreelancer } from "../middleware/auth.js";

const router = Router();

const startSchema = z.object({
  projectId: z.number(),
  taskId: z.number().optional(),
  notes: z.string().optional(),
});

const manualSchema = z.object({
  taskId: z.number(),
  date: z.string().datetime(),
  durationMinutes: z.number().min(1),
  notes: z.string().optional(),
});

router.post("/start", authenticate, async (req, res) => {
  try {
    const data = startSchema.parse(req.body);

    const running = await prisma.timeLog.findFirst({
      where: { userId: req.user.userId, isRunning: true },
    });
    if (running) {
      return res.status(400).json({ error: "You already have a timer running. Stop it first." });
    }

    const timeLog = await prisma.timeLog.create({
      data: {
        startTime: new Date(),
        projectId: data.projectId,
        taskId: data.taskId ?? null,
        userId: req.user.userId,
        notes: data.notes,
        isRunning: true,
      },
      include: { task: { select: { title: true } }, project: { select: { name: true } } },
    });

    res.status(201).json(timeLog);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/stop/:id", authenticate, async (req, res) => {
  try {
    const timeLog = await prisma.timeLog.findFirst({
      where: { id: Number(req.params.id), userId: req.user.userId },
    });
    if (!timeLog) return res.status(404).json({ error: "Time log not found" });

    const endTime = new Date();
    const duration = Math.round((endTime - timeLog.startTime) / 60000);

    const updated = await prisma.timeLog.update({
      where: { id: timeLog.id },
      data: { endTime, duration, isRunning: false },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/manual", authenticate, async (req, res) => {
  try {
    const data = manualSchema.parse(req.body);

    const task = await prisma.task.findUnique({
      where: { id: data.taskId },
      include: { project: { select: { id: true } } },
    });
    if (!task) return res.status(404).json({ error: "Task not found" });

    const startTime = new Date(data.date);
    const endTime = new Date(startTime.getTime() + data.durationMinutes * 60000);

    const timeLog = await prisma.timeLog.create({
      data: {
        startTime,
        endTime,
        duration: data.durationMinutes,
        notes: data.notes,
        isRunning: false,
        isBilled: false,
        taskId: data.taskId,
        projectId: task.project.id,
        userId: req.user.userId,
      },
      include: {
        task: { select: { title: true } },
        project: { select: { name: true } },
      },
    });

    res.status(201).json(timeLog);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/running", authenticate, async (req, res) => {
  try {
    const timeLog = await prisma.timeLog.findFirst({
      where: { userId: req.user.userId, isRunning: true },
      include: {
        project: { select: { name: true } },
        task: { select: { title: true } },
      },
    });
    res.json(timeLog);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/all", authenticate, async (req, res) => {
  try {
    const { weekStart, weekEnd, clientId } = req.query;
    const where = { isRunning: false };

    if (req.user.role === "FREELANCER" && !clientId) {
      where.userId = req.user.userId;
    }

    if (clientId || req.user.role === "CLIENT") {
      where.project = { clientId: clientId ? Number(clientId) : req.user.userId };
    }

    if (weekStart || weekEnd) {
      where.endTime = {};
      if (weekStart) where.endTime.gte = new Date(weekStart);
      if (weekEnd) where.endTime.lte = new Date(weekEnd);
    }
    const logs = await prisma.timeLog.findMany({
      where,
      include: {
        task: { select: { title: true, project: { select: { name: true } } } },
        project: { select: { name: true } },
        user: { select: { name: true } },
      },
      orderBy: { endTime: "desc" },
    });
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/", authenticate, async (req, res) => {
  try {
    const projectId = Number(req.query.projectId);
    if (!projectId) return res.status(400).json({ error: "projectId is required" });

    const logs = await prisma.timeLog.findMany({
      where: {
        isRunning: false,
        isBilled: false,
        task: { projectId },
      },
      include: { task: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

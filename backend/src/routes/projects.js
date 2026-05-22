import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

const createSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  billingType: z.enum(["HOURLY", "FIXED"]),
  hourlyRate: z.number().optional(),
  fixedPrice: z.number().optional(),
  clientId: z.number().optional(),
  freelancerId: z.number().optional(),
});

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  billingType: z.enum(["HOURLY", "FIXED"]).optional(),
  hourlyRate: z.number().optional(),
  fixedPrice: z.number().optional(),
  isActive: z.boolean().optional(),
  clientId: z.number().optional(),
});

router.get("/", authenticate, async (req, res) => {
  try {
    const where =
      req.user.role === "CLIENT"
        ? { clientId: req.user.userId }
        : req.user.role === "FREELANCER"
          ? { freelancerId: req.user.userId }
          : {};
    const projects = await prisma.project.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, email: true } },
        freelancer: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(projects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", authenticate, async (req, res) => {
  try {
    const data = createSchema.parse(req.body);
    if (data.billingType === "HOURLY" && data.hourlyRate == null) {
      return res.status(400).json({ error: "Hourly rate is required for hourly billing" });
    }
    if (data.billingType === "FIXED" && data.fixedPrice == null) {
      return res.status(400).json({ error: "Fixed price is required for fixed billing" });
    }

    const project = await prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        billingType: data.billingType,
        hourlyRate: data.hourlyRate,
        fixedPrice: data.fixedPrice,
        clientId: req.user.role === "CLIENT" ? req.user.userId : data.clientId,
        freelancerId: req.user.role === "FREELANCER" ? req.user.userId : data.freelancerId,
      },
    });
    res.status(201).json(project);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", authenticate, async (req, res) => {
  try {
    const data = updateSchema.parse(req.body);
    const existing = await prisma.project.findUnique({ where: { id: Number(req.params.id) } });
    if (!existing) return res.status(404).json({ error: "Project not found" });
    if (existing.clientId !== req.user.userId && existing.freelancerId !== req.user.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const project = await prisma.project.update({
      where: { id: Number(req.params.id) },
      data,
    });

    try {
      const recipientId = req.user.userId === existing.freelancerId
        ? existing.clientId
        : existing.freelancerId;
      await prisma.notification.create({
        data: {
          userId: recipientId,
          type: "PROJECT_UPDATE",
          title: `"${existing.name}" was updated`,
          message: `${req.user.name} updated the project details`,
          link: `/projects`,
        },
      });
    } catch {}

    res.json(project);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id/report", authenticate, async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        client: { select: { name: true } },
        freelancer: { select: { name: true } },
      },
    });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const timeLogs = await prisma.timeLog.findMany({
      where: { projectId, isRunning: false },
    });
    const totalMinutes = timeLogs.reduce((sum, l) => sum + (l.duration || 0), 0);

    const invoices = await prisma.invoice.findMany({
      where: { status: "PAID", timeLogs: { some: { projectId } } },
    });
    const totalRevenue = invoices.reduce((sum, i) => sum + i.amount, 0);

    const tasks = await prisma.task.findMany({ where: { projectId } });
    const statusBreakdown = {};
    for (const t of tasks) {
      statusBreakdown[t.status] = (statusBreakdown[t.status] || 0) + 1;
    }

    res.json({
      projectName: project.name,
      clientName: project.client?.name,
      freelancerName: project.freelancer?.name,
      totalMinutes,
      totalRevenue,
      statusBreakdown,
      taskCount: tasks.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", authenticate, async (req, res) => {
  try {
    const existing = await prisma.project.findUnique({ where: { id: Number(req.params.id) } });
    if (!existing) return res.status(404).json({ error: "Project not found" });
    if (existing.clientId !== req.user.userId && existing.freelancerId !== req.user.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await prisma.project.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: "Project deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";

const TASK_STATUSES = ["PLANNING", "ONGOING", "HOLD", "COMPLETED", "DECLINED"];

const router = Router();

const createSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  dueDate: z.string().datetime().optional(),
  projectId: z.number(),
});

const updateSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  dueDate: z.string().datetime().optional(),
  projectId: z.number().optional(),
});

async function canAccessTask(userId, projectId) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  return project && (project.clientId === userId || project.freelancerId === userId);
}

async function canAccessTaskById(userId, taskId) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: { select: { clientId: true, freelancerId: true } } },
  });
  if (!task) return false;
  const p = task.project;
  return p.clientId === userId || p.freelancerId === userId;
}

router.get("/", authenticate, async (req, res) => {
  try {
    const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
    const clientId = req.query.clientId ? Number(req.query.clientId) : undefined;
    const freelancerId = req.query.freelancerId ? Number(req.query.freelancerId) : undefined;
    const statusFilter = req.query.status ? req.query.status.split(",").filter(Boolean) : undefined;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const where = {};

    if (projectId) where.projectId = projectId;
    if (clientId) where.project = { clientId };
    if (freelancerId) where.project = { ...where.project, freelancerId };
    if (statusFilter && statusFilter.length > 0) where.status = { in: statusFilter };

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          project: {
            select: {
              id: true, name: true,
              client: { select: { id: true, name: true } },
              freelancer: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.task.count({ where }),
    ]);

    res.json({ tasks, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", authenticate, async (req, res) => {
  try {
    const data = createSchema.parse(req.body);
    if (!(await canAccessTask(req.user.userId, data.projectId))) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const task = await prisma.task.create({ data });
    res.status(201).json(task);
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
    if (!(await canAccessTaskById(req.user.userId, Number(req.params.id)))) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const task = await prisma.task.update({
      where: { id: Number(req.params.id) },
      data: data.dueDate ? { ...data, dueDate: new Date(data.dueDate) } : data,
      include: {
        project: { select: { id: true, name: true, clientId: true, freelancerId: true } },
      },
    });

    try {
      const recipientId = req.user.userId === task.project.freelancerId
        ? task.project.clientId
        : task.project.freelancerId;
      const changedFields = Object.keys(data).join(", ");
      await prisma.notification.create({
        data: {
          userId: recipientId,
          type: "TASK_UPDATE",
          title: `Task "${task.title}" updated`,
          message: `${req.user.name} changed: ${changedFields}`,
          link: `/tasks?projectId=${task.project.id}&taskId=${task.id}`,
        },
      });
    } catch {}

    res.json(task);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", authenticate, async (req, res) => {
  try {
    if (!(await canAccessTaskById(req.user.userId, Number(req.params.id)))) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await prisma.task.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: "Task deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

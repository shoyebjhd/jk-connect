import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";

const router = Router({ mergeParams: true });

const createSchema = z.object({
  content: z.string().min(1).max(2000),
  attachmentUrl: z.string().optional(),
  attachmentName: z.string().optional(),
  attachmentType: z.string().optional(),
});

router.get("/", authenticate, async (req, res) => {
  try {
    const taskId = Number(req.params.taskId);
    const comments = await prisma.comment.findMany({
      where: { taskId },
      include: { author: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: "asc" },
    });
    res.json(comments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", authenticate, async (req, res) => {
  try {
    const data = createSchema.parse(req.body);
    const comment = await prisma.comment.create({
      data: {
        content: data.content,
        taskId: Number(req.params.taskId),
        authorId: req.user.userId,
        ...(data.attachmentUrl && { attachmentUrl: data.attachmentUrl }),
        ...(data.attachmentName && { attachmentName: data.attachmentName }),
        ...(data.attachmentType && { attachmentType: data.attachmentType }),
      },
      include: { author: { select: { id: true, name: true, role: true } } },
    });

    // Notify the other project participant
    try {
      const task = await prisma.task.findUnique({
        where: { id: Number(req.params.taskId) },
        include: { project: { select: { id: true, name: true, clientId: true, freelancerId: true } } },
      });
      if (task) {
        const recipientId = req.user.userId === task.project.freelancerId
          ? task.project.clientId
          : task.project.freelancerId;
        await prisma.notification.create({
          data: {
            userId: recipientId,
            type: "TASK_COMMENT",
            title: `New comment on "${task.title}"`,
            message: `${req.user.name}: ${data.content.slice(0, 100)}${data.content.length > 100 ? "..." : ""}`,
            link: `/tasks?projectId=${task.project.id}&taskId=${task.id}`,
          },
        });
      }
    } catch {}

    res.status(201).json(comment);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

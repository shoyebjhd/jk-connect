import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { authenticate, requireFreelancer } from "../middleware/auth.js";

const router = Router();

const generateSchema = z.object({
  clientId: z.number(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  fromAddress: z.string().optional(),
  toAddress: z.string().optional(),
  notes: z.string().optional(),
});

const updateSchema = z.object({
  status: z.enum(["PAID", "UNPAID", "CANCELLED"]),
});

const editSchema = z.object({
  fromAddress: z.string().nullable().optional(),
  toAddress: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

router.post("/generate", authenticate, requireFreelancer, async (req, res) => {
  try {
    const data = generateSchema.parse(req.body);
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);

    const client = await prisma.user.findUnique({ where: { id: data.clientId } });
    if (!client || client.role !== "CLIENT") {
      return res.status(400).json({ error: "Invalid client" });
    }

    const timeLogsToBill = await prisma.timeLog.findMany({
      where: {
        isBilled: false,
        isRunning: false,
        startTime: { gte: start },
        endTime: { lte: end },
        project: { clientId: data.clientId },
      },
      include: {
        task: { select: { title: true } },
        project: { select: { name: true, hourlyRate: true, id: true } },
      },
    });

    if (timeLogsToBill.length === 0) {
      return res.status(400).json({ error: "No unbilled hours found for this client in the given date range" });
    }

    let amount = 0;
    for (const log of timeLogsToBill) {
      const hours = (log.duration || 0) / 60;
      amount += hours * (log.project.hourlyRate || 0);
    }
    amount = Math.round(amount * 100) / 100;

    const count = await prisma.invoice.count();
    const now = new Date();
    const month = now.toLocaleString("en-US", { month: "short" }).toUpperCase();
    const year = now.getFullYear();
    const invoiceNumber = `INV-${month}-${year}-${String(count + 1).padStart(3, "0")}`;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        billingType: "HOURLY",
        amount,
        startDate: start,
        endDate: end,
        fromAddress: data.fromAddress,
        toAddress: data.toAddress,
        notes: data.notes,
        clientId: data.clientId,
      },
    });

    if (timeLogsToBill.length > 0) {
      await prisma.timeLog.updateMany({
        where: { id: { in: timeLogsToBill.map((l) => l.id) } },
        data: { isBilled: true, invoiceId: invoice.id },
      });
    }

    const fullInvoice = await prisma.invoice.findUnique({
      where: { id: invoice.id },
      include: {
        client: { select: { id: true, name: true } },
        timeLogs: {
          include: {
            task: { select: { title: true } },
            project: { select: { name: true, hourlyRate: true } },
          },
        },
      },
    });

    res.status(201).json(fullInvoice);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/", authenticate, async (req, res) => {
  try {
    const where = {};

    if (req.user.role === "CLIENT") {
      where.clientId = req.user.userId;
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        timeLogs: {
          include: {
            task: { select: { title: true } },
            project: { select: { name: true, hourlyRate: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(invoices);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", authenticate, async (req, res) => {
  try {
    const data = updateSchema.parse(req.body);
    const existing = await prisma.invoice.findUnique({ where: { id: Number(req.params.id) } });
    if (!existing) return res.status(404).json({ error: "Invoice not found" });

    if (existing.clientId !== req.user.userId && req.user.role !== "FREELANCER") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const invoice = await prisma.invoice.update({
      where: { id: Number(req.params.id) },
      data: { status: data.status },
    });
    res.json(invoice);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", authenticate, requireFreelancer, async (req, res) => {
  try {
    const data = editSchema.parse(req.body);
    const invoice = await prisma.invoice.update({
      where: { id: Number(req.params.id) },
      data: {
        ...(data.fromAddress !== undefined && { fromAddress: data.fromAddress }),
        ...(data.toAddress !== undefined && { toAddress: data.toAddress }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });
    res.json(invoice);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", authenticate, requireFreelancer, async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({ where: { id: Number(req.params.id) } });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    await prisma.timeLog.updateMany({
      where: { invoiceId: Number(req.params.id) },
      data: { invoiceId: null, isBilled: false },
    });

    await prisma.invoice.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: "Invoice deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

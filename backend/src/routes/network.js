import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

const inviteSchema = z.object({
  email: z.string().email(),
  targetRole: z.enum(["FREELANCER", "CLIENT"]),
});

router.post("/invite", authenticate, async (req, res) => {
  try {
    const data = inviteSchema.parse(req.body);
    data.email = data.email.toLowerCase();

    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (!existingUser) {
      return res.status(400).json({ error: "User with this email does not exist. They must register first." });
    }

    const alreadyConnected = await prisma.connection.findFirst({
      where: {
        OR: [
          { freelancerId: req.user.userId, clientId: existingUser.id },
          { freelancerId: existingUser.id, clientId: req.user.userId },
        ],
      },
    });
    if (alreadyConnected) {
      return res.status(400).json({ error: "You are already connected with this user" });
    }

    const existing = await prisma.invitation.findFirst({
      where: { receiverEmail: data.email, senderId: req.user.userId, status: "PENDING" },
    });
    if (existing) {
      return res.status(400).json({ error: "A pending invitation already exists for this email" });
    }

    const invitation = await prisma.invitation.create({
      data: {
        senderId: req.user.userId,
        receiverEmail: data.email,
        targetRole: data.targetRole,
      },
      include: { sender: { select: { id: true, name: true, email: true } } },
    });

    try {
      await prisma.notification.create({
        data: {
          userId: existingUser.id,
          type: "INVITE_RECEIVED",
          title: "New connection request",
          message: `${req.user.name} wants to connect with you as a ${data.targetRole === "FREELANCER" ? "Freelancer" : "Client"}`,
          link: "/network",
        },
      });
    } catch {}

    res.status(201).json({
      invitation,
      message: `Invitation sent to ${data.email}. They will see it on their Network page.`,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/pending-invites", authenticate, async (req, res) => {
  try {
    const userEmail = (req.user.email || "").toLowerCase();
    const invitations = await prisma.invitation.findMany({
      where: { receiverEmail: userEmail, status: "PENDING" },
      include: { sender: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(invitations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/respond-invite/:id", authenticate, async (req, res) => {
  try {
    const { action } = z.object({ action: z.enum(["ACCEPTED", "DECLINED"]) }).parse(req.body);
    const invitation = await prisma.invitation.findUnique({ where: { id: Number(req.params.id) } });

    if (!invitation) return res.status(404).json({ error: "Invitation not found" });
    if ((invitation.receiverEmail || "").toLowerCase() !== (req.user.email || "").toLowerCase()) {
      return res.status(403).json({ error: "This invitation is not for you" });
    }
    if (invitation.status !== "PENDING") {
      return res.status(400).json({ error: "Invitation is no longer pending" });
    }

    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: action },
    });

    if (action === "ACCEPTED") {
      const isFreelancerInvite = invitation.targetRole === "FREELANCER";
      await prisma.connection.create({
        data: {
          freelancerId: isFreelancerInvite ? req.user.userId : invitation.senderId,
          clientId: isFreelancerInvite ? invitation.senderId : req.user.userId,
        },
      });
    }

    res.json({ message: action === "ACCEPTED" ? "Connection established!" : "Invitation declined" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/sent-invites", authenticate, async (req, res) => {
  try {
    const invitations = await prisma.invitation.findMany({
      where: { senderId: req.user.userId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });
    res.json(invitations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/sent-invites/:id", authenticate, async (req, res) => {
  try {
    const invitation = await prisma.invitation.findUnique({ where: { id: Number(req.params.id) } });
    if (!invitation || invitation.senderId !== req.user.userId) {
      return res.status(404).json({ error: "Invitation not found" });
    }
    await prisma.invitation.delete({ where: { id: invitation.id } });
    res.json({ message: "Invitation revoked" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/connections", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;

    let connections;
    if (role === "FREELANCER") {
      connections = await prisma.connection.findMany({
        where: { freelancerId: userId },
        include: { client: { select: { id: true, name: true, email: true } } },
      });
      res.json(connections.map((c) => ({ id: c.id, userId: c.client.id, name: c.client.name, email: c.client.email, role: "CLIENT", createdAt: c.createdAt })));
    } else if (role === "CLIENT") {
      connections = await prisma.connection.findMany({
        where: { clientId: userId },
        include: { freelancer: { select: { id: true, name: true, email: true } } },
      });
      res.json(connections.map((c) => ({ id: c.id, userId: c.freelancer.id, name: c.freelancer.name, email: c.freelancer.email, role: "FREELANCER", createdAt: c.createdAt })));
    } else {
      res.json([]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/connections/:id", authenticate, async (req, res) => {
  try {
    const conn = await prisma.connection.findUnique({ where: { id: Number(req.params.id) } });
    if (!conn) return res.status(404).json({ error: "Connection not found" });
    if (conn.freelancerId !== req.user.userId && conn.clientId !== req.user.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    await prisma.connection.delete({ where: { id: conn.id } });
    res.json({ message: "Disconnected" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

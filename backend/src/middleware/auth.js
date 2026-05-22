import jwt from "jsonwebtoken";

export function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: decoded.userId, role: decoded.role, name: decoded.name, email: decoded.email };
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

export function requireFreelancer(req, res, next) {
  if (req.user.role !== "FREELANCER") {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

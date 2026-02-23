import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bodyParser from "body-parser";
import { v4 as uuid } from "uuid";

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = 8080;
const JWT_SECRET = "super_secret_key_change_me";

// ================= DATABASE (in-memory)
const users = [];
const bookings = [];

// ================= AUTH MIDDLEWARE
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token" });

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid JWT" });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admins only" });
  }
  next();
}

// ================= AUTH ROUTES

// Login
app.post("/auth/login", (req, res) => {
  const { email, password } = req.body;

  const user = users.find(
    (u) => u.email === email && u.password === password
  );

  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });
  res.json({ access_token: token, user });
});

// Register (أول مستخدم = Admin)
app.post("/auth/register", (req, res) => {
  const { email, password, name } = req.body;

  if (users.find((u) => u.email === email))
    return res.status(400).json({ error: "Email exists" });

  const isFirstUser = users.length === 0;

  const newUser = {
    id: uuid(),
    email,
    password,
    name,
    role: isFirstUser ? "admin" : "user",
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  res.json({ success: true, role: newUser.role });
});

// هل فيه أدمن؟
app.get("/auth/has-admin", (req, res) => {
  const hasAdmin = users.some((u) => u.role === "admin");
  res.json({ hasAdmin });
});

// Get current user
app.get("/auth/me", auth, (req, res) => {
  res.json({ user: req.user });
});

// Update profile
app.put("/auth/profile", auth, (req, res) => {
  const user = users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  user.name = req.body.name;
  res.json({ success: true });
});

// ================= BOOKINGS

// Create booking
app.post("/bookings", auth, (req, res) => {
  const { date, time, notes } = req.body;

  const booking = {
    id: uuid(),
    userId: req.user.id,
    userName: req.user.name,
    userEmail: req.user.email,
    date,
    time,
    notes,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  bookings.push(booking);
  res.json({ booking });
});

// My bookings
app.get("/bookings/my", auth, (req, res) => {
  const my = bookings.filter((b) => b.userId === req.user.id);
  res.json({ bookings: my });
});

// Admin: all bookings
app.get("/bookings", auth, adminOnly, (req, res) => {
  res.json({ bookings });
});

// Update booking status
app.put("/bookings/:id", auth, adminOnly, (req, res) => {
  const booking = bookings.find((b) => b.id === req.params.id);
  if (!booking) return res.status(404).json({ error: "Not found" });

  booking.status = req.body.status;
  res.json({ booking });
});

// Delete booking
app.delete("/bookings/:id", auth, (req, res) => {
  const index = bookings.findIndex(
    (b) => b.id === req.params.id && b.userId === req.user.id
  );

  if (index === -1) return res.status(404).json({ error: "Not found" });

  bookings.splice(index, 1);
  res.json({ success: true });
});

// ================= ADMIN ROUTES

// Stats
app.get("/admin/stats", auth, adminOnly, (req, res) => {
  const stats = {
    totalUsers: users.length,
    totalBookings: bookings.length,
    pendingBookings: bookings.filter((b) => b.status === "pending").length,
    approvedBookings: bookings.filter((b) => b.status === "approved").length,
    rejectedBookings: bookings.filter((b) => b.status === "rejected").length,
  };

  res.json({ stats });
});

// All users
app.get("/admin/users", auth, adminOnly, (req, res) => {
  res.json({ users });
});

// Change role
app.put("/admin/users/:id/role", auth, adminOnly, (req, res) => {
  const user = users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  user.role = req.body.role;
  res.json({ user });
});

// ================= START SERVER
app.listen(PORT, () => {
  console.log("🔥 Server running on http://localhost:" + PORT);
});

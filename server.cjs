import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import { v4 as uuid } from "uuid";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;
const JWT_SECRET = "amir_secret";

// ================= DATABASE ===============
const users = [];
const bookings = [];

// ================= MIDDLEWARE =================
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token" });

  const token = header.split(" ")[1];

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Admins only" });
  next();
}

// ================= AUTH =================

// هل فيه أدمن
app.get("/auth/has-admin", (req, res) => {
  const hasAdmin = users.some(u => u.role === "admin");
  res.json({ hasAdmin });
});

// إنشاء أول أدمن
app.post("/auth/init-admin", (req, res) => {
  const { name, email, password } = req.body;

  if (users.some(u => u.role === "admin"))
    return res.status(400).json({ error: "Admin exists" });

  const admin = {
    id: uuid(),
    name,
    email,
    password,
    role: "admin",
    createdAt: new Date().toISOString()
  };

  users.push(admin);
  res.json({ success: true });
});

// تسجيل
app.post("/auth/register", (req, res) => {
  const { name, email, password } = req.body;

  if (users.find(u => u.email === email))
    return res.status(400).json({ error: "Email exists" });

  users.push({
    id: uuid(),
    name,
    email,
    password,
    role: "user",
    createdAt: new Date().toISOString()
  });

  res.json({ success: true });
});

// دخول
app.post("/auth/login", (req, res) => {
  const { email, password } = req.body;

  const user = users.find(
    u => u.email === email && u.password === password
  );

  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });

  res.json({ access_token: token, user });
});

// من التوكن
app.get("/auth/me", auth, (req, res) => {
  res.json({ user: req.user });
});

// تعديل البروفايل (ProfilePage)
app.put("/auth/profile", auth, (req, res) => {
  const { name } = req.body;

  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  user.name = name;

  const newToken = jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });

  res.json({
    success: true,
    user,
    access_token: newToken
  });
});

// ================= BOOKINGS =================

// إنشاء حجز
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
    createdAt: new Date().toISOString()
  };

  bookings.push(booking);
  res.json({ booking });
});

// حجوزاتي
app.get("/bookings/my", auth, (req, res) => {
  res.json({
    bookings: bookings.filter(b => b.userId === req.user.id)
  });
});

// حذف حجز
app.delete("/bookings/:id", auth, (req, res) => {
  const i = bookings.findIndex(
    b => b.id === req.params.id && b.userId === req.user.id
  );

  if (i === -1) return res.status(404).json({ error: "Not found" });

  bookings.splice(i, 1);
  res.json({ success: true });
});

// ================= ADMIN =================

// كل الحجوزات
app.get("/bookings", auth, adminOnly, (req, res) => {
  res.json({ bookings });
});

// قبول / رفض
app.put("/bookings/:id", auth, adminOnly, (req, res) => {
  const booking = bookings.find(b => b.id === req.params.id);
  if (!booking) return res.status(404).json({ error: "Not found" });

  booking.status = req.body.status;
  res.json({ booking });
});

// إحصائيات
app.get("/admin/stats", auth, adminOnly, (req, res) => {
  res.json({
    stats: {
      totalUsers: users.length,
      totalBookings: bookings.length,
      pendingBookings: bookings.filter(b => b.status === "pending").length,
      approvedBookings: bookings.filter(b => b.status === "approved").length,
      rejectedBookings: bookings.filter(b => b.status === "rejected").length
    }
  });
});

// المستخدمين
app.get("/admin/users", auth, adminOnly, (req, res) => {
  res.json({ users });
});

// تغيير صلاحية
app.put("/admin/users/:id/role", auth, adminOnly, (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  user.role = req.body.role;
  res.json({ user });
});

// ================= START =================
app.listen(PORT, () => {
  console.log("🚀 Server running on port " + PORT);
});

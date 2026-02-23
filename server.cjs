const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { v4: uuid } = require("uuid");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;
const JWT_SECRET = "super_secret_key_change_me";

// ================= DATABASE (temporary memory)
const users = [];
const bookings = [];

// ================= AUTH MIDDLEWARE
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "مفيش توكن يا صديقي" });

  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "التوكن غلط أو انتهت صلاحيته" });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "الصفحة دي للأدمن بس" });
  }
  next();
}

// ================= AUTH ROUTES

// Register
app.post("/auth/register", (req, res) => {
  const { email, password, name } = req.body;

  if (users.find(u => u.email === email))
    return res.status(400).json({ error: "الإيميل ده موجود بالفعل" });

  const user = {
    id: uuid(),
    email,
    password,
    name,
    role: "user",
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  res.json({ success: true, message: "تم التسجيل بنجاح" });
});

// Login
app.post("/auth/login", (req, res) => {
  const { email, password } = req.body;

  const user = users.find(
    u => u.email === email && u.password === password
  );

  if (!user) return res.status(401).json({ error: "الإيميل أو الباسورد غلط" });

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ access_token: token, user });
});

// Get current user
app.get("/auth/me", auth, (req, res) => {
  res.json({ user: req.user });
});

// Update profile name
app.put("/auth/profile", auth, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: "المستخدم مش موجود" });

  user.name = req.body.name;
  res.json({ user, message: "تم تحديث الاسم بنجاح" });
});

// Check if admin exists
app.get("/auth/has-admin", (req, res) => {
  const hasAdmin = users.some(u => u.role === "admin");
  res.json({ hasAdmin });
});

// Create first admin
app.post("/auth/init-admin", (req, res) => {
  const { email, password, name } = req.body;

  if (users.some(u => u.role === "admin"))
    return res.status(400).json({ error: "الأدمن موجود بالفعل" });

  const admin = {
    id: uuid(),
    email,
    password,
    name,
    role: "admin",
    createdAt: new Date().toISOString(),
  };

  users.push(admin);
  res.json({ success: true, message: "تم إنشاء حساب الأدمن بنجاح" });
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
  res.json({ booking, message: "تم حجز الموعد بنجاح وهيتراجع قريباً" });
});

// My bookings
app.get("/bookings/my", auth, (req, res) => {
  const my = bookings.filter(b => b.userId === req.user.id);
  res.json({ bookings: my });
});

// Delete booking
app.delete("/bookings/:id", auth, (req, res) => {
  const index = bookings.findIndex(
    b => b.id === req.params.id && b.userId === req.user.id
  );

  if (index === -1)
    return res.status(404).json({ error: "الحجز ده مش موجود أو مش بتاعك" });

  bookings.splice(index, 1);
  res.json({ success: true, message: "تم حذف الحجز بنجاح" });
});

// Admin: all bookings
app.get("/bookings", auth, adminOnly, (req, res) => {
  res.json({ bookings });
});

// Update booking status
app.put("/bookings/:id", auth, adminOnly, (req, res) => {
  const booking = bookings.find(b => b.id === req.params.id);
  if (!booking) return res.status(404).json({ error: "الحجز ده مش موجود" });

  booking.status = req.body.status;
  res.json({ booking, message: "تم تحديث حالة الحجز بنجاح" });
});

// ================= ADMIN ROUTES

// Stats
app.get("/admin/stats", auth, adminOnly, (req, res) => {
  const stats = {
    totalUsers: users.length,
    totalBookings: bookings.length,
    pendingBookings: bookings.filter(b => b.status === "pending").length,
    approvedBookings: bookings.filter(b => b.status === "approved").length,
    rejectedBookings: bookings.filter(b => b.status === "rejected").length,
  };

  res.json({ stats });
});

// All users
app.get("/admin/users", auth, adminOnly, (req, res) => {
  res.json({ users });
});

// Change role
app.put("/admin/users/:id/role", auth, adminOnly, (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "المستخدم ده مش موجود" });

  user.role = req.body.role;
  res.json({ user, message: "تم تغيير صلاحية المستخدم بنجاح" });
});

// ================= START SERVER
app.listen(PORT, () => {
  console.log("🔥 السيرفر شغال على بورت", PORT);
});

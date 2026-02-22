const express = require("express");
const cors = require("cors");

const app = express();

/* ================================
   MIDDLEWARE
================================ */
app.use(cors()); // 🔥 يحل مشكلة Failed to fetch
app.use(express.json());

/* ================================
   FAKE DATABASE (مؤقت)
================================ */
let users = [];

/* ================================
   HEALTH CHECK
================================ */
app.get("/", (req, res) => {
  res.json({ message: "API Running 🚀" });
});

/* ================================
   REGISTER
================================ */
app.post("/auth/register", (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const exists = users.find((u) => u.email === email);
  if (exists) {
    return res.status(400).json({ error: "User already exists" });
  }

  const newUser = {
    id: Date.now().toString(),
    email,
    name,
    role: "admin",
    password, // ⚠️ مؤقت
  };

  users.push(newUser);

  res.json({
    message: "Registered",
    user: {
      id: newUser.id,
      email,
      name,
      role: "admin",
    },
  });
});

/* ================================
   LOGIN
================================ */
app.post("/auth/login", (req, res) => {
  const { email, password } = req.body;

  const user = users.find((u) => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // توكن وهمي (يكفي الفرونت بتاعك)
  const token = "fake-jwt-token-" + user.id;

  res.json({
    access_token: token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
});

/* ================================
   ME (تحقق الجلسة)
================================ */
app.get("/auth/me", (req, res) => {
  const auth = req.headers.authorization;

  if (!auth) {
    return res.status(401).json({ error: "No token" });
  }

  const user = users[0];
  if (!user) {
    return res.status(401).json({ error: "No user" });
  }

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
});

/* ================================
   START SERVER
================================ */
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

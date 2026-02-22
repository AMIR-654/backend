const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();

// ================= CONFIG =================
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || "amir_super_secret";

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());

// ================= FAKE DB (مؤقت) =================
const users = [];

// ================= ROOT =================
app.get("/", (req, res) => {
  res.json({ message: "API Running 🚀" });
});

// ================= REGISTER =================
app.post("/auth/register", (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const exists = users.find(u => u.email === email);
  if (exists) {
    return res.status(400).json({ error: "User already exists" });
  }

  const user = {
    id: Date.now().toString(),
    email,
    password,
    name,
    role: "user"
  };

  users.push(user);

  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "7d" });

  res.json({
    access_token: token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    }
  });
});

// ================= LOGIN =================
app.post("/auth/login", (req, res) => {
  const { email, password } = req.body;

  const user = users.find(
    u => u.email === email && u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "7d" });

  res.json({
    access_token: token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    }
  });
});

// ================= AUTH MIDDLEWARE =================
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token" });

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// ================= GET USER =================
app.get("/auth/me", auth, (req, res) => {
  const user = users.find(u => u.id === req.userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    }
  });
});

// ================= START SERVER =================
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

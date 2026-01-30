const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = "trustzedfund_secret_key";

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

/* ============================
   DATABASE
============================ */
const db = new sqlite3.Database("./database.db");

/* ============================
   CORE TABLES
============================ */

// Users (basic – adapt if already exists)
db.run(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE,
  password TEXT,
  referral_code TEXT
)
`);

/* ============================
   SAVINGS CIRCLES TABLES
============================ */

db.run(`
CREATE TABLE IF NOT EXISTS savings_circles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  contribution_amount REAL NOT NULL,
  contribution_frequency TEXT NOT NULL,
  max_members INTEGER NOT NULL,
  created_by INTEGER NOT NULL,
  status TEXT DEFAULT 'forming',
  payout_order TEXT,
  current_payout_index INTEGER DEFAULT 0,
  start_date TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
)
`);

db.run(`
CREATE TABLE IF NOT EXISTS circle_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  circle_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT DEFAULT 'member',
  status TEXT DEFAULT 'pending',
  joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(circle_id, user_id)
)
`);

db.run(`
CREATE TABLE IF NOT EXISTS circle_contributions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  circle_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  contribution_period TEXT NOT NULL,
  status TEXT DEFAULT 'paid',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
)
`);

db.run(`
CREATE TABLE IF NOT EXISTS circle_payouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  circle_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  payout_cycle INTEGER NOT NULL,
  paid_at TEXT DEFAULT CURRENT_TIMESTAMP
)
`);

/* ============================
   AUTH MIDDLEWARE
============================ */
function auth(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
}

/* ============================
   AUTH ROUTES
============================ */

app.post("/api/signup", async (req, res) => {
  const { email, password } = req.body;
  const hash = await bcrypt.hash(password, 10);

  db.run(
    `INSERT INTO users (email, password) VALUES (?, ?)`,
    [email, hash],
    function (err) {
      if (err) return res.status(400).json({ error: "User exists" });
      res.json({ success: true });
    }
  );
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  db.get(`SELECT * FROM users WHERE email=?`, [email], async (err, user) => {
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user.id }, JWT_SECRET);
    res.json({ token });
  });
});

/* ============================
   SAVINGS CIRCLES ROUTES
============================ */

/* Create Circle */
app.post("/api/circles/create", auth, (req, res) => {
  const {
    name,
    type,
    contribution_amount,
    contribution_frequency,
    max_members,
  } = req.body;

  db.run(
    `
    INSERT INTO savings_circles
    (name, type, contribution_amount, contribution_frequency, max_members, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      name,
      type,
      contribution_amount,
      contribution_frequency,
      max_members,
      req.user.id,
    ],
    function (err) {
      if (err) return res.status(500).json(err);

      db.run(
        `
        INSERT INTO circle_members
        (circle_id, user_id, role, status)
        VALUES (?, ?, 'admin', 'active')
        `,
        [this.lastID, req.user.id]
      );

      res.json({ success: true, circle_id: this.lastID });
    }
  );
});

/* Join Circle */
app.post("/api/circles/:id/join", auth, (req, res) => {
  db.run(
    `
    INSERT INTO circle_members (circle_id, user_id)
    VALUES (?, ?)
    `,
    [req.params.id, req.user.id],
    err => {
      if (err) return res.status(400).json({ error: "Already joined" });
      res.json({ success: true });
    }
  );
});

/* Activate Circle (Admin) */
app.post("/api/circles/:id/activate", auth, (req, res) => {
  db.all(
    `
    SELECT user_id FROM circle_members
    WHERE circle_id=? AND status='active'
    `,
    [req.params.id],
    (err, members) => {
      const payoutOrder = members.map(m => m.user_id);

      db.run(
        `
        UPDATE savings_circles
        SET status='active',
            payout_order=?,
            start_date=DATETIME('now')
        WHERE id=?
        `,
        [JSON.stringify(payoutOrder), req.params.id],
        () => res.json({ success: true })
      );
    }
  );
});

/* Contribute */
app.post("/api/circles/:id/contribute", auth, (req, res) => {
  const { amount, period } = req.body;

  db.run(
    `
    INSERT INTO circle_contributions
    (circle_id, user_id, amount, contribution_period)
    VALUES (?, ?, ?, ?)
    `,
    [req.params.id, req.user.id, amount, period],
    err => {
      if (err) return res.status(500).json(err);
      res.json({ success: true });
    }
  );
});

/* Trigger Payout */
app.post("/api/circles/:id/payout", auth, (req, res) => {
  db.get(
    `SELECT * FROM savings_circles WHERE id=?`,
    [req.params.id],
    (err, circle) => {
      const order = JSON.parse(circle.payout_order);
      const recipient = order[circle.current_payout_index];
      const payoutAmount = circle.contribution_amount * order.length;

      db.run(
        `
        INSERT INTO circle_payouts
        (circle_id, user_id, amount, payout_cycle)
        VALUES (?, ?, ?, ?)
        `,
        [
          circle.id,
          recipient,
          payoutAmount,
          circle.current_payout_index + 1,
        ]
      );

      const nextIndex = circle.current_payout_index + 1;
      const newStatus = nextIndex >= order.length ? "completed" : "active";

      db.run(
        `
        UPDATE savings_circles
        SET current_payout_index=?,
            status=?
        WHERE id=?
        `,
        [nextIndex, newStatus, circle.id]
      );

      res.json({ success: true });
    }
  );
});

/* ============================
   SERVER START
============================ */
app.listen(PORT, () => {
  console.log(`Trust ZedFund running on port ${PORT}`);
});

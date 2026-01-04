import express from "express";
import fetch from "node-fetch";
const app = express();

app.use(express.json());

const PORT = 8081;

const N8N_WEBHOOK_URL =
  "https://learnn8nrupesh.app.n8n.cloud/webhook-test/user-event";

function emitEvent(event, payload = {}) {
  fetch(N8N_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event,
      timestamp: Date.now(),
      source: "backend",
      ...payload,
    }),
  }).catch((error) => {
    console.log(error);
  });
}

function getUserIdByEmail(email) {
  const user = users.find((u) => u.email === email);
  return user ? user.id : null;
}

/* -------- Hardcoded Users with OTP -------- */
const users = [
  {
    id: 1,
    email: "test@example.com",
    otp: "111111",
    role: "user",
  },
  {
    id: 2,
    email: "admin@example.com",
    otp: "222222",
    role: "admin",
  },
];

/* -------- OTP Login -------- */
app.post("/login", (req, res) => {
  const { email, otp } = req.body;

  const possibleUserId = email ? getUserIdByEmail(email) : null;

  // login attempt
  emitEvent("login_attempted", {
    email,
    userId: possibleUserId ?? undefined,
    flow: "login",
  });

  if (!email || !otp) {
    emitEvent("login_failed", {
      email,
      userId: possibleUserId ?? undefined,
      reason: "missing_fields",
      flow: "login",
    });

    return res.status(400).json({
      message: "Email and OTP required",
    });
  }

  const userExist = users.find(
    (user) => user.email === email && user.otp === otp
  );

  if (!userExist) {
    emitEvent("login_failed", {
      email,
      userId: possibleUserId ?? undefined,
      reason: "invalid_otp",
      flow: "login",
    });

    return res.status(401).json({
      message: "Invalid email or OTP",
    });
  }

  // success
  emitEvent("login_success", {
    userId: userExist.id,
    email: userExist.email,
    role: userExist.role,
    flow: "login",
  });

  res.json({
    message: "Login successful",
    user: {
      id: userExist.id,
      email: userExist.email,
      role: userExist.role,
    },
  });
});

/* -------- Random API #1 : Get all users -------- */
app.get("/users", (req, res) => {
  const safeUsers = users.map(({ otp, ...rest }) => rest);
  res.json({
    count: safeUsers.length,
    users: safeUsers,
  });
});

/* -------- Random API #2 : Get user profile -------- */
app.get("/profile/:id", (req, res) => {
  const userId = Number(req.params.id);

  const user = users.find((u) => u.id === userId);

  if (!user) {
    return res.status(404).json({
      message: "User not found",
    });
  }

  const { otp, ...safeUser } = user;

  res.json({
    profile: safeUser,
  });
});

/* -------- Health -------- */
app.get("/health", (req, res) => {
  res.send("API is healthy");
});

/* -------- Simulate User Activity (TEST ONLY) -------- */
app.post("/simulate", (req, res) => {
  const email = "test@example.com";
  const flow = "login";
  const userId = 1;

  emitEvent("login_attempted", {
    email,
    userId,
    flow,
  });

  const randomOutcome = Math.random();

  if (randomOutcome < 0.4) {
    emitEvent("login_failed", {
      email,
      userId,
      reason: "invalid_otp",
      flow,
    });

    return res.json({ scenario: "login_failed_invalid_otp" });
  }

  if (randomOutcome < 0.7) {
    emitEvent("otp_sent", {
      email,
      userId,
      flow,
    });

    emitEvent("login_failed", {
      email,
      userId,
      reason: "otp_timeout",
      flow,
    });

    return res.json({ scenario: "otp_timeout" });
  }

  emitEvent("otp_sent", {
    email,
    userId,
    flow,
  });

  emitEvent("login_success", {
    userId,
    email,
    role: "user",
    flow,
  });

  res.json({ scenario: "login_success" });
});

/* -------- Server -------- */
app.listen(PORT, () => {
  console.log("Server started on port:", PORT);
});

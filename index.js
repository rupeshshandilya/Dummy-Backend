import express from "express";
import fetch from "node-fetch";
const app = express();

app.use(express.json());

const PORT = 8081;

const N8N_WEBHOOK_URL =
  "https://learnn8nrupesh.app.n8n.cloud/webhook-test/user-event";

export function emitEvent(event, payload = {}) {
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

  // Event 1: login attempt
  emitEvent("login_attempted", {
    email,
    flow: "login",
  });

  if (!email || !otp) {
    // Event 2: failed due to missing data
    emitEvent("login_failed", {
      email,
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
    // Event 3: failed due to wrong OTP
    emitEvent("login_failed", {
      email,
      reason: "invalid_otp",
      flow: "login",
    });
    return res.status(401).json({
      message: "Invalid email or OTP",
    });
  }

  // Event 4: login success
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

  // Simulate login attempt
  emitEvent("login_attempted", {
    email,
    flow,
  });

  // Random delay simulation
  const randomOutcome = Math.random();

  if (randomOutcome < 0.4) {
    // Invalid OTP
    emitEvent("login_failed", {
      email,
      reason: "invalid_otp",
      flow,
    });

    return res.json({
      scenario: "login_failed_invalid_otp",
    });
  }

  if (randomOutcome < 0.7) {
    // OTP timeout / user dropped
    emitEvent("otp_sent", {
      email,
      flow,
    });

    emitEvent("login_failed", {
      email,
      reason: "otp_timeout",
      flow,
    });

    return res.json({
      scenario: "otp_timeout",
    });
  }

  // Successful login
  emitEvent("otp_sent", {
    email,
    flow,
  });

  emitEvent("login_success", {
    userId: 1,
    email,
    role: "user",
    flow,
  });

  res.json({
    scenario: "login_success",
  });
});

/* -------- Server -------- */
app.listen(PORT, () => {
  console.log("Server started on port:", PORT);
});

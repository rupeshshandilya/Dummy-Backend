const express = require("express");
const app = express();

app.use(express.json());

const PORT = 8081;

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

  if (!email || !otp) {
    return res.status(400).json({
      message: "Email and OTP required",
    });
  }

  const userExist = users.find(
    (user) => user.email === email && user.otp === otp
  );

  if (!userExist) {
    return res.status(401).json({
      message: "Invalid email or OTP",
    });
  }

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

/* -------- Server -------- */
app.listen(PORT, () => {
  console.log("Server started on port:", PORT);
});

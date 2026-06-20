// Builds and exports the Express app without starting a server, so tests
// can drive it in-process (via supertest) and index.js can listen on a port.
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000" }));
app.use(express.json());
app.use(cookieParser());

// Auth is public (login/create-user/me); everything else requires a valid
// session so handlers can scope data to req.user.
const requireAuth = require("./middleware/auth");

app.use("/api/auth", require("./routes/auth"));
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Routes are defined in separate files for better organisation;
app.use("/api/sessions", requireAuth, require("./routes/sessions"));
app.use("/api/exercises", requireAuth, require("./routes/exercises"));
app.use("/api/sets", requireAuth, require("./routes/sets"));
app.use("/api/progress", requireAuth, require("./routes/progress"));
app.use("/api/body", requireAuth, require("./routes/body"));
app.use("/api/programmes", requireAuth, require("./routes/programmes"));
app.use("/api/goals", requireAuth, require("./routes/goals"));

module.exports = app;

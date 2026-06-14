// Node prefers CommonJS syntax, so we
// use require() instead of import
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

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

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

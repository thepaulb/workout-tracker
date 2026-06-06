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

// Routes are defined in separate files for better organisation;
app.use("/api/sessions", require("./routes/sessions"));
app.use("/api/exercises", require("./routes/exercises"));
app.use("/api/sets", require("./routes/sets"));
app.use("/api/progress", require("./routes/progress"));
app.use("/api/body", require("./routes/body"));
app.use("/api/auth", require("./routes/auth"));

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

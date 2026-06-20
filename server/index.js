// Node prefers CommonJS syntax, so we
// use require() instead of import
const dotenv = require("dotenv");

// Load env before requiring app (and, through it, the db) so config like
// JWT_SECRET and DB_PATH is in place.
dotenv.config();

const app = require("./app");

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

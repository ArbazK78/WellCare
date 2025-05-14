// server/src/middlewares/verifyUserToken.js
const jwt = require("jsonwebtoken");

const verifyUserToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  console.log("🛡️ [User] Verifying token...");
  console.log("Authorization Header:", authHeader);
  console.log("🧾 All headers:", req.headers);


  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId; // ✅ For use in controller
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = verifyUserToken;


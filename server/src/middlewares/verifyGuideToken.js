// server/src/middlewares/verifyGuideToken.js
const jwt = require("jsonwebtoken");

const verifyGuideToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log("🛡️ Verifying token...");
console.log("Authorization:", req.headers.authorization);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach guide ID (assuming you stored it as 'id' during login)
    // req.guide = decoded; // ✅ Needed for `req.guide.id`
    console.log("Decoded Token:", decoded);
    req.guide = { id: decoded.id }; // ✅ Safe and specific
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = verifyGuideToken;

// server/routes/evaluate.js
const express = require("express");
const router = express.Router();
const { evaluateAI } = require("../controllers/evaluateController");

router.post("/", evaluateAI);

module.exports = router;

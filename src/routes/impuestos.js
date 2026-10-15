const express = require('express');
const db = require('../config/db');

const router = express.Router();
router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM impuestos ORDER BY id').all());
});

module.exports = router;
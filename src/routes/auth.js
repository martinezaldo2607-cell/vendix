const express = require('express');
const ctrl = require('../controllers/authController');
const { requiereSesion } = require('../middlewares/auth');

const router = express.Router();

router.post('/login', ctrl.login);
router.post('/logout', ctrl.logout);
router.get('/yo', requiereSesion, ctrl.yo);

module.exports = router;
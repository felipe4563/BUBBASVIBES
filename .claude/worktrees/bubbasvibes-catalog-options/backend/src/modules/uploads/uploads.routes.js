const { Router } = require('express');
const path = require('path');
const auth = require('../../middlewares/auth');
const upload = require('../../middlewares/upload');

const router = Router();
router.use(auth);

router.post('/imagen', upload.single('imagen'), (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, mensaje: 'No se recibió ninguna imagen' });
  const url = `/uploads/${req.file.filename}`;
  res.json({ ok: true, datos: { url } });
});

module.exports = router;

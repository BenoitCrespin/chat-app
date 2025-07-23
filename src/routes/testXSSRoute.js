import express from 'express';
import { body, validationResult } from 'express-validator';
import filterXSS from 'xss';

const router = express.Router();

router.get('/test-xss', (req, res) => {
  res.render('test-xss');
});

// Version sans validation XSS
// router.post('/test-xss', [
//   body('comment').notEmpty().withMessage('Le commentaire ne peut pas être vide')
// ], (req, res) => {
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     return res.status(400).render('test-xss', { errors: errors.array() });
//   }

//   const { comment } = req.body;
//   res.render('test-xss', { comment });
// });

// Version avec validation XSS
router.post('/test-xss', [
  body('comment').notEmpty().withMessage('Le commentaire ne peut pas être vide')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).render('test-xss', { errors: errors.array() });
  }

  const { comment } = req.body;
  const safeComment = "safeComment: " + filterXSS(comment);
  res.render('test-xss', { success: safeComment });
});

export default router;

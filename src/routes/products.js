const express = require('express');
const { getProducts } = require('../services/productService');

const router = express.Router();

function isClientError(error) {
  const message = error?.message ?? '';
  return (
    message.startsWith('Invalid cursor:') ||
    message.startsWith('limit must be')
  );
}

router.get('/', async (req, res) => {
  try {
    const { category, cursor, limit } = req.query;

    const result = await getProducts({ category, cursor, limit });

    res.json({
      data: result.data,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  } catch (error) {
    if (isClientError(error)) {
      return res.status(400).json({ error: error.message });
    }

    console.error('GET /products failed:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

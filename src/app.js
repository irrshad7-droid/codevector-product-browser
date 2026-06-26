const express = require('express');
const cors = require('cors');

const healthRouter = require('./routes/health');
const productsRouter = require('./routes/products');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/health', healthRouter);
app.use('/products', productsRouter);

module.exports = app;

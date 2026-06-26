# CodeVector Product Browser

Backend API built with Node.js, Express, Prisma, PostgreSQL (Neon), and deployed on Render.

## Tech Stack

- Node.js
- Express
- Prisma
- PostgreSQL (Neon)
- Render

## Live API

https://codevector-product-browser-uhd8.onrender.com

## Endpoints

GET /health

GET /products

GET /products?category=electronics

GET /products?cursor=<cursor>

## Setup

npm install

cp .env.example .env

npx prisma migrate deploy

npm run db:seed

npm run dev

## Features

- Cursor-based pagination
- Category filtering
- Prisma ORM
- Graceful shutdown
- Production deployment

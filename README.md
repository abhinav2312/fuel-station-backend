# 🚀 Fuel Station Management - Backend API

Backend API for Fuel Station Management System deployed on Render.

## 🚀 Quick Deploy to Render

1. **Connect to Render:**
   - Go to [render.com](https://render.com)
   - Click "New +" → "Web Service"
   - Connect this GitHub repository

2. **Configure Service:**
   - **Name**: `fuel-station-backend`
   - **Build Command**: `npm install && npx prisma generate && npx prisma migrate deploy`
   - **Start Command**: `npm start`
   - **Plan**: Free

3. **Add Environment Variables:**
   ```
   NODE_ENV=production
   PORT=10000
   LOG_LEVEL=info
   FRONTEND_URL=https://your-frontend.netlify.app
   DATABASE_URL=<from Render PostgreSQL>
   ```

4. **Create PostgreSQL Database:**
   - In Render: "New +" → "PostgreSQL"
   - Name: `fuel-station-db`
   - Plan: Free
   - Copy connection string to `DATABASE_URL`

5. **Setup Database:**
   - Go to backend service → "Shell"
   - Run: `npm run business-setup`

## 🔧 Local Development

```bash
npm install
npm run dev
```

## 📊 API Endpoints

- `GET /health` - Health check
- `GET /api/tanks` - Get all tanks
- `PUT /api/tanks/:id` - Update tank
- `GET /api/pumps` - Get all pumps
- `GET /api/clients` - Get all clients
- `POST /api/clients` - Create client
- `GET /api/prices` - Get fuel prices
- `POST /api/prices` - Set fuel prices
- `GET /api/reports` - Get sales reports
- `POST /api/readings` - Record daily readings
- `POST /api/purchases` - Record purchases
- `GET /api/credits` - Get credit sales
- `POST /api/credits` - Record credit sale

## 🗄️ Database Schema

- **FuelType** - Fuel types (Petrol, Diesel, etc.)
- **Tank** - Storage tanks with capacity and current level
- **Pump** - Fuel pumps per fuel type
- **Price** - Current fuel prices
- **Client** - Customer information
- **Sale** - Individual sales records
- **Purchase** - Fuel purchase records
- **DailyReading** - Daily pump readings
- **ClientCredit** - Credit sales to clients

## 🌐 CORS Configuration

Backend is configured to accept requests from:
- `https://your-frontend.netlify.app`
- `http://localhost:5173` (development)

Update CORS origins in `src/index.ts` for production.

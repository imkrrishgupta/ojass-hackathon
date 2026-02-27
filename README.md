# Near Help

A MERN stack application for the Near Help platform.

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas account)
- npm or yarn

## Quick Start

### 1. Initial Setup

Run the setup script to install all dependencies:

```bash
./setup.sh
```

This script will:
- Install backend dependencies
- Install frontend dependencies
- Create a `.env` file from `.env.example`
- Check for MongoDB installation

### 2. Configure Environment

Edit the `.env` file in the root directory with your actual configuration:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Database
MONGODB_URI=mongodb://localhost:27017/nearhelp
# Or use MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/nearhelp

# JWT Secret (change this in production!)
JWT_SECRET=your_jwt_secret_key_here

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 3. Start Development Servers

Run the web script to start both backend and frontend:

```bash
./web.sh
```

This will start:
- Backend server at `http://localhost:5000`
- Frontend server at `http://localhost:5173`

Press `Ctrl+C` to stop both servers.

## Manual Setup (Alternative)

### Backend

```bash
cd backend
npm install
npm start        # Production mode
# or
npm run dev      # Development mode (requires nodemon)
```

### Frontend

```bash
cd frontend
npm install
npm run dev      # Development mode
npm run build    # Production build
```

## Project Structure

```
Near Help/
├── backend/
│   ├── index.js           # Express server entry point
│   ├── package.json       # Backend dependencies
│   └── node_modules/      # Backend packages
├── frontend/
│   ├── src/               # React source files
│   ├── public/            # Static assets
│   ├── package.json       # Frontend dependencies
│   └── node_modules/      # Frontend packages
├── .env                   # Environment variables (not in git)
├── .env.example           # Environment template
├── setup.sh               # Setup script
└── web.sh                 # Start development servers script
```

## Available Scripts

### Backend Scripts

- `npm start` - Start the backend server
- `npm run dev` - Start backend with nodemon (auto-reload)

### Frontend Scripts

- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## API Endpoints

### Health Check

- `GET /` - API status
- `GET /api/health` - Health check with database status

## Technologies Used

### Backend
- Express.js - Web framework
- MongoDB & Mongoose - Database
- JWT - Authentication
- bcrypt - Password hashing
- Cloudinary - Image storage
- Multer - File uploads
- CORS - Cross-origin requests

### Frontend
- React - UI library
- Vite - Build tool
- ESLint - Code linting

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Backend server port | `5000` |
| `NODE_ENV` | Environment mode | `development` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/nearhelp` |
| `JWT_SECRET` | Secret key for JWT tokens | Required |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Optional |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Optional |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Optional |

## Troubleshooting

### MongoDB Connection Issues

- Make sure MongoDB is running: `mongod` or use MongoDB Atlas
- Check your `MONGODB_URI` in `.env`
- Verify network connectivity

### Port Already in Use

- Backend (5000): Change `PORT` in `.env`
- Frontend (5173): Vite will automatically try the next available port

### Module Not Found

Run the setup script again:
```bash
./setup.sh
```

## License

ISC

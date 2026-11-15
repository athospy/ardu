# Ardu Backend - Motivational Quotes API

Backend API for a motivational quotes mobile application with AI-powered recommendations using Ollama.

## Features

- 🔐 User authentication with JWT
- 👤 User profile management with personalized motivation
- 💬 AI-generated quote recommendations (Ollama)
- 📱 Push notifications via Expo
- ⭐ Favorite quotes management
- 🌍 Multi-language support
- 🔄 Random quote delivery
- 📊 Notification history tracking

## Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 14
- Ollama installed locally (for AI features)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ardu_backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Create PostgreSQL database:
```bash
createdb quotes_app
```

5. Run database migrations:
```bash
npm run migrate
```

6. Seed default quotes (optional):
```bash
npm run seed
```

## Running the Server

### Development mode:
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

The server will start on `http://localhost:3000` (or your configured PORT).

## Setting up Ollama

1. Install Ollama from https://ollama.ai
2. Pull a model:
```bash
ollama pull llama2
# or
ollama pull mistral
```

3. Ensure Ollama is running:
```bash
ollama serve
```

## API Documentation

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### User Profile
- `GET /api/users/profile` - Get user profile (protected)
- `PUT /api/users/profile` - Update profile (protected)
- `PUT /api/users/motivation` - Update motivation text (protected)

### Quotes
- `GET /api/quotes` - Get all quotes
- `GET /api/quotes/random` - Get random quote
- `GET /api/quotes/favorites` - Get user favorites (protected)
- `POST /api/quotes/:id/favorite` - Toggle favorite (protected)

### AI Recommendations
- `GET /api/ai/recommended-quote` - Get AI-generated quote (protected)

### Notifications
- `GET /api/notifications/history` - Get notification history (protected)
- `POST /api/notifications/test` - Send test notification (protected)

## Project Structure

```
ardu_backend/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Express middleware
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Helper functions
│   ├── jobs/            # Scheduled jobs
│   └── app.js           # Main application file
├── migrations/          # Database migrations
├── seeds/               # Database seeds
└── tests/               # Test files
```

## Testing

```bash
npm test
```

## Environment Variables

See `.env.example` for all required environment variables.

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT
# ardu_backend


📊 Database Connection Details
Host: localhost
Port: 5432
Database: quotes_app
Username: ardu_user
Password: ardu_password
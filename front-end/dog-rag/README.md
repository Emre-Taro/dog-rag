# Dog Health Management & RAG Application

A comprehensive application for managing dog health data, visualizing trends, and providing AI-powered advice through a RAG (Retrieval Augmented Generation) system.

## Features

### 1. Health Management Dashboard
- Quick record input for various activities (toilet, food, sleep, walk, play, bark, custom)
- Real-time log display for today's activities
- Multi-dog profile support with easy switching

### 2. Data Analysis & Visualization
- Dashboard with summary statistics
- Activity trends and health indicator charts
- Anomaly detection notifications
- Export functionality (CSV, PDF)

### 3. Record Management
- Comprehensive log listing with search and filters
- Edit and delete functionality
- Export to CSV format
- Filter by log type, date range, and search query

### 4. Dog Profile Management
- Create and manage multiple dog profiles
- Track breed, age, weight, height, personality, and training stage
- Profile-specific data viewing

### 5. AI/RAG Consultation
- Chat interface for asking health-related questions
- Example questions template
- RAG system integration (placeholder - to be implemented by user)

## Tech Stack

- **Frontend & Backend**: Next.js 16 (App Router)
- **Database**: PostgreSQL with pgvector extension
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Vector Database**: pgvector (for RAG embeddings)

## Prerequisites

- Node.js 18+ 
- PostgreSQL 12+ with pgvector extension
- npm or yarn

## Setup Instructions

### 1. Database Setup

```bash
# Install PostgreSQL and pgvector extension
# Create a new database
createdb dog_rag

# Run the schema SQL file
psql -d dog_rag -f db/schema.sql
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dog_rag
DB_USER=postgres
DB_PASSWORD=your_password

# Optional: RAG API URL (for future implementation)
RAG_API_URL=http://localhost:8000/api/rag

# Optional: Authentication (for future implementation)
# NEXTAUTH_URL=http://localhost:3000
# NEXTAUTH_SECRET=your_secret_key
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
dog-rag/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── api/               # API routes
│   │   │   ├── dogs/         # Dog profile CRUD
│   │   │   ├── logs/         # Log CRUD, export
│   │   │   ├── dashboard/    # Dashboard stats/summary
│   │   │   └── rag/          # RAG chat endpoint
│   │   ├── input/            # Input page
│   │   ├── records/          # Records listing page
│   │   ├── dashboard/        # Dashboard/visualization page
│   │   ├── dog-profile/      # Dog profile management
│   │   └── rag/              # AI consultation page
│   ├── components/
│   │   ├── input/            # Input components
│   │   ├── layout/           # Layout components
│   │   ├── rendering-components/  # Page components
│   │   └── ui/               # UI components
│   ├── contexts/             # React contexts
│   ├── lib/                  # Utilities
│   │   ├── db.ts            # Database connection
│   │   └── validation.ts  # Data validation
│   └── types/                # TypeScript types
├── db/
│   └── schema.sql           # Database schema
└── package.json
```

## API Endpoints

### Dogs
- `GET /api/dogs` - List all dogs for a user
- `POST /api/dogs` - Create a new dog profile
- `GET /api/dogs/[dogId]` - Get a specific dog
- `PATCH /api/dogs/[dogId]` - Update a dog profile
- `DELETE /api/dogs/[dogId]` - Delete a dog profile

### Logs
- `GET /api/logs` - Get logs with filters
- `POST /api/logs` - Create a new log entry
- `GET /api/logs/export` - Export logs as CSV
- `PATCH /api/logs/[logId]` - Update a log entry
- `DELETE /api/logs/[logId]` - Delete a log entry

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/summary` - Get dashboard summary data

### RAG
- `POST /api/rag/chat` - Send a message to RAG system (placeholder)

## Data Models

### User
- id, user_name, email, hashed_password, created_at, updated_at

### Dog Profile
- id, user_id, dog_name, age, height, weight, breed, personality, stage_of_training, created_at, updated_at

### Dog Log
- id, dog_id, user_id, log_type, log_data (JSONB), created_at, updated_at

Log types supported:
- `toilet`: urination/defecation tracking
- `food`: meal tracking
- `sleep`: sleep duration
- `walk`: walk activities
- `play`: play activities
- `bark`: barking behavior
- `custom`: custom entries
- `medication`: medication records
- `consultation`: veterinary consultations

## Development Notes

### Authentication
Currently, the application uses a placeholder user ID (`00000000-0000-0000-0000-000000000000`). In production, implement proper authentication and replace this with actual user IDs from sessions.

### RAG Implementation
The RAG system is set up as a placeholder. The `/api/rag/chat` endpoint expects an external Python service. Implement your RAG pipeline and update the endpoint accordingly.

### Data Validation
All input data is validated according to the requirements:
- Dates cannot be in the future
- Number ranges are validated
- String lengths are limited
- Required fields are enforced
- Duplicate detection for similar entries

## Performance Requirements (from spec)

- Input and shown on record: 1 second
- Dashboard visualization: 3 seconds
- Predictive model: 30 seconds
- RAG chat: 10 seconds

## Security

- Passwords are hashed (implement bcrypt in production)
- HTTPS required in production
- Data validation on all inputs
- SQL injection protection via parameterized queries

## Future Enhancements

- [ ] User authentication and authorization
- [ ] RAG pipeline implementation
- [ ] Evaluation system for RAG responses
- [ ] Weekly/daily comments functionality
- [ ] Notification system
- [ ] PDF export for dashboard
- [ ] Advanced analytics and ML predictions

## License

Private - For internal use only

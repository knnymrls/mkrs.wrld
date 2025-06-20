# Nural App

**AI-Powered Enterprise Knowledge Discovery Platform**

Nural is an enterprise knowledge discovery tool designed to uncover hidden pockets of expertise within large organizations. It uses AI-powered semantic search and graph-based retrieval to help employees find colleagues with specific skills, discover who's worked on similar problems, and understand what teams are working on in real-time.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nural-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Add your credentials to `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   OPENAI_API_KEY=your_openai_api_key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📋 Environment Setup

### Required Environment Variables

Create a `.env.local` file with:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anonymous_key

# OpenAI Configuration  
OPENAI_API_KEY=sk-your-openai-api-key

# Optional: Development flags
NODE_ENV=development
```

### Supabase Setup

1. **Create a new Supabase project**
2. **Run the database migrations**
   ```bash
   # Navigate to the project directory and run migrations
   supabase db push
   ```
   Or manually run the SQL files in `supabase/migrations/` in order.

3. **Enable Row Level Security (RLS)**
   - For production, run migration `016_enable_rls_safely.sql`
   - For development, RLS can remain disabled

4. **Configure Supabase Auth**
   - Enable email authentication
   - Set up your auth providers as needed

## 🏗️ Tech Stack

- **Framework**: Next.js 15.3.3 with App Router
- **Language**: TypeScript with strict mode
- **Database**: Supabase (PostgreSQL + pgvector)
- **Authentication**: Supabase Auth
- **AI**: OpenAI API (GPT-4o-mini, text-embedding-3-small)
- **Styling**: Tailwind CSS v4
- **Testing**: Jest + React Testing Library
- **Visualization**: react-force-graph

## 🎯 Core Features

### 1. **Activity Feed**
- Inline post creation with smart @mentions
- Real-time updates and notifications
- Rich post display with mentions as clickable links
- Like and comment functionality

### 2. **AI-Powered Chat Assistant**
- Universal query understanding with dual-agent system
- Semantic search using OpenAI embeddings
- Session context tracking for natural conversations
- Intelligent source attribution

### 3. **Knowledge Graph Visualization**
- Interactive D3-based force-directed graph
- Shows relationships between people, posts, and projects
- Click navigation for detailed views

### 4. **Profile System**
- Comprehensive user profiles with skills, education, experience
- Social links and activity timelines
- Automatic profile creation on signup

### 5. **Project Management**
- Project pages with contributors and status tracking
- Automatic linking of posts mentioning projects
- Role-based contributor management

### 6. **Smart Notifications**
- Real-time mention alerts
- Activity digests and updates
- Configurable notification preferences

## 📁 Project Structure

```
app/
├── (auth)/              # Authentication routes
│   └── auth/           # Sign in, sign up, verification
├── (main)/             # Main app routes (with navbar)
│   ├── page.tsx        # Activity feed homepage
│   ├── chatbot/        # AI assistant
│   ├── graph/          # Knowledge graph visualization  
│   ├── notifications/  # Notifications center
│   ├── profile/        # Profile management
│   └── projects/       # Project pages
├── api/                # API routes
│   ├── chat/          # Chat API with dual agents
│   └── embeddings/    # Embedding generation
├── components/         # React components
│   ├── features/      # Feature-specific components
│   ├── layout/        # Layout components
│   └── ui/           # Reusable UI components
├── context/           # React contexts
├── models/            # TypeScript data models
├── types/             # Type definitions
└── lib/              # Utilities and business logic
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Structure

- **Unit tests**: Components, hooks, utilities
- **Integration tests**: API routes, complex workflows
- **Mocks**: Comprehensive mocking for Supabase and Next.js

## 🛠️ Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linting
npm run lint

# Run type checking
npm run type-check
```

## 🔧 Configuration

### Database Schema

Key tables:
- `profiles` - User profiles with embedding vectors
- `posts` - User posts with embeddings and metadata
- `projects` - Projects with contributor relationships
- `skills`, `educations`, `experiences` - Profile data
- `chat_sessions`, `chat_messages` - AI chat history
- `notifications` - User notifications

### API Endpoints

- `POST /api/chat` - AI chat endpoint with context tracking
- `GET /api/chat/sessions` - Chat session management
- `POST /api/embeddings` - Generate embeddings for content

## 🚀 Deployment

### Vercel Deployment

1. **Connect to Vercel**
   ```bash
   vercel
   ```

2. **Set environment variables** in Vercel dashboard

3. **Deploy**
   ```bash
   vercel --prod
   ```

### Environment Variables for Production

Ensure all environment variables are set in your deployment platform:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` 
- `OPENAI_API_KEY`

## 🔒 Security

### Row Level Security (RLS)

For production deployments:

1. **Enable RLS on all tables**
2. **Run security migration**: `016_enable_rls_safely.sql`
3. **Verify policies**: Users can only access/modify their own data

### Best Practices

- Never commit API keys to version control
- Use environment variables for all secrets
- Enable RLS in production
- Validate all user inputs
- Implement proper error boundaries

## 🐛 Troubleshooting

### Common Issues

**1. Supabase Connection Issues**
```bash
# Check if Supabase client works
curl -H "apikey: YOUR_ANON_KEY" https://your-project.supabase.co/rest/v1/profiles
```

**2. Real-time Subscriptions Not Working**
- Verify RLS policies allow SELECT access
- Check that real-time is enabled for tables in Supabase dashboard

**3. Chat Not Responding**
- Verify OpenAI API key is set correctly
- Check API quota and billing in OpenAI dashboard

**4. Tests Failing**
- Ensure all mocks are properly set up
- Check that test files follow naming convention `*.test.ts(x)`

### Debug Mode

Enable verbose logging in development:
```env
NODE_ENV=development
DEBUG=true
```

## 📚 Documentation

- **Architecture**: See `ARCHITECTURE.md` for detailed system design
- **API Documentation**: See `API_DOCUMENTATION.md` for endpoint details  
- **Testing Guide**: See `README.test.md` for testing documentation
- **Project Instructions**: See `CLAUDE.md` for development guidelines

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** following the style guide in `CLAUDE.md`
4. **Add tests** for new functionality
5. **Commit your changes**: `git commit -m 'Add amazing feature'`
6. **Push to the branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

### Development Guidelines

- Follow the patterns in `CLAUDE.md`
- Add tests for new features
- Use TypeScript strictly
- Follow the established component organization
- Update documentation for API changes

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the troubleshooting section above
- Review the detailed documentation in `CLAUDE.md`
- Open an issue in the repository
- Refer to the API documentation for endpoint details

---

**Built with ❤️ for enterprise knowledge discovery**
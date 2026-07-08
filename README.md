Listed directory knowlix
Listed directory frontend
Listed directory backend
Listed directory docs
Viewed package.json:1-37
Viewed package.json:1-40
Viewed docker-compose.yml:1-21
Viewed .env.example:1-15
Viewed 001_init.sql:1-100
Viewed .env.example:1-2

# 🚀 Knowlix

![React](https://img.shields.io/badge/React-19.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![Node.js](https://img.shields.io/badge/Node.js-Express-green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-pgvector-blue)
![Gemini AI](https://img.shields.io/badge/AI-Google%20Gemini-orange)

Knowlix is an AI-powered knowledge management system designed to seamlessly ingest, process, and organize information from various document formats into structured, searchable knowledge entries.

## 📖 Overview

Knowlix helps users extract and organize information from raw documents (PDF, DOCX, TXT, Markdown) by utilizing advanced AI models. It is designed for researchers, students, and professionals who need a centralized hub to store documents, automatically extract key insights, and perform semantic searches across their personal knowledge base.

## ✨ Key Features

- **Multi-Format Document Ingestion:** Upload and process PDFs, Word documents (DOCX), Text files, and Markdown.
- **AI-Powered Summarization & Extraction:** Automatically extract key ideas, summaries, and structured knowledge using Google Gemini AI.
- **Semantic Vector Search:** Find relevant information quickly using pgvector-powered semantic embeddings.
- **Rich Markdown Rendering:** Support for complex Markdown elements, including math equations (KaTeX) and diagrams (Mermaid).
- **Secure File Storage:** Raw documents and extracted text are securely managed via Supabase Storage.
- **User Authentication:** Secure JWT-based authentication system.

## 🏗 System Architecture

Knowlix follows a modern client-server architecture with dedicated external services for storage and AI processing.

- **Frontend:** A React Single Page Application (SPA) responsible for the user interface, file uploads, and displaying rich knowledge entries.
- **Backend:** A Node.js/Express API that handles authentication, file ingestion, orchestration of AI tasks, and database interactions.
- **Database:** PostgreSQL stores all relational data (users, metadata) and uses the `pgvector` extension for storing and querying AI embeddings.
- **External Services:**
  - **Google Gemini API:** Used for text summarization, knowledge extraction, and generating vector embeddings.
  - **Supabase Storage:** Serves as the object storage solution for holding uploaded raw files and processed text objects.

This architecture ensures a clear separation of concerns, allowing the frontend to remain lightweight while the backend efficiently offloads heavy AI computation and file storage to dedicated scalable external services.

## 🔄 System Workflow

1. **Upload:** The user uploads a document via the React frontend.
2. **Storage:** The backend receives the file, uploads the raw source to Supabase Storage, and records the metadata in the database.
3. **Extraction:** The backend parses the file's contents (using tools like `pdf-parse` or `mammoth` for DOCX) to extract raw text.
4. **AI Processing:** The extracted text is sent to the Google Gemini API to generate summaries, extract key ideas, and create semantic vector embeddings.
5. **Persist:** The processed data and vectors are stored in PostgreSQL, and any large markdown assets are saved to Supabase Storage.
6. **Query & Display:** The user can now seamlessly search their knowledge base, and the frontend will fetch and render the rich Markdown entries.

## 🛠 Technology Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, React Router, React Markdown (with KaTeX & Mermaid support)
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL, pgvector (via Docker)
- **AI / LLM:** Google Gemini API (`@google/genai`)
- **Authentication:** JWT (JSON Web Tokens), bcryptjs
- **Storage:** Supabase Storage
- **Other Tools:** `pdf-parse`, `mammoth` (DOCX parsing), `multer`

## 🗄 Database Overview

- **Database Used:** PostgreSQL with the `pgvector` extension.
- **Data Stored:** User accounts (`app_users`), document metadata (`sources`, `uploaded_files`, `storage_objects`), and processed content (`knowledge_entries`, `knowledge_revisions`). The vector representations of the knowledge are stored in `vector(768)` columns.
- **Why Chosen:** PostgreSQL provides robust relational data guarantees, while `pgvector` allows for native semantic similarity search within the same database, eliminating the need for a separate specialized vector database.

## 📁 Project Structure

```text
knowlix/
├── backend/       # Node.js/Express API, database migrations, and backend logic
├── docs/          # Additional technical documentation
├── frontend/      # React 19 SPA built with Vite
└── scripts/       # Utility scripts for the project
```

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone <repository-url>
cd knowlix
```

### 2. Install dependencies
```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

### 3. Environment Variables
Create the necessary `.env` files based on the provided examples.

In `frontend/`:
```bash
cp .env.example .env
```

In `backend/`:
```bash
cp .env.example .env
```
*Make sure to fill in your `GEMINI_API_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` in the backend `.env` file.*

### 4. Database Setup
Start the PostgreSQL database via Docker and run migrations:
```bash
cd backend
docker-compose up -d
npm run db:migrate
```

### 5. Run the Application
Start both the backend and frontend development servers.

**Run Backend:**
```bash
cd backend
npm run dev
```

**Run Frontend:**
```bash
cd frontend
npm run dev
```

## 📚 Documentation

Detailed implementation instructions and architecture details are available in:
- `frontend/README.md`
- `backend/README.md`

## 💡 Design Decisions

- **React 19 & Vite:** Chosen for the frontend for blazing-fast development speeds, modern React features, and a lightweight build process.
- **Node.js & Express:** Provides a simple, unopinionated, and highly extensible backend to handle REST API endpoints and integrate seamlessly with JavaScript/TypeScript tooling.
- **PostgreSQL + pgvector:** Consolidates standard relational data and AI embeddings into a single system, simplifying infrastructure and deployment compared to maintaining a separate vector database.
- **Google Gemini API:** Selected for its state-of-the-art multimodal capabilities, strong text summarization, and cost-effective embedding generation.
- **Supabase Storage:** Chosen for object storage due to its excellent developer experience, simple SDK, and seamless integration with modern web stacks.

## 🌱 Future Improvements

- Implementation of a conversational chat interface to ask questions directly against specific documents.
- Support for extracting data from image-based documents (OCR).
- Collaboration features for sharing knowledge entries among multiple users.
- Automated tagging and categorization system based on document content clustering.
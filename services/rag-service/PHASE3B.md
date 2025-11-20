# Phase 3B: RAG Service - Implementation Guide

**Status**: 🚧 Ready to Start  
**Goal**: Build complete RAG service with document processing, embeddings, and vector search  
**Tech Stack**: Node.js, Express, TypeScript, Qdrant, OpenAI Embeddings  
**Duration**: ~6-8 hours

---

## 📋 Overview

Phase 3B creates the backend RAG (Retrieval Augmented Generation) service that:

1. Receives document metadata from Admin Dashboard (files already in Supabase)
2. Downloads files from Supabase Storage URLs
3. Processes files (PDF, TXT, DOCX)
4. Chunks text into manageable pieces
5. Generates embeddings using OpenAI
6. Stores vectors in Qdrant database
7. Provides search API for chatbot/voice agent
8. Manages multi-tenant data (per college)

**Key Principle**: Scalable, performant, multi-tenant RAG architecture with Supabase Storage.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    RAG Service Architecture                  │
└─────────────────────────────────────────────────────────────┘

Admin Dashboard → Upload to Supabase Storage → POST /api/documents (file URL)
                                                       ↓
                                             Download from Supabase
                                                       ↓
                                               Document Processor
                                                       ↓
                                                ┌──────────────┐
                                                │ Text Extract  │ (PDF/DOCX/TXT)
                                                └──────┬───────┘
                         │
                  ┌──────────────┐
                  │   Chunker    │ (500 chars, 100 overlap)
                  └──────┬───────┘
                         │
                  ┌──────────────┐
                  │  Embeddings  │ (OpenAI text-embedding-3-small)
                  └──────┬───────┘
                         │
                  ┌──────────────┐
                  │   Qdrant     │ (Vector Database)
                  │  Multi-tenant│ (college_id filter)
                  └──────────────┘

Chatbot/Voice Agent → POST /api/search
                         ↓
                  ┌──────────────┐
                  │ Query Embed  │
                  └──────┬───────┘
                         │
                  ┌──────────────┐
                  │ Vector Search│ (Cosine similarity)
                  └──────┬───────┘
                         │
                  Response (Context + Sources)
```

---

## 📁 Complete File Structure

```
services/rag-service/
│
├── src/
│   ├── index.ts                       # Express server entry
│   │
│   ├── routes/
│   │   ├── documents.ts               # POST /api/documents (upload)
│   │   ├── search.ts                  # POST /api/search (RAG query)
│   │   ├── history.ts                 # GET /api/documents/history/:id
│   │   └── health.ts                  # GET /health
│   │
│   ├── lib/
│   │   ├── vectordb/
│   │   │   ├── qdrant.ts              # Qdrant client singleton
│   │   │   ├── operations.ts          # CRUD operations
│   │   │   └── init.ts                # Collection initialization
│   │   │
│   │   ├── embeddings/
│   │   │   ├── generator.ts           # OpenAI embedding generation
│   │   │   └── chunker.ts             # Text chunking logic
│   │   │
│   │   ├── processors/
│   │   │   ├── text.ts                # Plain text processing
│   │   │   ├── pdf.ts                 # PDF extraction
│   │   │   ├── docx.ts                # DOCX extraction
│   │   │   └── index.ts               # Processor factory
│   │   │
│   │   ├── storage/
│   │   │   ├── supabase.ts            # Supabase client & download
│   │   │   └── downloader.ts          # Download from Supabase URLs
│   │   │
│   │   └── utils/
│   │       ├── logger.ts              # Winston logger
│   │       └── errors.ts              # Custom error classes
│   │
│   ├── middleware/
│   │   ├── cors.ts                    # CORS configuration
│   │   ├── errorHandler.ts            # Global error handler
│   │   └── upload.ts                  # Multer configuration
│   │
│   ├── types/
│   │   ├── index.ts                   # Common types
│   │   └── qdrant.ts                  # Qdrant-specific types
│   │
│   └── config/
│       └── index.ts                   # Environment config
│
├── uploads/                           # Temporary file storage
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── Dockerfile
└── README.md
```

---

## 🎨 Sub-Steps Breakdown

### **Step 1: Project Initialization** (30 mins)

**Tasks:**

1. Initialize Node.js + TypeScript project
2. Install core dependencies
3. Setup Express server
4. Configure environment variables
5. Setup logger (Winston)

**Commands:**

```bash
cd services/rag-service

# Initialize project
npm init -y

# Install dependencies
npm install express cors dotenv winston
npm install @ai-sdk/openai ai @qdrant/js-client-rest
npm install @supabase/supabase-js pdf-parse mammoth axios

# Install dev dependencies
npm install -D typescript @types/node @types/express @types/cors @types/multer
npm install -D tsx nodemon

# Initialize TypeScript
npx tsc --init
```

**`tsconfig.json`:**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "rootDir": "./src",
    "outDir": "./dist",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**`package.json` scripts:**

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "type-check": "tsc --noEmit"
  }
}
```

**Environment Variables (`.env.example`):**

```bash
# Server Configuration
NODE_ENV=development
PORT=3001

# OpenAI API
OPENAI_API_KEY=sk-...

# Qdrant Vector Database
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_BUCKET_NAME=college-documents

# File Processing
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_FILE_TYPES=.pdf,.txt,.docx
TEMP_DOWNLOAD_DIR=./temp

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Logging
LOG_LEVEL=info
```

---

### **Step 2: Setup Express Server** (30 mins)

**File: `src/index.ts`**

**Features:**

- Express server initialization
- CORS middleware
- JSON body parser
- Routes registration
- Error handling middleware
- Server startup

**Implementation:**

```typescript
// src/index.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { logger } from "./lib/utils/logger";
import { corsMiddleware } from "./middleware/cors";
import { errorHandler } from "./middleware/errorHandler";
import { initializeQdrant } from "./lib/vectordb/init";

// Routes
import documentsRouter from "./routes/documents";
import searchRouter from "./routes/search";
import historyRouter from "./routes/history";
import healthRouter from "./routes/health";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/documents", documentsRouter);
app.use("/api/search", searchRouter);
app.use("/api/documents/history", historyRouter);
app.use("/health", healthRouter);

// Error handling
app.use(errorHandler);

// Initialize and start server
async function startServer() {
  try {
    // Initialize Qdrant collection
    await initializeQdrant();
    logger.info("Qdrant initialized successfully");

    app.listen(PORT, () => {
      logger.info(`RAG Service running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
```

---

### **Step 3: Setup Qdrant Client** (45 mins)

**File: `src/lib/vectordb/qdrant.ts`**

**Features:**

- Singleton Qdrant client
- Connection testing
- Error handling

**Implementation:**

```typescript
// src/lib/vectordb/qdrant.ts
import { QdrantClient } from "@qdrant/js-client-rest";
import { logger } from "../utils/logger";

const QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333";
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;

export const qdrantClient = new QdrantClient({
  url: QDRANT_URL,
  apiKey: QDRANT_API_KEY,
});

export const COLLECTION_NAME = "college_documents";

export async function testConnection(): Promise<boolean> {
  try {
    await qdrantClient.getCollections();
    logger.info("Qdrant connection successful");
    return true;
  } catch (error) {
    logger.error("Qdrant connection failed:", error);
    return false;
  }
}
```

**File: `src/lib/vectordb/init.ts`**

**Features:**

- Create collection if not exists
- Setup payload indexes for filtering
- Configure vector dimensions

**Implementation:**

```typescript
// src/lib/vectordb/init.ts
import { qdrantClient, COLLECTION_NAME } from "./qdrant";
import { logger } from "../utils/logger";

export async function initializeQdrant() {
  try {
    // Check if collection exists
    const collections = await qdrantClient.getCollections();
    const exists = collections.collections.some(
      (c) => c.name === COLLECTION_NAME
    );

    if (exists) {
      logger.info(`Collection '${COLLECTION_NAME}' already exists`);
      return;
    }

    // Create collection
    await qdrantClient.createCollection(COLLECTION_NAME, {
      vectors: {
        size: 1536, // text-embedding-3-small dimension
        distance: "Cosine",
      },
    });

    logger.info(`Collection '${COLLECTION_NAME}' created`);

    // Create payload indexes for efficient filtering
    await qdrantClient.createPayloadIndex(COLLECTION_NAME, {
      field_name: "college_id",
      field_schema: "keyword",
    });

    await qdrantClient.createPayloadIndex(COLLECTION_NAME, {
      field_name: "category",
      field_schema: "keyword",
    });

    logger.info("Payload indexes created");
  } catch (error) {
    logger.error("Failed to initialize Qdrant:", error);
    throw error;
  }
}
```

---

### **Step 4: Implement Text Chunking** (45 mins)

**File: `src/lib/embeddings/chunker.ts`**

**Features:**

- Split text into chunks
- Overlap between chunks for context
- Preserve sentence boundaries
- Handle multiple chunk sizes

**Implementation:**

```typescript
// src/lib/embeddings/chunker.ts
export interface ChunkOptions {
  chunkSize?: number;
  overlap?: number;
  preserveSentences?: boolean;
}

export interface TextChunk {
  content: string;
  index: number;
  startChar: number;
  endChar: number;
}

const DEFAULT_OPTIONS: Required<ChunkOptions> = {
  chunkSize: 500,
  overlap: 100,
  preserveSentences: true,
};

export function chunkText(
  text: string,
  options: ChunkOptions = {}
): TextChunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const chunks: TextChunk[] = [];

  // Clean text
  const cleanedText = text.replace(/\s+/g, " ").replace(/\n+/g, "\n").trim();

  if (cleanedText.length === 0) {
    return chunks;
  }

  let startIndex = 0;
  let chunkIndex = 0;

  while (startIndex < cleanedText.length) {
    let endIndex = Math.min(startIndex + opts.chunkSize, cleanedText.length);

    // Preserve sentence boundaries
    if (opts.preserveSentences && endIndex < cleanedText.length) {
      // Look for sentence ending (. ! ?) followed by space
      const sentenceEnd = cleanedText.lastIndexOf(". ", endIndex);
      const exclamationEnd = cleanedText.lastIndexOf("! ", endIndex);
      const questionEnd = cleanedText.lastIndexOf("? ", endIndex);

      const bestEnd = Math.max(sentenceEnd, exclamationEnd, questionEnd);

      if (bestEnd > startIndex) {
        endIndex = bestEnd + 1; // Include the punctuation
      }
    }

    const content = cleanedText.slice(startIndex, endIndex).trim();

    if (content.length > 0) {
      chunks.push({
        content,
        index: chunkIndex++,
        startChar: startIndex,
        endChar: endIndex,
      });
    }

    // Move start index forward, accounting for overlap
    startIndex = endIndex - opts.overlap;

    // Ensure we make progress
    if (startIndex <= chunks[chunks.length - 1]?.startChar) {
      startIndex = endIndex;
    }
  }

  return chunks;
}

export function getChunkStats(chunks: TextChunk[]): {
  totalChunks: number;
  avgChunkSize: number;
  minChunkSize: number;
  maxChunkSize: number;
} {
  if (chunks.length === 0) {
    return {
      totalChunks: 0,
      avgChunkSize: 0,
      minChunkSize: 0,
      maxChunkSize: 0,
    };
  }

  const sizes = chunks.map((c) => c.content.length);

  return {
    totalChunks: chunks.length,
    avgChunkSize: Math.round(sizes.reduce((a, b) => a + b, 0) / sizes.length),
    minChunkSize: Math.min(...sizes),
    maxChunkSize: Math.max(...sizes),
  };
}
```

---

### **Step 5: Implement Embedding Generation** (1 hour)

**File: `src/lib/embeddings/generator.ts`**

**Features:**

- Generate embeddings using OpenAI
- Batch processing for efficiency
- Metadata attachment
- Error handling

**Implementation:**

```typescript
// src/lib/embeddings/generator.ts
import { embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { chunkText, TextChunk } from "./chunker";
import { logger } from "../utils/logger";

export interface EmbeddingMetadata {
  college_id: string;
  category: string;
  filename: string;
  uploadedAt: string;
  [key: string]: any;
}

export interface EmbeddingPoint {
  id: string;
  vector: number[];
  payload: {
    college_id: string;
    category: string;
    content: string;
    filename: string;
    chunk_index: number;
    total_chunks: number;
    created_at: string;
    metadata: Record<string, any>;
  };
}

export async function generateEmbeddings(
  text: string,
  metadata: EmbeddingMetadata
): Promise<EmbeddingPoint[]> {
  try {
    // Chunk the text
    const chunks = chunkText(text, {
      chunkSize: 500,
      overlap: 100,
      preserveSentences: true,
    });

    if (chunks.length === 0) {
      logger.warn("No chunks generated from text");
      return [];
    }

    logger.info(
      `Generating embeddings for ${chunks.length} chunks from ${metadata.filename}`
    );

    // Generate embeddings for all chunks
    const { embeddings } = await embedMany({
      model: openai.embedding("text-embedding-3-small"),
      values: chunks.map((chunk) => chunk.content),
    });

    // Create embedding points
    const points: EmbeddingPoint[] = embeddings.map((embedding, index) => {
      const chunk = chunks[index];
      return {
        id: `${metadata.college_id}_${Date.now()}_${index}`,
        vector: embedding,
        payload: {
          college_id: metadata.college_id,
          category: metadata.category,
          content: chunk.content,
          filename: metadata.filename,
          chunk_index: chunk.index,
          total_chunks: chunks.length,
          created_at: metadata.uploadedAt || new Date().toISOString(),
          metadata: metadata,
        },
      };
    });

    logger.info(`Successfully generated ${points.length} embeddings`);

    return points;
  } catch (error) {
    logger.error("Failed to generate embeddings:", error);
    throw error;
  }
}

export async function generateQueryEmbedding(query: string): Promise<number[]> {
  try {
    const { embedding } = await openai
      .embedding("text-embedding-3-small")
      .doEmbed({ value: query });

    return embedding;
  } catch (error) {
    logger.error("Failed to generate query embedding:", error);
    throw error;
  }
}
```

---

### **Step 6: Implement Document Processors** (1.5 hours)

**File: `src/lib/processors/text.ts`**

```typescript
// src/lib/processors/text.ts
export async function processText(filePath: string): Promise<string> {
  const fs = await import("fs/promises");
  const content = await fs.readFile(filePath, "utf-8");
  return content;
}
```

**File: `src/lib/processors/pdf.ts`**

```typescript
// src/lib/processors/pdf.ts
import pdf from "pdf-parse";
import fs from "fs/promises";

export async function processPDF(filePath: string): Promise<string> {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  } catch (error) {
    throw new Error(`Failed to process PDF: ${error}`);
  }
}
```

**File: `src/lib/processors/docx.ts`**

```typescript
// src/lib/processors/docx.ts
import mammoth from "mammoth";

export async function processDOCX(filePath: string): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    throw new Error(`Failed to process DOCX: ${error}`);
  }
}
```

**File: `src/lib/processors/index.ts`**

```typescript
// src/lib/processors/index.ts
import path from "path";
import { processText } from "./text";
import { processPDF } from "./pdf";
import { processDOCX } from "./docx";
import { logger } from "../utils/logger";

export async function processDocument(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();

  logger.info(`Processing document: ${filePath} (${ext})`);

  try {
    switch (ext) {
      case ".txt":
        return await processText(filePath);
      case ".pdf":
        return await processPDF(filePath);
      case ".docx":
        return await processDOCX(filePath);
      default:
        throw new Error(`Unsupported file type: ${ext}`);
    }
  } catch (error) {
    logger.error(`Document processing failed: ${error}`);
    throw error;
  }
}
```

---

### **Step 7: Implement Qdrant Operations** (45 mins)

**File: `src/lib/vectordb/operations.ts`**

```typescript
// src/lib/vectordb/operations.ts
import { qdrantClient, COLLECTION_NAME } from "./qdrant";
import { EmbeddingPoint } from "../embeddings/generator";
import { logger } from "../utils/logger";

export async function storeEmbeddings(points: EmbeddingPoint[]): Promise<void> {
  try {
    await qdrantClient.upsert(COLLECTION_NAME, {
      points: points.map((p) => ({
        id: p.id,
        vector: p.vector,
        payload: p.payload,
      })),
    });

    logger.info(`Stored ${points.length} embeddings in Qdrant`);
  } catch (error) {
    logger.error("Failed to store embeddings:", error);
    throw error;
  }
}

export interface SearchOptions {
  collegeId: string;
  query: number[]; // Query embedding
  category?: string;
  limit?: number;
  scoreThreshold?: number;
}

export interface SearchResult {
  content: string;
  score: number;
  filename: string;
  category: string;
  chunk_index: number;
  metadata: Record<string, any>;
}

export async function searchEmbeddings(
  options: SearchOptions
): Promise<SearchResult[]> {
  const {
    collegeId,
    query,
    category,
    limit = 5,
    scoreThreshold = 0.7,
  } = options;

  try {
    // Build filter
    const filter: any = {
      must: [{ key: "college_id", match: { value: collegeId } }],
    };

    if (category && category !== "general") {
      filter.must.push({
        key: "category",
        match: { value: category },
      });
    }

    // Perform search
    const results = await qdrantClient.search(COLLECTION_NAME, {
      vector: query,
      filter,
      limit,
      score_threshold: scoreThreshold,
      with_payload: true,
    });

    logger.info(`Found ${results.length} results for college ${collegeId}`);

    return results.map((result) => ({
      content: result.payload.content as string,
      score: result.score,
      filename: result.payload.filename as string,
      category: result.payload.category as string,
      chunk_index: result.payload.chunk_index as number,
      metadata: result.payload.metadata as Record<string, any>,
    }));
  } catch (error) {
    logger.error("Search failed:", error);
    throw error;
  }
}

export async function deleteDocumentsByFilename(
  collegeId: string,
  filename: string
): Promise<void> {
  try {
    await qdrantClient.delete(COLLECTION_NAME, {
      filter: {
        must: [
          { key: "college_id", match: { value: collegeId } },
          { key: "filename", match: { value: filename } },
        ],
      },
    });

    logger.info(`Deleted embeddings for ${filename} (college: ${collegeId})`);
  } catch (error) {
    logger.error("Failed to delete embeddings:", error);
    throw error;
  }
}
```

---

### **Step 8: Implement Document Processing Route** (1 hour)

**File: `src/lib/storage/supabase.ts`**

```typescript
// src/lib/storage/supabase.ts
import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import fs from "fs/promises";
import path from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || "10485760"); // 10MB

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(
      null,
      `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`
    );
  },
});

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedTypes = [".pdf", ".txt", ".docx"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed: ${allowedTypes.join(", ")}`));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});
```

**File: `src/routes/documents.ts`**

```typescript
// src/routes/documents.ts
import { Router, Request, Response } from "express";
import { downloadFromSupabase, cleanupTempFile } from "../lib/storage/supabase";
import { processDocument } from "../lib/processors";
import { generateEmbeddings } from "../lib/embeddings/generator";
import { storeEmbeddings } from "../lib/vectordb/operations";
import { logger } from "../lib/utils/logger";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    const { collegeId, category } = req.body;
    const files = req.files as Express.Multer.File[];

    if (!collegeId || !category) {
      return res.status(400).json({
        error: "Missing required fields: collegeId, category",
      });
    }

    if (!files || files.length === 0) {
      return res.status(400).json({
        error: "No files uploaded",
      });
    }

    logger.info(`Processing ${files.length} files for college ${collegeId}`);

    const results = [];

    for (const file of files) {
      try {
        // Extract text from document
        const text = await processDocument(file.path);

        // Generate embeddings
        const embeddings = await generateEmbeddings(text, {
          college_id: collegeId,
          category,
          filename: file.originalname,
          uploadedAt: new Date().toISOString(),
        });

        // Store in Qdrant
        await storeEmbeddings(embeddings);

        results.push({
          filename: file.originalname,
          chunks: embeddings.length,
          size: file.size,
        });

        // Delete temporary file
        await fs.unlink(file.path);
      } catch (error) {
        logger.error(`Failed to process ${file.originalname}:`, error);
        results.push({
          filename: file.originalname,
          error: error.message,
        });
      }
    }

    const totalChunks = results
      .filter((r) => !r.error)
      .reduce((sum, r) => sum + (r.chunks || 0), 0);

    res.json({
      success: true,
      totalChunks,
      documents: results,
    });
  } catch (error) {
    logger.error("Document upload failed:", error);
    res.status(500).json({
      error: "Failed to process documents",
      message: error.message,
    });
  }
});

export default router;
```

---

### **Step 9: Implement Search Route** (45 mins)

**File: `src/routes/search.ts`**

```typescript
// src/routes/search.ts
import { Router, Request, Response } from "express";
import { generateQueryEmbedding } from "../lib/embeddings/generator";
import { searchEmbeddings } from "../lib/vectordb/operations";
import { logger } from "../lib/utils/logger";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    const { collegeId, query, category, limit = 5 } = req.body;

    if (!collegeId || !query) {
      return res.status(400).json({
        error: "Missing required fields: collegeId, query",
      });
    }

    logger.info(`Search request from college ${collegeId}: "${query}"`);

    // Generate query embedding
    const queryEmbedding = await generateQueryEmbedding(query);

    // Search Qdrant
    const results = await searchEmbeddings({
      collegeId,
      query: queryEmbedding,
      category,
      limit,
      scoreThreshold: 0.7,
    });

    // Format response
    const context = results.map((r) => r.content).join("\n\n");

    const sources = results.map((r) => ({
      filename: r.filename,
      category: r.category,
      score: r.score,
      chunk: r.chunk_index,
    }));

    res.json({
      context,
      sources,
      resultsCount: results.length,
    });
  } catch (error) {
    logger.error("Search failed:", error);
    res.status(500).json({
      error: "Search failed",
      message: error.message,
    });
  }
});

export default router;
```

---

### **Step 10: Implement Upload History Route** (30 mins)

**File: `src/routes/history.ts`**

```typescript
// src/routes/history.ts
import { Router, Request, Response } from "express";
import { qdrantClient, COLLECTION_NAME } from "../lib/vectordb/qdrant";
import { logger } from "../lib/utils/logger";

const router = Router();

router.get("/:collegeId", async (req: Request, res: Response) => {
  try {
    const { collegeId } = req.params;

    // Scroll through all points for this college
    const points = await qdrantClient.scroll(COLLECTION_NAME, {
      filter: {
        must: [{ key: "college_id", match: { value: collegeId } }],
      },
      limit: 100,
      with_payload: true,
    });

    // Group by filename
    const grouped = new Map<string, any>();

    for (const point of points.points) {
      const payload = point.payload;
      const filename = payload.filename as string;

      if (!grouped.has(filename)) {
        grouped.set(filename, {
          id: `${collegeId}_${filename}`,
          collegeId,
          filename,
          category: payload.category,
          chunks: 0,
          uploadedAt: payload.created_at,
        });
      }

      grouped.get(filename).chunks++;
    }

    const history = Array.from(grouped.values());

    res.json(history);
  } catch (error) {
    logger.error("Failed to fetch history:", error);
    res.status(500).json({
      error: "Failed to fetch upload history",
      message: error.message,
    });
  }
});

router.delete("/:documentId", async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;
    const [collegeId, filename] = documentId.split("_");

    await qdrantClient.delete(COLLECTION_NAME, {
      filter: {
        must: [
          { key: "college_id", match: { value: collegeId } },
          { key: "filename", match: { value: filename } },
        ],
      },
    });

    res.json({ success: true });
  } catch (error) {
    logger.error("Failed to delete document:", error);
    res.status(500).json({
      error: "Failed to delete document",
      message: error.message,
    });
  }
});

export default router;
```

---

## 🧪 Testing Checklist

### Prerequisites

- [ ] **Start Qdrant**

  ```bash
  docker run -p 6333:6333 qdrant/qdrant
  ```

- [ ] **Configure Environment**
  ```bash
  cp .env.example .env
  # Add your OPENAI_API_KEY
  ```

### Step-by-Step Testing

- [ ] **Start Server**

  ```bash
  npm run dev
  ```

- [ ] **Test Health Endpoint**

  ```bash
  curl http://localhost:3001/health
  ```

- [ ] **Test Document Upload**

  ```bash
  curl -X POST http://localhost:3001/api/documents \
    -F "collegeId=TEST_COLLEGE" \
    -F "category=general" \
    -F "files=@./test-document.txt"
  ```

- [ ] **Verify Qdrant**

  - Open `http://localhost:6333/dashboard`
  - Check `college_documents` collection
  - Verify points created

- [ ] **Test Search**

  ```bash
  curl -X POST http://localhost:3001/api/search \
    -H "Content-Type: application/json" \
    -d '{
      "collegeId": "TEST_COLLEGE",
      "query": "What are the admission requirements?",
      "limit": 5
    }'
  ```

- [ ] **Test Upload History**
  ```bash
  curl http://localhost:3001/api/documents/history/TEST_COLLEGE
  ```

---

## 📦 Dependencies

**Core:**

```json
{
  "express": "^4.18.2",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1",
  "winston": "^3.11.0"
}
```

**AI & Embeddings:**

```json
{
  "@ai-sdk/openai": "^1.0.0",
  "ai": "^4.0.29",
  "@qdrant/js-client-rest": "^1.9.0"
}
```

**File Processing:**

```json
{
  "multer": "^1.4.5-lts.1",
  "pdf-parse": "^1.1.1",
  "mammoth": "^1.6.0"
}
```

**Dev Dependencies:**

```json
{
  "typescript": "^5.6.2",
  "@types/node": "^20.10.0",
  "@types/express": "^4.17.21",
  "@types/cors": "^2.8.17",
  "@types/multer": "^1.4.11",
  "tsx": "^4.7.0",
  "nodemon": "^3.0.2"
}
```

---

## 🎯 Success Criteria

### Phase 3B Complete When:

- ✅ RAG service runs locally (`npm run dev`)
- ✅ Qdrant collection initializes automatically
- ✅ Document upload endpoint processes PDF/TXT/DOCX
- ✅ Text chunking works with proper overlap
- ✅ Embeddings generated via OpenAI
- ✅ Vectors stored in Qdrant with college_id filter
- ✅ Search endpoint returns relevant results
- ✅ Upload history endpoint works
- ✅ Delete endpoint removes documents
- ✅ Multi-tenant isolation verified
- ✅ No memory leaks (temp files cleaned up)
- ✅ Comprehensive error handling
- ✅ TypeScript compiles without errors

---

## 🔜 Next Steps

After completing Phase 3B:

1. **Integration with Phase 3A** - Connect admin dashboard to RAG API
2. **Testing** - End-to-end test with real documents
3. **Phase 4** - Connect text chatbot to RAG service
4. **Optimization** - Implement caching, rate limiting
5. **Deployment** - Deploy to Railway/Render

---

**Phase 3B Ready to Code! 🚀**

**Estimated Time:** 6-8 hours  
**Complexity:** Medium-High  
**Blockers:** None (can test with Qdrant locally)

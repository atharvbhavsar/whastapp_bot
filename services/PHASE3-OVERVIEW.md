# Phase 3 Overview: RAG Service + Admin Dashboard

**Status**: 🚧 Ready to Start  
**Goal**: Complete document management and RAG implementation  
**Duration**: ~10-12 hours total

---

## 📊 Phase 3 Summary

Phase 3 is divided into two sub-phases that work together:

### **Phase 3A: Admin Dashboard** (3-4 hours)

- Admin UI for document uploads to Supabase Storage
- College ID input + file upload + category selection
- Upload history viewer
- Supabase authentication for admin access
- Built with React/Next.js (TBD), Shadcn UI

### **Phase 3B: RAG Service** (6-8 hours)

- Node.js Express API for document processing
- Downloads files from Supabase Storage URLs
- Text extraction (PDF, DOCX, TXT)
- Chunking and embedding generation
- Qdrant vector database integration
- Search API for chatbot/voice agent

---

## 🏗️ Complete Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Phase 3 Architecture                       │
└─────────────────────────────────────────────────────────────┘

    ┌─────────────────────┐
    │  Admin Dashboard    │  (Phase 3A - React/Next.js)
    │  - Upload Form      │
    │  - File Uploader    │
    │  - Upload History   │
    │  - Supabase Auth    │
    └──────────┬──────────┘
               │ Upload to Supabase Storage
               ↓
    ┌─────────────────────┐
    │  Supabase Storage   │
    │  - college-documents│
    └──────────┬──────────┘
               │ File URL + metadata
               ↓
    ┌─────────────────────┐
    │  RAG Service API    │  (Phase 3B - Node.js)
    │  POST /api/documents│
    └──────────┬──────────┘
               │
      ┌────────┴────────┐
      ↓                 ↓
  ┌───────────┐    ┌──────────┐
  │  Process  │    │  Qdrant  │
  │  Extract  │    │  Vector  │
  │  Chunk    │────>│    DB    │
  │  Embed    │    └──────────┘
  └───────────┘         ↑
                        │
    ┌───────────────────┴──────────────┐
    │                                   │
    ↓                                   ↓
┌────────────┐                  ┌───────────────┐
│  Chatbot   │                  │  Voice Agent  │
│  Phase 1   │                  │  Phase 6      │
└────────────┘                  └───────────────┘
     (Will connect in Phase 4)   (Will connect in Phase 7)
```

---

## 📁 Folder Structure Created

### Admin Dashboard

```
services/admin-dashboard/
├── src/
│   ├── components/         # React components
│   │   └── ui/            # Shadcn components
│   ├── lib/               # Utils & API client
│   ├── hooks/             # Custom hooks
│   ├── types/             # TypeScript types
│   └── styles/            # CSS
└── public/                # Static assets
```

### RAG Service

```
services/rag-service/
├── src/
│   ├── routes/            # API endpoints
│   ├── lib/
│   │   ├── vectordb/      # Qdrant operations
│   │   ├── embeddings/    # OpenAI embeddings
│   │   ├── processors/    # File processing
│   │   ├── storage/       # File storage
│   │   └── utils/         # Logger, errors
│   ├── middleware/        # Express middleware
│   ├── types/             # TypeScript types
│   └── config/            # Environment config
└── uploads/               # Temporary storage
```

---

## 🎯 Key Features

### Phase 3A Features

✅ College ID input field  
✅ Multi-file drag-n-drop uploader  
✅ Document category selector (7 categories)  
✅ Upload progress tracking  
✅ Success/error toast notifications  
✅ Upload history table with delete  
✅ Responsive design (mobile-friendly)  
✅ Beautiful Shadcn UI components

### Phase 3B Features

✅ Multi-file upload endpoint  
✅ PDF/DOCX/TXT text extraction  
✅ Intelligent text chunking (500 chars, 100 overlap)  
✅ OpenAI embedding generation (text-embedding-3-small)  
✅ Qdrant vector database storage  
✅ Multi-tenant data isolation (college_id filter)  
✅ Vector similarity search API  
✅ Upload history API  
✅ Document deletion API  
✅ Comprehensive error handling

---

## 🔌 API Endpoints

### RAG Service (Phase 3B)

| Method | Endpoint                            | Description                            |
| ------ | ----------------------------------- | -------------------------------------- |
| POST   | `/api/documents`                    | Upload documents (multipart/form-data) |
| POST   | `/api/search`                       | Search college documents (RAG query)   |
| GET    | `/api/documents/history/:collegeId` | Get upload history                     |
| DELETE | `/api/documents/:documentId`        | Delete document                        |
| GET    | `/health`                           | Health check                           |

---

## 🧪 Testing Strategy

### Phase 3A Testing

1. Run dashboard locally: `npm run dev`
2. Test upload form validation
3. Test file drag-n-drop
4. Test multiple file selection
5. Mock API responses (before 3B ready)
6. Test responsive design

### Phase 3B Testing

1. Start Qdrant: `docker run -p 6333:6333 qdrant/qdrant`
2. Run service: `npm run dev`
3. Test document upload with curl
4. Verify embeddings in Qdrant dashboard
5. Test search API with sample queries
6. Test multi-tenant isolation
7. Test upload history and delete

### Integration Testing (3A + 3B)

1. Start both services
2. Upload document via dashboard
3. Verify in Qdrant
4. Check upload history
5. Test search via curl
6. Delete document via dashboard
7. Verify removal in Qdrant

---

## 📦 Dependencies Summary

### Admin Dashboard (Phase 3A)

- `react` `react-dom` or `next` - UI framework (TBD)
- `vite` or Next.js - Build tool (TBD)
- `tailwindcss` - Styling
- `shadcn/ui` - Component library
- `@supabase/supabase-js` - Supabase client
- `axios` - HTTP client
- `react-dropzone` - File upload
- `sonner` - Toast notifications

### RAG Service (Phase 3B)

- `express` - Web framework
- `@ai-sdk/openai` `ai` - Embeddings
- `@qdrant/js-client-rest` - Vector DB
- `@supabase/supabase-js` - Supabase Storage client
- `axios` - File downloads
- `pdf-parse` `mammoth` - File processing
- `winston` - Logging
- `typescript` - Type safety

---

## ⚙️ Configuration Required

### Environment Variables (.env)

**Admin Dashboard:**

```bash
VITE_RAG_API_URL=http://localhost:3001/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_DEV_MODE=true
```

**RAG Service:**

```bash
NODE_ENV=development
PORT=3001
OPENAI_API_KEY=sk-...
QDRANT_URL=http://localhost:6333
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_BUCKET_NAME=college-documents
TEMP_DOWNLOAD_DIR=./temp
MAX_FILE_SIZE=10485760
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## 🚀 Implementation Order

### Recommended Sequence:

1. **Phase 3B First** (6-8 hours)

   - Start with RAG service
   - Get core functionality working
   - Test with curl before building UI
   - Reason: Backend provides contract for frontend

2. **Phase 3A Second** (3-4 hours)
   - Build dashboard once API is stable
   - Can test against real endpoints
   - Faster development with working backend

**Alternative:** Build in parallel if you have team members

---

## 📋 Decisions Made & Pending

### ✅ File Storage: Supabase Storage

**Implementation Details:**

- **Bucket**: `college-documents`
- **Path Structure**: `{collegeId}/{timestamp}-{filename}`
- **Access**: Public URLs for RAG service
- **Free Tier**: 1GB storage, 2GB bandwidth/month
- **Features**: Automatic backups, CDN, resumable uploads
- **Security**: Row-level security policies per college

**Workflow:**

1. Admin uploads file via dashboard → Supabase Storage
2. Dashboard sends file URL + metadata → RAG Service
3. RAG Service downloads file from Supabase URL
4. Processes, embeds, stores in Qdrant
5. Original file remains in Supabase for backup

### ⏳ Frontend Framework: React + Vite vs Next.js 15 (Pending)

**Options:**

**Option 1: React + Vite**

- Pros: Lightweight, familiar from widget
- Cons: Manual auth setup, no SSR, no API routes
- Best for: Simple SPA

**Option 2: Next.js 15 (Recommended)**

- Pros: Built-in auth patterns, API routes, Server Components, familiar to you
- Cons: Heavier than needed for simple dashboard
- Best for: Admin dashboard with auth and future expansion

**Decision Needed**: User preference based on comfort level

---

## 🎯 Success Criteria

### Phase 3A Complete

- ✅ Dashboard loads and runs locally
- ✅ All UI components functional
- ✅ File upload works (to API)
- ✅ Upload history displays
- ✅ Responsive on mobile
- ✅ No console errors

### Phase 3B Complete

- ✅ RAG service runs locally
- ✅ Qdrant initializes automatically
- ✅ Document upload processes files
- ✅ Embeddings generated and stored
- ✅ Search returns relevant results
- ✅ Multi-tenant isolation works
- ✅ Upload history API works

### Phase 3 Integration Complete

- ✅ Dashboard connects to RAG API
- ✅ Upload documents end-to-end
- ✅ Search works via curl
- ✅ Delete documents works
- ✅ Ready for Phase 4 (chatbot integration)

---

## 🔜 Next Phase Preview

### Phase 4: Text Chatbot + RAG Integration

After Phase 3, you'll:

1. Add RAG tools to text chatbot (Phase 1)
2. Implement `search_documents` tool
3. Test chatbot with uploaded documents
4. Verify streaming works with RAG context

**Duration:** ~2 hours  
**Difficulty:** Easy (just adding tools to existing chatbot)

---

## 📚 Documentation Files Created

1. ✅ `/services/admin-dashboard/PHASE3A.md` - Complete dashboard guide
2. ✅ `/services/rag-service/PHASE3B.md` - Complete RAG service guide
3. ✅ This file - Phase 3 overview

---

## 💡 Tips for Implementation

1. **Start Backend First** - Get RAG working, then build UI
2. **Test Incrementally** - Test each step before moving on
3. **Use Qdrant Dashboard** - Visual verification of embeddings
4. **Mock Data First** - Frontend can mock API during backend dev
5. **Small Test Files** - Use small TXT files for faster testing
6. **Check Logs** - Winston logs show what's happening
7. **Monitor Qdrant** - Watch collection grow as you upload

---

## 🐛 Common Issues & Solutions

### Issue: Qdrant connection fails

**Solution:** Ensure Docker container running: `docker ps`

### Issue: File upload fails

**Solution:** Check file size limit and allowed extensions

### Issue: No embeddings generated

**Solution:** Verify OPENAI_API_KEY is set and valid

### Issue: Search returns empty

**Solution:** Check college_id matches uploaded documents

### Issue: CORS errors in dashboard

**Solution:** Add dashboard URL to ALLOWED_ORIGINS in RAG service

---

**Phase 3 Fully Documented! Ready to Start Coding 🚀**

**Recommended Start:** Phase 3B (RAG Service)  
**Estimated Total Time:** 10-12 hours  
**Complexity:** Medium  
**Blockers:** None (all dependencies documented)

---

**Decisions Made:**

1. ✅ File Storage: **Supabase Storage** (`college-documents` bucket)
2. ✅ Implementation Order: **Phase 3A first**, then 3B
3. ✅ Authentication: **Supabase Auth** (email/password)

**Decisions Pending:**

1. ⏳ **Frontend Framework**: React + Vite or Next.js 15?
   - Need your input based on comfort level
   - Next.js recommended for admin dashboard
2. Document categories: Use default 7 or customize?
3. Upload history: Qdrant metadata only or also Supabase DB?

**Next Step:** Decide on React + Vite vs Next.js 15 for Phase 3A implementation.

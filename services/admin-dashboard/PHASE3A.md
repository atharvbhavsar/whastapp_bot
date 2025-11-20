# Phase 3A: Admin Dashboard - Implementation Guide

**Status**: 🚧 Ready to Start  
**Goal**: Build simple admin dashboard for college document uploads  
**Tech Stack**: Next.js 15 (App Router), TypeScript, Shadcn UI, TailwindCSS, Supabase  
**Duration**: ~3-4 hours

---

## 📋 Overview

Phase 3A focuses on creating a clean, minimal admin interface where college administrators can:

1. Enter their College ID (or Name)
2. Upload documents (PDF, TXT, DOCX) to Supabase Storage
3. Specify document category (Admissions, Academics, Fees, etc.)
4. View upload status and history

**Key Principle**: Simple, functional UI with Supabase authentication (will be added). Documents stored in Supabase Storage.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│  Admin Dashboard (Next.js 15 - App Router)       │
│                                                  │
│  ┌────────────────────────────────────────┐    │
│  │  College ID Input (Shadcn Input)       │    │
│  └────────────────────────────────────────┘    │
│                                                  │
│  ┌────────────────────────────────────────┐    │
│  │  File Upload (Shadcn File Input)       │    │
│  │  - Multiple files                       │    │
│  │  - .pdf, .txt, .docx accepted          │    │
│  └────────────────────────────────────────┘    │
  "sonner": "^1.3.1",
  "date-fns": "^3.0.0",
  "@supabase/supabase-js": "^2.39.0"
│  │  - General, Admissions, Academics, etc.│    │
│  └────────────────────────────────────────┘    │
│                                                  │
│  ┌────────────────────────────────────────┐    │
│  │  Upload Button (Shadcn Button)         │    │
│  └────────────────────────────────────────┘    │
│                                                  │
│  ┌────────────────────────────────────────┐    │
│  │  Upload History (Shadcn Table/Card)    │    │
│  └────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
                    ↓ (Upload to Supabase Storage → POST file URL to RAG Service)
         ┌──────────────────────────┐
         │   RAG Service API         │
         │   POST /api/documents     │
         └──────────────────────────┘
```

---

## 📁 Complete File Structure

```
services/admin-dashboard/
│
│   ├── components/
│   │   ├── ui/                        # Shadcn UI components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   ├── label.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── progress.tsx
│   │   │   └── toast.tsx
│   │   │
│   │   ├── UploadForm.tsx             # Main upload form
│   │   ├── FileUploader.tsx           # Drag-n-drop file input
│   │   ├── UploadHistory.tsx          # List of uploads
│   │   └── StatsCard.tsx              # Upload statistics
│   │
│   ├── lib/
│   │   ├── utils.ts                   # cn() utility
│   │   └── api.ts                     # API client for RAG service
│   │
│   ├── hooks/
│   │   ├── useUpload.ts               # Upload logic hook
│   │   └── useUploadHistory.ts        # Fetch upload history
│   │
│   ├── types/
│   │   └── index.ts                   # Type definitions
│   │
│   └── styles/
│       └── globals.css                # Tailwind directives
│
├── public/
│   └── logo.svg                       # Dashboard logo
│
├── .env.example
├── .gitignore
├── components.json                    # Shadcn config
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.node.json
├── next.config.js
└── README.md
```

---

## 🎨 Sub-Steps Breakdown

// NOTE: When using Next.js App Router, prefer Client Components for interactive elements.
// Mark the file with 'use client' and ensure Supabase client is initialized in `lib/supabase.ts`.

### **Step 1: Project Initialization** (30 mins)

**Tasks:**

1. Create Next.js 15 project (App Router + TypeScript)
2. Install Tailwind CSS
3. Initialize Shadcn UI
4. Setup basic folder structure
5. Configure environment variables

**Commands:**

````bash
cd services/admin-dashboard


# Initialize Next.js 15 project (App Router enabled by default)
npx create-next-app@latest . --ts --app

# Install dependencies
npm install

# Install Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Install Shadcn UI
npx shadcn@latest init

**Recommended package.json scripts:**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
````

````

**Shadcn Config (`components.json`):**

```json
{
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/styles/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
  import { useState } from "react";
}
````

**Install Required Shadcn Components:**

```bash
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add card
npx shadcn@latest add label
npx shadcn@latest add select
npx shadcn@latest add table
npx shadcn@latest add badge
npx shadcn@latest add progress
npx shadcn@latest add toast
npx shadcn@latest add separator
```

**Environment Variables (`.env.example`):**

```bash
# RAG Service API Endpoint
# RAG Service API Endpoint (public API URL for client-side use)
NEXT_PUBLIC_RAG_API_URL=http://localhost:3001/api

# Supabase Configuration
# Supabase Configuration (public keys for client-side use)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Development mode
# Development mode (public flag for client-side use)
NEXT_PUBLIC_DEV_MODE=true
```

---

### **Step 2: Build Upload Form UI** (1 hour)

**Component: `UploadForm.tsx`**

**Features:**

- College ID input field
- File upload (drag-n-drop + click)
- Category selector dropdown
- Upload button with loading state
- Success/Error toast notifications

**Layout:**

```tsx
// src/components/UploadForm.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileUploader } from "./FileUploader";
import { useUpload } from "@/hooks/useUpload";

export function UploadForm() {
  const [collegeId, setCollegeId] = useState("");
  const [category, setCategory] = useState<string>("general");
  const [files, setFiles] = useState<File[]>([]);

  const { upload, isUploading, progress } = useUpload();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!collegeId || files.length === 0) {
      toast.error("Please fill all fields");
      return;
    }

    await upload({
      collegeId,
      category,
      files,
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Upload College Documents</CardTitle>
        <CardDescription>
          Upload PDFs, text files, or Word documents for RAG processing
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* College ID Input */}
          <div className="space-y-2">
            <Label htmlFor="collegeId">College ID</Label>
            <Input
              id="collegeId"
              placeholder="e.g., st-marys-college"
              value={collegeId}
              onChange={(e) => setCollegeId(e.target.value)}
              required
            />
            <p className="text-sm text-muted-foreground">
              Enter your unique college identifier
            </p>
          </div>

          {/* Category Selector */}
          <div className="space-y-2">
            <Label htmlFor="category">Document Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General Information</SelectItem>
                <SelectItem value="admissions">Admissions</SelectItem>
                <SelectItem value="academics">Academics</SelectItem>
                <SelectItem value="fees">Fees & Payments</SelectItem>
                <SelectItem value="placements">Placements</SelectItem>
                <SelectItem value="facilities">Facilities</SelectItem>
                <SelectItem value="events">Events & News</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* File Uploader */}
          <div className="space-y-2">
            <Label>Upload Documents</Label>
            <FileUploader
              files={files}
              onFilesChange={setFiles}
              accept=".pdf,.txt,.docx"
              maxFiles={10}
            />
          </div>

          {/* Upload Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isUploading || !collegeId || files.length === 0}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading... {progress}%
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Documents
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

---

### **Step 3: Build File Uploader Component** (45 mins)

**Component: `FileUploader.tsx`**

**Features:**

- Drag-and-drop zone
- Click to browse files
- Multiple file selection
- File preview with size
- Remove file button
- Accepted file types indicator

**Implementation:**

```tsx
// src/components/FileUploader.tsx
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Upload, FileText } from "lucide-react";

interface FileUploaderProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  accept?: string;
  maxFiles?: number;
}

export function FileUploader({
  files,
  onFilesChange,
  accept,
  maxFiles = 5,
}: FileUploaderProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFilesChange([...files, ...acceptedFiles].slice(0, maxFiles));
    },
    [files, onFilesChange, maxFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept ? { [accept]: [] } : undefined,
    maxFiles,
  });

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <Card
        {...getRootProps()}
        className={`border-2 border-dashed p-8 cursor-pointer transition-colors ${
          isDragActive ? "border-primary bg-primary/5" : "border-muted"
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center text-center">
          <Upload className="h-10 w-10 text-muted-foreground mb-4" />
          {isDragActive ? (
            <p className="text-lg font-medium">Drop files here...</p>
          ) : (
            <>
              <p className="text-lg font-medium mb-2">
                Drag & drop files here, or click to browse
              </p>
              <p className="text-sm text-muted-foreground">
                Supports: PDF, TXT, DOCX (Max {maxFiles} files)
              </p>
            </>
          )}
        </div>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Selected Files ({files.length})</p>
          {files.map((file, index) => (
            <Card key={index} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Install Dependencies:**

```bash
npm install react-dropzone @supabase/supabase-js
```

---

### **Step 4: Implement Upload Logic Hook** (45 mins)

- Handle direct Supabase Storage upload + RAG API call
- Track upload progress
- Show toast notifications
- Error handling
- Update upload history after success

**Implementation:**

```typescript
// src/hooks/useUpload.ts
"use client"; // mark as a Client Component in Next.js
import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@supabase/supabase-js";
import { uploadDocuments } from "@/lib/api";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface UploadParams {
  collegeId: string;
  category: string;
  files: File[];
}

export function useUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const upload = async ({ collegeId, category, files }: UploadParams) => {
    setIsUploading(true);
    setProgress(0);

    try {
      const documents: Array<{ url: string; filename: string; size: number }> =
        [];

      // Upload each file to Supabase Storage and collect public URLs
      for (const file of files) {
        const filename = `${collegeId}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("college-documents")
          .upload(filename, file, { upsert: false });

        if (uploadError) throw uploadError;

        const { data: publicData } = supabase.storage
          .from("college-documents")
          .getPublicUrl(filename);

        if (!publicData || !publicData.publicUrl) {
          throw new Error("Failed to get public URL after upload");
        }

        documents.push({
          url: publicData.publicUrl,
          filename: file.name,
          size: file.size,
        });
      }

      // Send JSON payload to RAG API with URLs for processing
      const response = await uploadDocuments(
        { collegeId, category, documents },
        (progressEvent) => {
          // The progress here will be the RAG service response/upload to server (if any)
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          );
          setProgress(percentCompleted);
        }
      );

      toast.success(`Successfully uploaded ${files.length} file(s)!`);

      return response;
    } catch (error: any) {
      toast.error(error.message || "Upload failed. Please try again.");
      throw error;
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  return { upload, isUploading, progress };
}
```

---

### **Step 5: Build API Client** (30 mins)

**File: `lib/api.ts`**

**Features:**

- Axios client configured for RAG service
- Upload documents endpoint
- Get upload history endpoint
- Error interceptors

**Implementation:**

```typescript
// src/lib/api.ts
import axios, { AxiosProgressEvent } from "axios";

const RAG_API_URL =
  process.env.NEXT_PUBLIC_RAG_API_URL || "http://localhost:3001/api";

const apiClient = axios.create({
  baseURL: RAG_API_URL,
  timeout: 120000, // 2 minutes for large files
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export interface UploadResponse {
  success: boolean;
  totalChunks: number;
  documents: Array<{
    filename: string;
    chunks: number;
    size: number;
  }>;
}

export interface UploadHistoryItem {
  id: string;
  collegeId: string;
  filename: string;
  category: string;
  chunks: number;
  uploadedAt: string;
}

export interface UploadDocumentPayload {
  collegeId: string;
  category: string;
  documents: Array<{ url: string; filename: string; size: number }>;
}

export async function uploadDocuments(
  payload: UploadDocumentPayload,
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void
): Promise<UploadResponse> {
  const response = await apiClient.post<UploadResponse>("/documents", payload, {
    onUploadProgress,
  });

  return response.data;
}

export async function getUploadHistory(
  collegeId: string
): Promise<UploadHistoryItem[]> {
  const response = await apiClient.get<UploadHistoryItem[]>(
    `/documents/history/${collegeId}`
  );
  return response.data;
}

export async function deleteDocument(documentId: string): Promise<void> {
  await apiClient.delete(`/documents/${documentId}`);
}
```

**Install Dependencies (server/client):**

```bash
npm install axios @supabase/supabase-js
```

---

### **Step 6: Build Upload History Component** (45 mins)

**Component: `UploadHistory.tsx`**

**Features:**

- Display uploaded documents in a table
- Show filename, category, chunks, upload date
- Delete button for each document
- Filter by category
- Pagination (if needed)

**Implementation:**

```tsx
// src/components/UploadHistory.tsx
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, RefreshCw } from "lucide-react";
import { getUploadHistory, deleteDocument, UploadHistoryItem } from "@/lib/api";
import { toast } from "sonner";

interface UploadHistoryProps {
  collegeId: string;
}

export function UploadHistory({ collegeId }: UploadHistoryProps) {
  const [history, setHistory] = useState<UploadHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchHistory = async () => {
    if (!collegeId) return;

    setIsLoading(true);
    try {
      const data = await getUploadHistory(collegeId);
      setHistory(data);
    } catch (error) {
      toast.error("Failed to fetch upload history");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [collegeId]);

  const handleDelete = async (documentId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      await deleteDocument(documentId);
      toast.success("Document deleted successfully");
      fetchHistory();
    } catch (error) {
      toast.error("Failed to delete document");
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      general: "default",
      admissions: "blue",
      academics: "green",
      fees: "yellow",
      placements: "purple",
      facilities: "orange",
      events: "pink",
    };
    return colors[category] || "default";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Upload History</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchHistory}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No documents uploaded yet
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Filename</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Chunks</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.filename}</TableCell>
                  <TableCell>
                    <Badge variant={getCategoryColor(item.category) as any}>
                      {item.category}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.chunks}</TableCell>
                  <TableCell>
                    {new Date(item.uploadedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
```

---

### **Step 7: Build Main App Layout** (30 mins)

**Component: `app/page.tsx` (Next.js App Router)**

**Features:**

- Header with logo and title
- Upload form section
- Upload history section
- Toast notifications

**Implementation:**

```tsx
// app/page.tsx
import { useState } from "react";
import { Toaster } from "sonner";
import { UploadForm } from "@/components/UploadForm";
import { UploadHistory } from "@/components/UploadHistory";
import { Separator } from "@/components/ui/separator";

function App() {
  const [currentCollegeId, setCurrentCollegeId] = useState("");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <header className="border-b bg-white/50 backdrop-blur-sm dark:bg-slate-900/50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-foreground">
                🎓
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">College Chatbot Admin</h1>
              <p className="text-sm text-muted-foreground">
                Document Management & RAG Processing
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Upload Form */}
        <UploadForm onCollegeIdChange={setCurrentCollegeId} />

        <Separator />

        {/* Upload History */}
        {currentCollegeId && <UploadHistory collegeId={currentCollegeId} />}
      </main>

      {/* Footer */}
      <footer className="border-t mt-16 py-6 text-center text-sm text-muted-foreground">
        <p>SIH 2025 - Language Agnostic Chatbot Project</p>
      </footer>
    </div>
  );
}

export default App;
```

---

## 🧪 Testing Checklist

### Step-by-Step Testing

- [ ] **Start Development Server**

  ```bash
  npm run dev # next dev
  ```

- [ ] **Visual Inspection**

  - [ ] Dashboard loads without errors
  - [ ] All Shadcn components styled correctly
  - [ ] Responsive design works (test mobile view)
  - [ ] Dark mode works (if implemented)

- [ ] **Form Validation**

  - [ ] Cannot submit without College ID
  - [ ] Cannot submit without files
  - [ ] Category selector has all options
  - [ ] Multiple files can be selected

- [ ] **File Upload**

  - [ ] Drag-and-drop works
  - [ ] Click to browse works
  - [ ] File preview shows correctly
  - [ ] Can remove individual files
  - [ ] File size displayed correctly

-- [ ] **Upload Process** (Mock API for now - Supabase + RAG)

- [ ] Loading state shows during direct Supabase upload
- [ ] Progress percentage updates during Supabase upload
- [ ] Files uploaded to Supabase Storage and public URLs returned
- [ ] Dashboard makes POST /api/documents with document URLs
- [ ] Success toast appears
- [ ] Form resets after success
- [ ] Error toast appears on failure

- [ ] **Upload History**
  - [ ] Loads when College ID entered
  - [ ] Table displays correctly
  - [ ] Refresh button works
  - [ ] Category badges colored correctly
  - [ ] Delete button prompts confirmation

---

## 📦 Dependencies

**Core:**

```json
{
  "next": "^15.0.0",
  "react": "^18.3.1",
  "react-dom": "^18.3.1"
}
```

**UI & Styling:**

```json
{
  "tailwindcss": "^3.4.1",
  "@radix-ui/react-*": "latest",
  "lucide-react": "^0.454.0",
  "class-variance-authority": "^0.7.0",
  "clsx": "^2.0.0",
  "tailwind-merge": "^2.2.0"
}
```

**Utilities:**

```json
{
  "axios": "^1.6.2",
  "react-dropzone": "^14.2.3",
  "sonner": "^1.3.1",
  "date-fns": "^3.0.0",
  "@supabase/supabase-js": "^2.39.0"
}
```

**Dev Dependencies:**

```json
{
  "next": "^15.0.0",
  "typescript": "^5.6.2",
  "@types/react": "^18.3.1",
  "@types/react-dom": "^18.3.1",
  "autoprefixer": "^10.4.16",
  "postcss": "^8.4.32"
}
```

---

## 🎯 Success Criteria

### Phase 3A Complete When:

- ✅ Dashboard runs locally (`npm run dev`)
- ✅ All Shadcn components installed and styled
- ✅ Upload form accepts College ID, files, and category
- ✅ File uploader supports drag-and-drop
- ✅ Upload logic hook implemented (even if API not ready)
- ✅ Upload history component displays mock data
- ✅ Toast notifications work for success/error
- ✅ Responsive design works on mobile
- ✅ Clean, professional UI matching project aesthetic
- ✅ No console errors
- ✅ TypeScript compiles without errors

---

## 🔜 Next Steps

After completing Phase 3A:

1. **Move to Phase 3B** - Build RAG Service API that dashboard will call
2. **Integration** - Connect dashboard to real RAG endpoints
3. **File Storage** - Implement actual file storage (you'll specify where)
4. **Testing** - End-to-end test with real uploads
5. **Deployment** - Deploy dashboard (Vercel/Netlify)

---

## 📝 Notes

**Implementation Decisions:**

1. **File Storage: Supabase Storage** ✅

   - Files uploaded to Supabase Storage bucket: `college-documents`
   - Path structure: `{collegeId}/{timestamp}-{filename}`
   - Public URLs generated for RAG service to download
   - Automatic backup and CDN distribution
   - Free tier: 1GB storage, 2GB bandwidth/month

2. **Upload History Storage:**

   - Stored in Qdrant as part of vector metadata
   - Can also use Supabase PostgreSQL for relational queries (Phase 3B)

3. **Authentication:**
   - Will use Supabase Auth
   - Email/password or OAuth providers
   - Row-level security for multi-tenant isolation

**Design Decisions:**

- Using Shadcn "new-york" style for modern look
- Next.js 15 App Router (single main page initially; add nested routes/pages later as needed)
- College ID as simple text input (not dropdown)
- Multiple file upload support (max 10 files)
- 7 document categories (can expand later)

---

**Phase 3A Ready to Code! 🚀**

**Estimated Time:** 3-4 hours  
**Complexity:** Low-Medium  
**Blockers:** None (can mock API responses)

Next: Wait for your confirmation to start Phase 3B (RAG Service) documentation.

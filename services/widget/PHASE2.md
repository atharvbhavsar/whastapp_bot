# Phase 2: Widget (Text Chat UI) - Implementation Guide

**Status**: 🚧 In Progress  
**Goal**: Build embeddable React widget with Shadcn UI connecting to Phase 1 chatbot API  
**Tech Stack**: React, TypeScript, Vite, Shadcn UI, Vercel AI SDK

---

## 📋 Sub-Phases Breakdown

### **Phase 2A: UI & Shadcn Setup** 🎨

**Goal**: Setup project, install Shadcn, build static chat UI components  
**Duration**: ~2 hours  
**Testable Output**: Beautiful static chat interface with all UI components

### **Phase 2B: Hooks & Streaming Integration** 🔌

**Goal**: Connect UI to Phase 1 API, implement real-time SSE streaming  
**Duration**: ~2 hours  
**Testable Output**: Working chat - send message, see AI stream response in real-time

### **Phase 2C: Widget Embedding & Distribution** 📦

**Goal**: Build as embeddable widget, create CDN-ready bundle  
**Duration**: ~2.5 hours  
**Testable Output**: Widget works on any website via script tag

---

## 🎨 Phase 2A: UI & Shadcn Setup

### Step 1: Project Initialization (30 mins)

**Tasks:**

1. Initialize `package.json` with Vite + React
2. Install core dependencies
3. Setup TypeScript configuration
4. Setup Tailwind CSS + PostCSS
5. Create basic folder structure

**Dependencies to Install:**

```bash
# Core
npm install react react-dom

# Dev dependencies
npm install -D vite @vitejs/plugin-react typescript
npm install -D tailwindcss autoprefixer postcss
npm install -D @types/react @types/react-dom
```

**Files to Create:**

- ✅ Folders already created
- `package.json`
- `tsconfig.json`
- `tsconfig.node.json`
- `vite.config.ts`
- `tailwind.config.js`
- `postcss.config.js`
- `index.html` (dev entry point)

---

### Step 2: Shadcn UI Installation (30 mins)

**Tasks:**

1. Initialize Shadcn CLI
2. Configure `components.json`
3. Setup `utils.ts` with `cn` helper
4. Install required Shadcn components

**Shadcn Init:**

```bash
npx shadcn@latest init
```

**Components to Install:**

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add input
npx shadcn@latest add scroll-area
npx shadcn@latest add avatar
npx shadcn@latest add badge
npx shadcn@latest add separator
```

**Files Created by Shadcn:**

- `components.json`
- `src/lib/utils.ts`
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/scroll-area.tsx`
- `src/components/ui/avatar.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/separator.tsx`

---

### Step 3: Global Styling (15 mins)

**Tasks:**

1. Create global CSS with Shadcn theme variables
2. Add custom animations
3. Setup widget-specific styles

**Files to Create:**

- `src/styles/globals.css` - Shadcn theme + custom styles
- `src/styles/animations.css` - Widget animations

**Styling Features:**

- Shadcn CSS variables (light theme for v1)
- Smooth animations (slide-up, fade-in)
- Responsive utilities
- Widget-specific overrides

---

### Step 4: TypeScript Types (15 mins)

**Tasks:**

1. Define core interfaces
2. Create type definitions for messages, config, state

**Files to Create:**

- `src/types/index.ts`

**Types to Define:**

```typescript
// Message structure
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: Date;
}

// Widget configuration
interface WidgetConfig {
  collegeId: string;
  apiEndpoint: string;
  primaryColor?: string;
}

// Chat state
interface ChatState {
  isOpen: boolean;
  isMinimized: boolean;
  hasUnread: boolean;
}
```

---

### Step 5: Static UI Components (2 hours)

**A. Message Components (45 mins)**

**Files to Create:**

- `src/components/chat/MessageBubble.tsx`
- `src/components/chat/MessageList.tsx`
- `src/components/chat/TypingIndicator.tsx`

**MessageBubble Features:**

- User message: Blue background, right-aligned
- Bot message: Gray background, left-aligned, avatar
- Timestamp display
- Smooth fade-in animation

**MessageList Features:**

- Scrollable container (Shadcn ScrollArea)
- Auto-scroll to bottom
- Empty state ("Start a conversation...")
- Loading skeleton

**TypingIndicator:**

- Animated dots (3 dots bouncing)
- Shows when bot is "thinking"

---

**B. Input Component (30 mins)**

**Files to Create:**

- `src/components/chat/MessageInput.tsx`

**Features:**

- Shadcn Input component
- Send button (Shadcn Button)
- Enter key to send
- Auto-resize textarea (optional)
- Disabled state during sending
- Character limit indicator (optional)

---

**C. Chat Window (30 mins)**

**Files to Create:**

- `src/components/chat/ChatHeader.tsx`
- `src/components/chat/ChatWindow.tsx`

**ChatHeader Features:**

- Title: "College Assistant"
- Minimize button
- Close button
- Shadcn Badge for status (Online)

**ChatWindow Features:**

- Shadcn Card container
- Header + MessageList + MessageInput layout
- Fixed dimensions (400x600px desktop)
- Responsive (full screen on mobile)
- Shadow and border radius

---

**D. Floating Button (15 mins)**

**Files to Create:**

- `src/components/FloatingButton.tsx`

**Features:**

- Circular button (bottom-right)
- Chat bubble icon (from lucide-react)
- Pulse animation
- Badge with unread count
- Fixed positioning

---

### Step 6: Main App Component (Static) (30 mins)

**Files to Create:**

- `src/App.tsx`
- `src/main.tsx`

**App.tsx Features:**

- Toggle between chat window open/closed
- Floating button always visible
- State management for isOpen
- Mock messages for UI testing

**main.tsx:**

- React root mounting
- Import global styles
- Development-only rendering

---

### ✅ Phase 2A Success Criteria

**At the end of Phase 2A, you should have:**

- ✅ Beautiful Shadcn-styled chat interface
- ✅ All UI components working statically
- ✅ Mock messages displayed correctly
- ✅ Floating button toggles chat window
- ✅ Responsive design (desktop + mobile)
- ✅ Smooth animations
- ✅ No API integration yet (static UI only)

**Test Command:**

```bash
npm run dev
# Open http://localhost:5173
# Should see floating button
# Click to open/close chat
# See mock messages in beautiful UI
```

---

## 🔌 Phase 2B: Hooks & Streaming Integration

### Step 1: Utilities & Constants (15 mins)

**Files to Create:**

- `src/lib/constants.ts` - API endpoints, config
- `src/lib/session.ts` - Session ID generation
- `src/lib/storage.ts` - localStorage helpers

**Features:**

- Generate unique session IDs
- Store/retrieve session from localStorage
- API endpoint configuration
- Default widget settings

---

### Step 2: Install AI SDK (5 mins)

**Dependencies:**

```bash
npm install ai
```

---

### Step 3: useChat Hook (1 hour)

**Files to Create:**

- `src/hooks/useChat.ts`

**Implementation:**

```typescript
import { useChat as useVercelChat } from "ai/react";
import { getSessionId } from "@/lib/session";
import { API_ENDPOINT } from "@/lib/constants";

export function useChat(collegeId: string) {
  const sessionId = getSessionId();

  const chat = useVercelChat({
    api: API_ENDPOINT,
    body: {
      collegeId,
      sessionId,
    },
    onError: (error) => {
      console.error("Chat error:", error);
    },
  });

  return chat;
}
```

**Features:**

- Wraps Vercel AI SDK's `useChat`
- Automatically handles SSE streaming
- Includes session ID in requests
- Error handling
- Returns: `messages`, `input`, `handleSubmit`, `isLoading`

---

### Step 4: Widget State Hook (30 mins)

**Files to Create:**

- `src/hooks/useWidgetState.ts`

**Features:**

- Manage open/closed state
- Persist state in localStorage (optional)
- Unread message counter
- Minimize/maximize logic

---

### Step 5: Connect Hooks to Components (1 hour)

**Tasks:**

1. Update `App.tsx` to use real `useChat` hook
2. Update `MessageInput.tsx` to use `handleSubmit`
3. Update `MessageList.tsx` to render real messages
4. Update `TypingIndicator` to show during `isLoading`
5. Remove all mock data

**Changes:**

**App.tsx:**

```typescript
const { messages, input, handleInputChange, handleSubmit, isLoading } =
  useChat(collegeId);
```

**MessageInput.tsx:**

- Use `input`, `handleInputChange`, `handleSubmit` from props
- Disable input during `isLoading`

**MessageList.tsx:**

- Map over `messages` array
- Show TypingIndicator when `isLoading`

---

### Step 6: Environment Configuration (15 mins)

**Files to Create:**

- `.env.example`
- `.env`

**Variables:**

```bash
VITE_API_ENDPOINT=http://localhost:3000/api/chat
VITE_COLLEGE_ID=TEST_COLLEGE
```

---

### Step 7: Error Handling & Edge Cases (30 mins)

**Tasks:**

1. Handle API connection errors
2. Show error messages in UI
3. Retry mechanism (optional)
4. Offline detection

**Features:**

- Error message component
- Connection status indicator
- Graceful degradation

---

### ✅ Phase 2B Success Criteria

**At the end of Phase 2B, you should be able to:**

- ✅ Start Phase 1 API server
- ✅ Start widget dev server
- ✅ Open widget in browser
- ✅ Type a message and send
- ✅ See message appear instantly
- ✅ See bot response stream word-by-word
- ✅ Have full conversation with context
- ✅ Test multilingual (Hindi, Tamil, etc.)
- ✅ See typing indicator during streaming
- ✅ Session persists on page reload

**Testing Flow:**

```bash
# Terminal 1: Start Phase 1 API
cd services/text-chatbot
npm run dev

# Terminal 2: Start Widget
cd services/widget
npm run dev

# Browser: http://localhost:5173
# Test: Send "Hello, what can you help me with?"
# Expected: See streaming response from GPT-4o
```

---

## 📦 Phase 2C: Widget Embedding & Distribution

### Step 1: Vite Build Configuration (30 mins)

**Files to Update:**

- `vite.config.ts`

**Configuration:**

```typescript
export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: "src/main.tsx",
      name: "CollegeChatbot",
      fileName: "widget",
      formats: ["iife"],
    },
    rollupOptions: {
      output: {
        assetFileNames: "widget.[ext]",
      },
    },
  },
});
```

**Output:**

- `dist/widget.js` - IIFE bundle
- `dist/widget.css` - Styles

---

### Step 2: Embed Script (1 hour)

**Files to Create:**

- `public/embed.js`

**Features:**

- Extract `data-college-id` from script tag
- Load widget bundle dynamically
- Inject widget into page
- Prevent multiple instances
- Handle initialization

**Usage:**

```html
<script
  src="https://your-cdn.com/embed.js"
  data-college-id="GOV_COLLEGE_123"
></script>
```

---

### Step 3: Widget Initialization (30 mins)

**Tasks:**

1. Update `main.tsx` for IIFE mode
2. Create global initialization function
3. Handle college ID from embed script
4. Mount widget to page

---

### Step 4: Build & Test (30 mins)

**Tasks:**

1. Build widget: `npm run build`
2. Create test HTML page
3. Test locally
4. Test on different domains

**Test HTML:**

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Test College Website</title>
    <link rel="stylesheet" href="./dist/widget.css" />
  </head>
  <body>
    <h1>Welcome to Test College</h1>
    <p>This is our college website.</p>

    <script src="./dist/widget.js"></script>
    <script>
      CollegeChatbot.init({
        collegeId: "TEST_COLLEGE",
        apiEndpoint: "http://localhost:3000/api/chat",
      });
    </script>
  </body>
</html>
```

---

### Step 5: Optimization (1 hour)

**Tasks:**

1. Code splitting (if needed)
2. Lazy load components
3. Minify bundle
4. Optimize images/icons
5. Add source maps

**Target Bundle Size:**

- Main bundle: < 150KB (gzipped)
- CSS: < 20KB (gzipped)
- Total: < 200KB

---

### Step 6: Documentation (30 mins)

**Files to Create:**

- `README.md` - Installation & usage guide
- `DEVELOPMENT.md` - Development setup

**README Contents:**

- Quick start guide
- Installation instructions
- Configuration options
- Customization guide
- Troubleshooting

---

### ✅ Phase 2C Success Criteria

**At the end of Phase 2C, you should have:**

- ✅ Widget builds successfully
- ✅ Single `embed.js` script works
- ✅ Widget loads on any HTML page
- ✅ No conflicts with host website
- ✅ Works on different domains
- ✅ Mobile responsive
- ✅ Production-ready bundle
- ✅ Complete documentation

**Final Test:**

```bash
# Build
npm run build

# Test with local server
npx serve dist

# Create test.html and open in browser
# Widget should appear and work perfectly
```

---

## 📊 Complete Feature Checklist

### Phase 2A (UI) ✅

- [ ] Project setup with Vite + React + TypeScript
- [ ] Tailwind CSS configured
- [ ] Shadcn UI installed and configured
- [ ] All Shadcn components added (button, card, input, etc.)
- [ ] MessageBubble component (user + bot styles)
- [ ] MessageList component with scroll
- [ ] MessageInput component with send button
- [ ] TypingIndicator component
- [ ] ChatHeader component
- [ ] ChatWindow component
- [ ] FloatingButton component
- [ ] App.tsx with static UI
- [ ] Global styles and animations
- [ ] Responsive design tested

### Phase 2B (Hooks & Streaming) ✅

- [ ] `ai` package installed
- [ ] Session management utilities
- [ ] Constants and configuration
- [ ] `useChat` hook implemented
- [ ] `useWidgetState` hook implemented
- [ ] Components connected to hooks
- [ ] Real messages rendering
- [ ] SSE streaming working
- [ ] Error handling implemented
- [ ] Environment variables setup
- [ ] Full conversation tested
- [ ] Multilingual tested

### Phase 2C (Embedding) ✅

- [ ] Vite IIFE build configured
- [ ] Embed script created
- [ ] Widget initialization logic
- [ ] Build optimization
- [ ] Bundle size < 200KB
- [ ] Test HTML page created
- [ ] Cross-domain tested
- [ ] Mobile responsive verified
- [ ] Documentation written
- [ ] Production ready

---

## 🎯 Testing Strategy

### Phase 2A Testing:

```bash
npm run dev
# Visual inspection of all UI components
# Test responsiveness (resize browser)
# Test animations (open/close chat)
# Verify Shadcn components render correctly
```

### Phase 2B Testing:

```bash
# Terminal 1
cd services/text-chatbot && npm run dev

# Terminal 2
cd services/widget && npm run dev

# Browser tests:
# 1. Send English message → verify streaming
# 2. Send Hindi message → verify response in Hindi
# 3. Send multiple messages → verify context maintained
# 4. Reload page → verify session persists
# 5. Open DevTools Network → verify SSE connection
```

### Phase 2C Testing:

```bash
npm run build
npx serve dist

# Create test.html with embed script
# Open in different browsers (Chrome, Firefox, Safari)
# Test on mobile device
# Verify no console errors
# Check bundle size: ls -lh dist/
```

---

## 🚀 Development Workflow

### Daily workflow:

```bash
# 1. Start both servers
cd services/text-chatbot && npm run dev &
cd services/widget && npm run dev

# 2. Make changes
# 3. Save (hot reload happens automatically)
# 4. Test in browser
# 5. Commit when feature complete
```

### Build workflow:

```bash
# Development build
npm run build

# Preview production build
npm run preview

# Analyze bundle
npm run build -- --mode analyze
```

---

## 📝 Phase Dependencies

- **Phase 2A** → No dependencies (can start immediately)
- **Phase 2B** → Requires Phase 1 API running + Phase 2A complete
- **Phase 2C** → Requires Phase 2B complete and tested

---

## ⏱️ Time Estimates

| Phase                     | Duration      | Cumulative |
| ------------------------- | ------------- | ---------- |
| **2A: UI & Shadcn**       | ~2 hours      | 2 hours    |
| **2B: Hooks & Streaming** | ~2 hours      | 4 hours    |
| **2C: Embedding**         | ~2.5 hours    | 6.5 hours  |
| **Total**                 | **6.5 hours** | -          |

---

## 🎓 Learning Goals

**After completing Phase 2, you will understand:**

- ✅ How to build embeddable widgets with React + Vite
- ✅ How to use Shadcn UI for modern component design
- ✅ How to integrate Vercel AI SDK's `useChat` hook
- ✅ How SSE streaming works in React
- ✅ How to build IIFE bundles for CDN distribution
- ✅ How to handle multi-tenant widget initialization
- ✅ How to optimize bundle sizes for production

---

## 📚 Resources

### Documentation:

- [Vite Guide](https://vitejs.dev/guide/)
- [Shadcn UI Components](https://ui.shadcn.com)
- [Vercel AI SDK - useChat](https://sdk.vercel.ai/docs/reference/ai-sdk-ui/use-chat)
- [React TypeScript](https://react-typescript-cheatsheet.netlify.app)

### Tools:

- [Vite Bundle Analyzer](https://github.com/btd/rollup-plugin-visualizer)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - Performance testing
- [BrowserStack](https://www.browserstack.com) - Cross-browser testing

---

**Phase 2 Ready to Start! 🚀**

Current Status: Ready to begin Phase 2A (UI & Shadcn Setup)

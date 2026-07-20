# WorkSpaceIQ (ChanceScribe)

WorkSpaceIQ is an elite, premium AI Knowledge Workspace designed to transform all your user-added content into a single, intelligent knowledge system. By combining natural language processing, audio translation, vector databases, and real-time knowledge graph topologies, it provides a comprehensive **GraphRAG** platform for researchers, students, and professionals.

---

## Technical Stack & Architecture

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Next.js 16 (App Router), Tailwind CSS 4, Framer Motion |
| **Authentication** | Firebase Authentication (Google + Email/Password) |
| **Database** | Cloud Firestore (`users/{uid}/items`, `users/{uid}/projects`, `users/{uid}/kg_nodes`, `users/{uid}/kg_edges`) |
| **Vector DB** | Pinecone (`chancescribe` index, `text-embedding-3-small` 1536-dimensional embeddings) |
| **AI Processing** | OpenAI GPT-5.4, Whisper-1 (Speech-to-Text), TTS-1 (Text-to-Speech) |
| **Deployment** | Firebase App Hosting (Cloud Run serverless containers) |

---

## Key Features

### 1. Unified GraphRAG Engine
* **Incremental Entity Extraction**: Automatically extracts entity nodes (people, projects, concepts, tools) and relationship edges using **GPT-5.4** as documents are uploaded.
* **Deterministic Hashing & Merging**: Automatically merges entities named across different documents (e.g., a PDF and an MP4 video) into single, unified nodes with cumulative weights and expanded properties.
* **Dual-Retrieval Modes**:
  * **Local Search (Focused)**: Combines vector similarity (Pinecone) with local sub-graph traversals (Firestore) to check specific facts and trace adjacent concepts.
  * **Global Search (Thematic)**: Scans the entire workspace graph structure, compiling a map of top-level concepts and primary connections to answer broad, synthesis questions.

### 2. Multi-Modal Ingestion & Extended Formats
* **Standard Documents**: PDF, DOCX, TXT, and Markdown (`.md`).
* **Rich Formats**: Zero-dependency in-memory unzip parsing for PowerPoint presentations (`.pptx`) and eBooks (`.epub`).
* **Rich Media**: Transcribes audio (`.mp3`, `.wav`, `.m4a`, `.webm`) and video (`.mp4`, `.mov`) files using Whisper, mapping content to searchable timestamps.
* **Web Scraping**: Extract web pages and transcripts from YouTube, Vimeo, and Loom video URLs.

### 3. Interactive Relationship Visualizations
* Built-in interactive force-directed graph canvas using HTML5 Canvas (zero external bundle dependencies).
* Color-coded entity types (people, databases, APIs, locations, concepts, etc.) with mouse hover tooltips, click events, and real-time zoom/pan.
* Rendered globally in the **Knowledge Hub** and locally inside the **Research** workspace to trace document topologies in real-time.

### 4. Studio & Voice Synthesis
* **Flow Dictation**: Real-time voice-to-text journaling and memo capturing.
* **AI Podcast (Deep Dive)**: Turn any collection of sources into an engaging, multi-host podcast discussion with custom voice selectors.

---

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── knowledge/
│   │   │   │   ├── ingest/       # POST (register + index), DELETE (clean registry/vectors/graph)
│   │   │   │   ├── query/        # Streams hybrid-retrieval responses with citations
│   │   │   │   └── status/       # Poll active indexing jobs & retrieve workspace stats
│   │   │   └── ichancellor/      # Floating companion overlay chat endpoint
│   │   └── dashboard/
│   │       └── page.tsx          # Main workspace panel & tabs
│   ├── components/
│   │   ├── KnowledgeHub.tsx      # Knowledge tab with Search, Graph, and Sources views
│   │   ├── GraphVisualization.tsx# Interactive HTML5 Canvas graph rendering
│   │   ├── ResearchChat.tsx      # In-project research chat with GraphRAG toggle
│   │   └── SourceUploader.tsx    # Upload queue mapping files to the ingestion route
│   ├── lib/
│   │   ├── firebase/
│   │   │   └── knowledge-sources.ts # CRUD and content-hash dedup registry
│   │   └── rag/
│   │       ├── knowledge-graph.ts  # Node/edge merging & traversal operations
│   │       ├── entity-extractor.ts # GPT-5.4 extraction schema
│   │       ├── citation-mapper.ts  # Page & timestamp mapping logic
│   │       └── hybrid-retriever.ts # Local vs Global search aggregator
```

---

## Development

First, set up your environment variables:
```bash
OPENAI_API_KEY=your_key
PINECONE_API_KEY=your_key
NEXT_PUBLIC_FIREBASE_API_KEY=your_key
```

Run the development server:
```bash
npm run dev
```

Build verification:
```bash
npx tsc --noEmit
npm run build
```

---

## Agentic AI Team & Orchestration

Behind WorkSpaceIQ is a team of specialized AI agents working together as a collaborative workforce to carry out tasks and complete goals:

1. **Ingestion Agent (The Document Specialist)**: 
   Responsible for mapping layout, page breaks, and content metadata across various files (`.pdf`, `.docx`, `.md`, `.rtf`, `.pptx`, `.epub`). It extracts text and table matrices in-memory.
2. **Whisper STT Agent (The Audio Transcriber)**: 
   Processes spoken words in multi-modal video (`.mp4`, `.mov`) and audio (`.mp3`, `.wav`, `.m4a`, `.webm`) formats, outputting detailed transcripts annotated with groundable timestamps.
3. **Entity Extractor Agent (The Knowledge Mapper)**: 
   Powered by GPT-5.4, this agent scans text chunks to extract concept nodes and relationship edges. It executes **deterministic node merging** so that references across multiple files consolidate into a single identity.
4. **Sydney & Chancellor Agents (The Podcasters)**: 
   Collaborate to write audio scripts and host the personal **Deep Dive Podcast** sessions, representing complementary strategic and investigative perspectives.
5. **Orchestration Agent (The Retriever & Compiler)**: 
   Aggregates local vector search (Pinecone) and global graph traversals (Firestore). It compiles a citation-grounded answer format using GPT-5.4, which it presents directly to the user.

### Agentic Framework: LangGraph
The system uses the **LangGraph** framework (`@langchain/langgraph`) to orchestrate these agents. Rather than running a linear prompt chain, LangGraph models agents as stateful graphs:
* **Stateful Graph Nodes**: Agents maintain a shared memory state tracking query context and active tool invocation history.
* **Thinking-Acting-Observing Loop**: The execution cycles between **Agent Nodes** (where the LLM reasons and select tools) and **Tool Nodes** (where operations are executed and returned to the state).
* **MCP Readiness**: Decoupled tool configurations ensure compatibility with the **Model Context Protocol (MCP)** for accessing external database networks.

### Agentic Toolset
Agents have access to a suite of tools to retrieve, analyze, and render information:
* **Multi-Format Ingestion Engine**: Parses text/tables in-memory from `.pdf`, `.docx`, `.md`, `.rtf`, `.epub`, and `.pptx` documents.
* **Whisper Audio/Video STT Tool**: Transcribes speech from `.mp3`, `.wav`, `.webm`, `.m4a`, `.mp4`, and `.mov` files with matching timestamp schemas.
* **URL Content Extractor Tool**: Fetches clean page text and transcripts from websites and media links (YouTube, Vimeo, Loom).
* **Pinecone Vector Search Tool**: Conducts semantic similarity queries over indexed vectors using user-scoped metadata filters.
* **Firestore Graph Traversal Tool**: Resolves node paths and edge links across Firestore collections to pull concept relations.
* **Tavily Web Search Integration**: Allows agents to run external searches when workspace documents do not cover a topic.
* **OpenAI Text-to-Speech Synthesizer**: Converts podcast and briefing scripts into high-quality spoken audio tracks.



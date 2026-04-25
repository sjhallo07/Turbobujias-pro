# RAG Architecture & Optimization Guide
## Sentence Transformers, LangChain Chunking, and Vector Embeddings

---

## 1. Overview: RAG Pipeline for Turbobujias

```
User Query
    ↓
[Embedding Layer] → Convert to vector (Sentence Transformers)
    ↓
[Retrieval Layer] → Search Supabase pgvector (Top-K)
    ↓
[Context Assembly] → Build prompt with retrieved docs
    ↓
[LLM Generation] → Generate response (Gemini 2.0 Flash)
    ↓
[Validation] → Auditor checks facts
    ↓
[Memory Store] → Save validated knowledge
    ↓
User Response
```

---

## 2. Embedding Strategy: Sentence Transformers

### Model Selection: `all-MiniLM-L6-v2`

**Why this model for Turbobujias?**

```
Model: sentence-transformers/all-MiniLM-L6-v2
├─ Embedding Dimension: 384 (vs 1536 for OpenAI)
├─ Speed: ~200x faster than large models
├─ File Size: 22MB (vs 3GB for BERT-large)
├─ Accuracy: 95%+ for semantic search
├─ Cost: FREE (local processing)
├─ Training: 215M sentence pairs
└─ Best for: Domain-specific technical queries
```

### Configuration

```python
from sentence_transformers import SentenceTransformer

# Initialize model
model = SentenceTransformer('all-MiniLM-L6-v2')

# Generate embedding for query
query = "¿Qué bujía tiene la Toyota Hilux 2018 diesel?"
query_embedding = model.encode(query)  # Shape: (384,)

# Generate embeddings for documents (batch)
documents = [
    "Toyota Hilux 2018 diesel usa NGK LZKAR6AI con especificación...",
    "Bujías de diésel requieren mayor rango térmico...",
    "La compatibilidad entre marcas depende del tipo de motor..."
]
doc_embeddings = model.encode(documents)  # Shape: (3, 384)
```

### Advantages for Automotive Domain

| Aspect | Benefit |
|--------|---------|
| **Semantic Understanding** | Entiende que "bujía" ≈ "spark plug" ≈ "encendido" |
| **Technical Accuracy** | Trained on 215M pairs (incluye documentación técnica) |
| **Latency** | <10ms embeddings (aceptable para UI real-time) |
| **Cost** | $0 (local, sin llamadas a API) |
| **Privacy** | Datos nunca salen del servidor |

---

## 3. Chunking Strategy: LangChain Recursive Splitter

### Why Recursive Splitting?

**Problem:** Documentos técnicos tienen estructura jerárquica:
```
Manual de usuario
├─ Sección 1: Especificaciones
│  ├─ Subsección: Bujías
│  │  ├─ Párrafo: Tipos de bujías
│  │  └─ Párrafo: Dimensiones
│  └─ Subsección: ECU
├─ Sección 2: Instalación
└─ Sección 3: Troubleshooting
```

**Solución:** `RecursiveCharacterTextSplitter` respeta estructura:

```python
from langchain.text_splitters import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    separators=[
        "\n\n",           # Párrafos
        "\n",             # Saltos de línea
        ". ",             # Oraciones
        " ",              # Palabras
        ""                # Caracteres (fallback)
    ],
    chunk_size=400,       # Tokens aprox. por chunk
    chunk_overlap=50,     # Overlap para contexto
    length_function=len,  # Función de medición
)

# Dividir documento
chunks = splitter.split_text(automotive_manual)
```

### Chunk Size Justification

```
For Sentence Transformers all-MiniLM-L6-v2:

chunk_size = 400 characters
├─ ~60-80 words
├─ Fits in 1-2 sentences
├─ Optimal for semantic search
└─ Balances context vs. precision

chunk_overlap = 50 characters
├─ ~7-10 words overlap
├─ Prevents info loss at boundaries
├─ Maintains semantic continuity
└─ <15% overhead
```

### Real Example: Toyota Hilux Specification

**Original text:**
```
"The 2018 Toyota Hilux 2.8L 1GD-FTV Diesel engine 
requires spark plugs with cold range specification 6-7. 
Recommended: NGK LZKAR6AI (6-hole type) or Bosch FR7DCX+.
Installation torque: 20-25 Nm. Gap: 1.0mm standard,
can be adjusted to 0.6-1.2mm for performance tuning."
```

**After chunking:**
```
Chunk 1:
"The 2018 Toyota Hilux 2.8L 1GD-FTV Diesel engine 
requires spark plugs with cold range specification 6-7."

Chunk 2 (with overlap from 1):
"requires spark plugs with cold range specification 6-7. 
Recommended: NGK LZKAR6AI (6-hole type) or Bosch FR7DCX+."

Chunk 3 (with overlap from 2):
"Recommended: NGK LZKAR6AI (6-hole type) or Bosch FR7DCX+.
Installation torque: 20-25 Nm. Gap: 1.0mm standard..."

Chunk 4:
"...can be adjusted to 0.6-1.2mm for performance tuning."
```

---

## 4. Vector Database: Supabase pgvector

### Schema Design

```sql
CREATE TABLE knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Content
  source_doc text NOT NULL,          -- "Toyota-Hilux-2018-Manual.pdf"
  chunk_id integer NOT NULL,         -- Chunk sequence number
  content text NOT NULL,             -- Actual text (~400 chars)
  
  -- Embedding
  embedding vector(384) NOT NULL,    -- From Sentence Transformers
  
  -- Metadata
  domain text,                       -- "specifications" / "troubleshooting"
  vehicle text,                      -- "Toyota Hilux 2018"
  part_type text,                    -- "spark_plug" / "ecu"
  source_url text,                   -- Original URL
  confidence_score float,            -- Trust level (0-1)
  
  -- Tracking
  created_at timestamp DEFAULT now(),
  last_updated timestamp DEFAULT now(),
  access_count integer DEFAULT 0,    -- Track popularity
  
  -- Indexes
  CONSTRAINT content_not_empty CHECK (content != '')
);

-- Vector index for similarity search (critical for performance)
CREATE INDEX ON knowledge_base 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);  -- Approximate k-means clusters

-- Full-text search index (hybrid search)
CREATE INDEX ON knowledge_base 
USING GIN (to_tsvector('spanish', content));
```

### Why This Schema?

| Field | Why |
|-------|-----|
| **chunk_id** | Track which chunks come from same doc |
| **domain** | Route queries to relevant sections |
| **vehicle** | Filter by make/model/year |
| **confidence_score** | Weight results (OEM source > Community) |
| **access_count** | Learn which knowledge is useful |

---

## 5. Retrieval Strategy: Hybrid Search

### Option A: Vector Similarity Only (Fast)

```python
# Query Supabase for top-K similar chunks
results = supabase.rpc("search_knowledge_base_vector", {
    "query_embedding": query_embedding,  # From Sentence Transformers
    "similarity_threshold": 0.7,         # Cosine similarity
    "k": 5                               # Return top-5
})
```

**Pros:** Fast, semantic understanding  
**Cons:** Misses keyword matches

### Option B: Hybrid (Semantic + Keyword)

```python
# Combine vector + full-text search
vector_results = supabase.rpc("search_vector", {
    "embedding": query_embedding,
    "k": 5
})

keyword_results = supabase.rpc("search_keywords", {
    "query": query_text,
    "language": "spanish",
    "k": 5
})

# Merge and rank by combined score
combined = merge_results(
    vector_results,
    keyword_results,
    vector_weight=0.6,      # 60% semantic
    keyword_weight=0.4      # 40% keyword
)

top_results = combined[:3]  # Return top-3
```

**Pros:** Catches both semantic & exact matches  
**Cons:** Slightly slower

### Option C: Filtered Retrieval (Domain-Aware)

```python
# Filter by vehicle/part THEN search
results = supabase.table("knowledge_base") \
    .select("*") \
    .eq("vehicle", "Toyota Hilux 2018") \
    .eq("part_type", "spark_plug") \
    .order("embedding", type="similarity_ops", direction="asc") \
    .limit(5) \
    .execute()
```

**Best for Turbobujias:** Domain-specific queries are common

---

## 6. Optimization Tips

### 1. Embedding Caching

```python
import redis

cache = redis.Redis(host='localhost', port=6379)

def get_query_embedding(query):
    # Check cache first
    cached = cache.get(f"embedding:{query}")
    if cached:
        return pickle.loads(cached)
    
    # Generate if not cached
    embedding = model.encode(query)
    cache.setex(
        f"embedding:{query}",
        3600,              # Cache for 1 hour
        pickle.dumps(embedding)
    )
    return embedding
```

### 2. Batch Indexing

```python
def bulk_index_documents(documents, batch_size=100):
    """Index large document collections efficiently"""
    
    for i in range(0, len(documents), batch_size):
        batch = documents[i:i+batch_size]
        
        # Encode all at once (faster)
        embeddings = model.encode(
            [doc['content'] for doc in batch],
            show_progress_bar=True
        )
        
        # Insert to Supabase
        for doc, embedding in zip(batch, embeddings):
            supabase.table("knowledge_base").insert({
                **doc,
                "embedding": embedding.tolist()
            }).execute()
```

### 3. Dynamic Chunk Size

```python
def optimal_chunk_size(model_name, avg_token_size=6):
    """Calculate optimal chunk size based on model"""
    
    embedding_dim = get_model_dimension(model_name)
    max_tokens = embedding_dim // avg_token_size
    
    return {
        "size": max_tokens * 5,      # Conservative estimate
        "overlap": max_tokens,       # 20% overlap
    }

# For all-MiniLM-L6-v2:
# 384 dimensions ÷ 6 chars/token = 64 tokens max
# Conservative: 64 * 5 = 320 chars ideal
```

---

## 7. Quality Assurance

### Validation Pipeline

```python
def validate_chunk(chunk, embedding):
    """Ensure chunk quality before indexing"""
    
    checks = [
        len(chunk) >= 50,                    # Minimum length
        len(chunk) <= 1000,                  # Maximum length
        len(embedding) == 384,               # Correct dimension
        sum(embedding**2) > 0,               # Non-zero vector
        detect_language(chunk) == "es" or "en"  # Language check
    ]
    
    return all(checks)
```

### Test Queries

```python
test_cases = [
    {
        "query": "¿Qué bujía para Hilux 2018?",
        "expected_result": "NGK LZKAR6AI",
        "max_rank": 1  # Should be rank-1 result
    },
    {
        "query": "Specifications for spark plug NGK",
        "expected_result": "Cold range 6-7",
        "max_rank": 2
    },
    {
        "query": "Toyota diesel engine compatibility",
        "expected_result": "1GD-FTV",
        "max_rank": 3
    }
]

for test in test_cases:
    results = retrieve(test["query"])
    top_result = results[0]["content"]
    assert test["expected_result"] in top_result
```

---

## 8. Performance Benchmarks

### Embedding Generation
```
Model: all-MiniLM-L6-v2
├─ First query: ~500ms (model load)
├─ Subsequent: ~2-5ms per query
├─ Batch (100): ~50-100ms
└─ Memory: ~260MB (GPU) / ~500MB (CPU)
```

### Retrieval Latency
```
Vector search (top-5):     ~10-20ms
Full-text search:         ~5-15ms
Hybrid (combined):        ~20-30ms
With caching:             <2ms (cache hit)
```

### Storage
```
Per chunk embedding:  384 floats × 4 bytes = 1.5 KB
1000 chunks:          ~1.5 MB vectors
Full KB (50k chunks): ~75 MB

Supabase free tier:   500 MB available
→ Room for ~333k chunks!
```

---

## 9. Production Deployment Checklist

- [ ] Sentence Transformers model downloaded locally
- [ ] Supabase pgvector extension enabled
- [ ] Vector index created (ivfflat with lists=100)
- [ ] Test queries returning results in <30ms
- [ ] Caching layer (Redis) deployed
- [ ] Chunk validation pipeline active
- [ ] Access metrics being tracked
- [ ] Weekly reindexing job scheduled
- [ ] Embedding model version pinned
- [ ] Fallback to keyword search if vector fails

---

## 10. Troubleshooting

### Embeddings not found
```python
# Check if model loaded correctly
try:
    test_embed = model.encode("test")
    print(f"Model working: shape={test_embed.shape}")
except Exception as e:
    print(f"Model error: {e}")
    # Fallback to keyword search
```

### Retrieval too slow
```
1. Check Supabase indexes:
   SELECT * FROM pg_indexes WHERE tablename='knowledge_base'

2. Analyze query plan:
   EXPLAIN ANALYZE SELECT ... ORDER BY embedding <-> query_vec

3. Consider: batch search, caching, or parallel queries
```

### Low relevance results
```
1. Adjust similarity_threshold (try 0.6-0.8)
2. Increase k (retrieve top-10 instead of top-5)
3. Use domain filtering
4. Implement hybrid search
```

---

**Version:** 1.0 | **Model:** all-MiniLM-L6-v2 | **DB:** Supabase pgvector | **Splitter:** LangChain Recursive

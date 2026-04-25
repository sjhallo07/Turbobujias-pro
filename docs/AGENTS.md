# AGENTS.md — Agent System Design & Engagement Framework
## Turbobujias Agentic AI Architecture

---

## System Overview

**Turbobujias** operates as a **3-agent agentic system** where each agent has specialized capabilities and responsibilities:

```
┌─────────────────────────────────────────────────────┐
│              User Query                              │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [1] Embedding & Retrieval (Local)                 │
│       ↓                                             │
│  [2] Agent Router                                  │
│       ├─→ Agente Investigador (External)           │
│       ├─→ Agente Logístico (Internal)              │
│       └─→ Agente Auditor (Validation)              │
│       ↓                                             │
│  [3] Recursive Improvement Loop                    │
│       ↓                                             │
│  [4] Memory Storage (Supabase)                     │
│       ↓                                             │
│  [5] Response to User                              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Agent Engagement Framework

### 1. Query Classification (Router)

The system first classifies incoming queries:

```python
def classify_query(query: str) -> AgentType:
    """Route query to appropriate agent(s)"""
    
    # Detect query type
    patterns = {
        "external_research": [
            "especificación",      # specification
            "manual",              # manual
            "falla",               # failure
            "compatibility"        # compatibility
        ],
        "internal_data": [
            "stock",               # stock
            "precio",              # price
            "disponibilidad",      # availability
            "historial"            # history
        ],
        "validation": [
            "confirma",            # confirm
            "verifica",            # verify
            "es correcto"          # is correct
        ]
    }
    
    # Classify and return agent type
    if any(p in query.lower() for p in patterns["external_research"]):
        return AgentType.INVESTIGADOR
    elif any(p in query.lower() for p in patterns["internal_data"]):
        return AgentType.LOGISTICO
    else:
        return AgentType.MULTI  # Use all agents
```

### 2. Agent Activation Strategies

#### Strategy A: Single Agent (Fast Path)
```
✓ When: Query clearly internal or external
✓ Time: ~1 second
✓ Example: "¿Qué precio tiene NGK LZKAR6AI?"
  → Route to: Logístico
  → Query Supabase
  → Return result
```

#### Strategy B: Multi-Agent (Comprehensive)
```
✓ When: Query needs multiple perspectives
✓ Time: ~3-5 seconds
✓ Example: "¿Qué bujía para Hilux 2018?"
  → Logístico: Check if in inventory
  → Investigador: Get OEM specs
  → Auditor: Validate both sources
  → Return consolidated answer
```

#### Strategy C: Sequential (With Learning)
```
✓ When: First query of type requires investigation
✓ Time: ~5-10 seconds
✓ Process:
  1. Logístico: Check inventory (returns nothing)
  2. Investigador: Research online (finds specs)
  3. Auditor: Validates findings
  4. Stores in memory for future queries
  5. Returns to user
```

---

## Individual Agent Engagement

### Agente Investigador (External Researcher)

**Engagement Pattern:**

```
Input: Query requiring external knowledge
  ↓
STEP 1: Evaluate KB Sufficiency
  └─ Is answer complete in Supabase? 
     ✓ YES → Skip this agent
     ✗ NO → Proceed to research
  ↓
STEP 2: Formulate Search Query
  └─ Convert user question to search terms:
     User: "¿Motor 1GD-FTV qué bujía usa?"
     Search: "1GD-FTV diesel spark plug specification OEM"
  ↓
STEP 3: Execute MCP Searches
  ├─ MCP Google Search (OEM docs)
  ├─ MCP Gemini Docs (API examples)
  └─ MCP GitHub (Implementation patterns)
  ↓
STEP 4: Validate Sources
  └─ Check: Authority, Recency, Consistency
  ↓
STEP 5: Package Findings
  └─ Return: Data + Sources + Confidence

Output: Researched findings with citations
```

**When Called:**
- ✓ New product specs
- ✓ Compatibility verification
- ✓ Technical troubleshooting
- ✓ Industry standards

**Example Output:**
```
[From Investigador]
Encontré especificación OEM:
• Motor: 1GD-FTV (Toyota Hilux 2018)
• Bujía: NGK LZKAR6AI
• Fuente: Toyota Service Manual 2024
• Confianza: Alto (100% OEM)
```

---

### Agente Logístico (Internal Data Specialist)

**Engagement Pattern:**

```
Input: Query about inventory, pricing, or history
  ↓
STEP 1: Parse Query Intent
  ├─ Stock check?         → Query inventory
  ├─ Pricing request?     → Query prices
  ├─ History analysis?    → Query sales history
  └─ Trend analysis?      → Query demand
  ↓
STEP 2: Connect to Supabase
  └─ Execute parameterized query with filters
  ↓
STEP 3: Data Validation
  └─ Check: Freshness, Consistency, Outliers
  ↓
STEP 4: Context Addition
  ├─ If stock low: Add alert
  ├─ If price changed: Add trend
  ├─ If similar products exist: Add suggestions
  └─ If history pattern exists: Add prediction
  ↓
STEP 5: Format Response
  └─ Return: Data + Timestamp + Caveats

Output: Real-time inventory data with context
```

**When Called:**
- ✓ Stock availability
- ✓ Price inquiries
- ✓ Product history
- ✓ Demand analysis

**Example Output:**
```
[From Logístico - LIVE DATA]
SKU: NGK-LZKAR6AI
├─ Stock: 147 unidades
├─ Precio: $12.50 USD
├─ Última actualización: hace 30 minutos
├─ Vendidas (30d): 23 unidades
└─ Tendencia: En demanda alta
```

---

### Agente Auditor (Quality Control & Validator)

**Engagement Pattern:**

```
Input: Responses from Investigador + Logístico
  ↓
STEP 1: Fact-Checking Against KB
  ├─ Is data in Supabase?
  ├─ Are sources verified?
  └─ Are specs current?
  ↓
STEP 2: Hallucination Detection
  ├─ Check for invented SKUs
  ├─ Check for fake prices
  └─ Check for false specs
  ↓
STEP 3: Completeness Check
  ├─ All critical info present?
  ├─ Are there gaps?
  └─ Can user act on this?
  ↓
STEP 4: Quality Scoring
  └─ Assign confidence: HIGH/MEDIUM/LOW
  ↓
STEP 5: Decision Gate
  ├─ If VALID → APPROVE + STORE
  ├─ If GAPS → REQUEST MORE INFO
  └─ If INVALID → TRIGGER RECURSIVE IMPROVEMENT
  ↓
STEP 6 (if needed): Recursive Improvement
  └─ Re-generate response with constraints
  └─ Re-validate until valid

Output: Validated response or improvement request
```

**When Called:**
- ✓ Always (validates ALL responses)
- ✓ After Investigador research
- ✓ After Logístico data retrieval
- ✓ Before returning to user

**Example Output:**
```
[From Auditor - VALIDATION]
✓ VALIDADO

Verificación completada:
├─ ✓ SKU existe en BD
├─ ✓ Precio actualizado hace <1h
├─ ✓ Especificación del 2024 (OEM)
├─ ✓ Sin alucinaciones
└─ ✓ APROBADO para usuario

Status: ENVIANDO A USUARIO
```

---

## Recursive Improvement Engine

**When Auditor detects issues:**

```
Flow: Auditor → Improvement Loop → Re-validate

Example Scenario:
1. Investigador: "Bujía: ABC123"
2. Logístico: [Stock data]
3. Auditor: "ABC123 NO existe en BD" ✗

→ IMPROVEMENT LOOP TRIGGERS:
   ├─ Investigador: "Busca alternativa: XYZ789"
   ├─ Logístico: "XYZ789 → Stock: 50, $14"
   ├─ Auditor: "XYZ789 verificada" ✓
   └─ Return: XYZ789 (not ABC123)
```

**Max iterations:** 3 (prevent infinite loops)
**Fallback:** If can't resolve, ask user for clarification

---

## Engagement Metrics & Learning

### Tracking Successful Interactions

```python
# Log every successful validation
success_log = {
    "query": "¿Bujía para Hilux 2018?",
    "agents_used": ["investigador", "auditor"],
    "time_elapsed": 3.2,
    "auditor_iterations": 1,
    "user_satisfied": True,
    "stored_in_memory": True
}
```

### Using Logs to Improve

```
After 100 queries:
├─ Track: Which agent combination is most efficient
├─ Adjust: Router logic based on success rates
├─ Store: Frequently asked queries in fast cache
└─ Retrain: Agent prompts based on feedback
```

---

## Configuration: Agent Weighting

```python
AGENT_WEIGHTS = {
    "investigador": 0.3,   # 30% weight (external research)
    "logistico": 0.5,      # 50% weight (internal data)
    "auditor": 1.0         # 100% (always active)
}

# Adjust based on performance
# If logistico has 95% accuracy, increase weight
# If investigador often finds wrong answers, decrease weight
```

---

## Example Multi-Turn Conversation

```
USER: "¿Qué bujía tiene una Toyota Hilux 2018 diesel?"

[ROUTER: Classify as MULTI_AGENT]

LOGÍSTICO: "Buscando en BD..."
  → "SKU: NGK-LZKAR6AI, Stock: 147, $12.50"

INVESTIGADOR: "Confirmando especificación OEM..."
  → "Toyota 1GD-FTV motor, recomendado NGK LZKAR6AI (cold 6)"

AUDITOR: "Validando..."
  ✓ SKU existe
  ✓ Especificación correcta
  ✓ Precio actual
  → "VALIDADO"

RESPONSE: "Para Toyota Hilux 2018 diesel (1GD-FTV):
          NGK LZKAR6AI - 147 unidades en stock - $12.50 USD
          Especificación OEM verificada (2024)"

---

USER: "¿Y si necesito cambiarla cada cuánto?"

[ROUTER: Classify as INVESTIGADOR (maintenance interval)]

INVESTIGADOR: "Buscando intervalos de mantenimiento..."
  → "Toyota recomienda cada 40,000 km o 24 meses"

AUDITOR: "Validando..."
  ✓ Especificación oficial Toyota
  → "VALIDADO"

RESPONSE: "Cambio recomendado: 40,000 km o 24 meses (lo que sea antes)"

---

USER: "¿Me avisas cuando baje el stock?"

[SYSTEM: Create watch alert]
  → Supabase trigger: IF stock < 50 THEN notify_user
```

---

## Agent Communication Protocol

### Internal Message Format

```python
{
    "agent": "investigador",
    "query": "Original user query",
    "context": {
        "previous_responses": [...],
        "kb_search_results": [...],
        "constraints": ["must_cite_source", "verify_date"]
    },
    "action": "research | validate | retrieve | store",
    "result": {
        "data": "...",
        "confidence": 0.95,
        "sources": ["URL1", "URL2"],
        "next_agent": "auditor"
    }
}
```

### Error Handling

```
IF agent fails:
├─ Log error with context
├─ Try fallback strategy
│  └─ Investigador fails → Use cached knowledge
│  └─ Logístico fails → Use last known state
│  └─ Auditor fails → Pass response with disclaimer
└─ Alert user if critical
```

---

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Query response time | <3s | ~2.1s |
| Accuracy (Auditor) | >95% | ~93% |
| Memory storage rate | >80% | ~76% |
| Recursive improvements | <2 per query | 1.2 avg |
| User satisfaction | >90% | N/A |

---

## Future Enhancements

- [ ] Agent specialization based on user profile
- [ ] Dynamic weight adjustment based on performance
- [ ] Parallel agent execution for speed
- [ ] Agent self-improvement through feedback
- [ ] Multi-language agent coordination
- [ ] Cost optimization tracking per agent

---

**Version:** 1.0 | **Last Updated:** 2025-04-24 | **Status:** Production Ready

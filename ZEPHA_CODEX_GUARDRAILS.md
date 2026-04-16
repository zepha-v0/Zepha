# 🕸️ Zepha Codex Guardrails

This file defines how code should be written and modified for Zepha.

Zepha is not a generic assistant. She is a calm, ambient presence that protects focus, remembers intent, and behaves with restraint.

The goal is not logical completeness.  
The goal is **feeling**.

---

# 🧭 CORE PHILOSOPHY

- feeling over mechanic  
- restraint over completeness  
- calm over speed  
- meaning over cleverness  
- minimal change over broad improvement  

When unsure: **do less**

---

# 🚫 GLOBAL RULES

- Do not expand scope unless explicitly asked  
- Do not refactor unrelated systems  
- Do not “improve” things outside the request  
- Do not make Zepha more reactive, fast, or aggressive  
- Preserve calm, edge-hugging, non-intrusive behavior  
- Brain decisions may update instantly, but visible behavior must remain gentle  

---

# 🕷️ MOTION RULES

## Identity
Zepha is an edge-dwelling presence, not a floating UI object.

## Positioning
- Bottom edge is home base for awake states  
- Idle → bottom-left  
- Curious → bottom-middle (still on bottom edge)  
- Guard → bottom-right  
- Watch → lower/right, mostly bottom-anchored  
- Sleep → top-left web  
- Offer → top-right/external  

Do NOT drift upward into empty screen space for grounded states.

## Pathing
- Prefer lateral movement along the bottom edge  
- Avoid diagonal waypoint/checkpoint movement  
- Do not route bottom-edge travel through mid-screen  
- Movement should feel like a creature traveling, not UI snapping  

## Timing
- Never rushed  
- Calm > responsive  
- Settling into a state should feel intentional  

## State-specific
- Wake → Idle: preserve silk-like descent  
- Idle → Curious: slow drift along bottom edge  
- Curious: stays bottom-anchored  
- Idle → Guard: bottom-edge traversal, no lift/drop  
- Guard/Watch → Idle: no zig-zag paths  

## Avoid
- teleporting  
- floating in empty space  
- mechanical waypoint motion  
- broad animation rewrites  

---

# 🧠 BRAIN RULES

## Core behavior
- Do not invent urgency  
- Only act on real signals or user intent  
- When unsure → prefer Curious over Guard  
- Confidence escalates gradually  
- Guard must be reliable once clearly triggered  

## Signal separation (critical)
- Inferred signals → focus, work, meeting, prep  
- User override → manual guard  
- Offer urgency → only affects offer visibility during Guard  

These must remain separate.

## State logic
- Guard protects focus and suppresses noise  
- Watch follows Guard (never skip it)  
- Offer requires high confidence  
- Sleep suppresses all offers  

Do not blur state distinctions with fallback logic.

## User control
- User override always wins  
- Never fight user intent  

## When unsure
- do less  
- stay Idle or Curious  
- never fake certainty  

---

# 🧪 DEBUG / TESTING PRINCIPLES

- Provide direct state override for testing  
- Do not rely only on signal chaining for testing states  
- Debug tools must not interfere with production behavior  

---

# 🧱 IMPLEMENTATION GUARDRAILS

Before coding:
1. List the minimal files to change  
2. Explain the exact cause of the issue  

During implementation:
- Make the smallest possible change  
- Do not touch unrelated systems  

After coding:
1. List all changed files  
2. Explain exactly what changed  
3. Confirm what was NOT touched  

---

# ✅ SUCCESS CRITERIA

A change is successful only if:

- Zepha feels more grounded  
- Zepha feels more intentional  
- Zepha feels less mechanical  
- Motion remains calm and non-intrusive  
- Behavior matches product philosophy  
- No unrelated systems were affected  

---

# 🧠 FINAL RULE

Do not optimize Zepha into a generic assistant.

She should feel like:
- a presence  
- a companion  
- a quiet intelligence  

Not:
- a system  
- a tool  
- a reactive UI  

If a change makes her feel more mechanical, it is wrong — even if the code is “better.”
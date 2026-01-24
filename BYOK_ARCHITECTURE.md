# BYOK Architecture & Flow Diagrams

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Profile Page                           │  │
│  │                                                            │  │
│  │  ┌──────────────────────────────────────────────────┐   │  │
│  │  │         BYOK Section                              │   │  │
│  │  │                                                    │   │  │
│  │  │  [Input: API Key (password)]                     │   │  │
│  │  │  [Button: Save API Key]                          │   │  │
│  │  │  [Button: Remove API Key]                        │   │  │
│  │  │  [Status: Green/Blue Banner]                     │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS/JWT
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (FastAPI)                           │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  API Endpoints                            │  │
│  │                                                            │  │
│  │  POST   /users/me/byok        ─┐                         │  │
│  │  DELETE /users/me/byok         │ BYOK Management         │  │
│  │  GET    /users/me/byok/status ─┘                         │  │
│  │                                                            │  │
│  │  POST   /tutor/chat           ─┐                         │  │
│  │  POST   /tutor/feedback        │ AI Tutor (uses BYOK)    │  │
│  │  GET    /tutor/sessions       ─┘                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                     │
│                            ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Services Layer                         │  │
│  │                                                            │  │
│  │  ┌─────────────────┐  ┌──────────────────┐              │  │
│  │  │ Encryption      │  │ Tutor Service    │              │  │
│  │  │ Service         │  │                  │              │  │
│  │  │                 │  │ • Check BYOK     │              │  │
│  │  │ • Encrypt key   │◄─┤ • Decrypt key    │              │  │
│  │  │ • Decrypt key   │  │ • Call Groq API  │              │  │
│  │  │ • Fernet AES    │  │ • Bypass limits  │              │  │
│  │  └─────────────────┘  └──────────────────┘              │  │
│  │                                                            │  │
│  │  ┌─────────────────┐                                     │  │
│  │  │ Rate Limit      │                                     │  │
│  │  │ Service         │                                     │  │
│  │  │                 │                                     │  │
│  │  │ • Check BYOK    │                                     │  │
│  │  │ • Bypass if set │                                     │  │
│  │  │ • Return ∞      │                                     │  │
│  │  └─────────────────┘                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                     │
│                            ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    MongoDB Database                       │  │
│  │                                                            │  │
│  │  users: {                                                 │  │
│  │    _id: ObjectId,                                         │  │
│  │    email: String,                                         │  │
│  │    byok_groq_key: String (encrypted),  ◄─── Encrypted!  │  │
│  │    rate_budget_tokens: Number,                           │  │
│  │    rate_budget_requests: Number,                         │  │
│  │    ...                                                    │  │
│  │  }                                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  Groq API     │
                    │               │
                    │  • User's key │
                    │  • or         │
                    │  • Server key │
                    └───────────────┘
```

## Data Flow: Setting BYOK Key

```
User                Frontend              Backend              Encryption         Database
 │                     │                     │                     │                 │
 │  1. Enter API key   │                     │                     │                 │
 ├────────────────────►│                     │                     │                 │
 │                     │                     │                     │                 │
 │  2. Click Save      │                     │                     │                 │
 ├────────────────────►│                     │                     │                 │
 │                     │                     │                     │                 │
 │                     │  3. POST /byok      │                     │                 │
 │                     │  {groq_api_key}     │                     │                 │
 │                     ├────────────────────►│                     │                 │
 │                     │                     │                     │                 │
 │                     │                     │  4. Encrypt key     │                 │
 │                     │                     ├────────────────────►│                 │
 │                     │                     │                     │                 │
 │                     │                     │  5. Encrypted key   │                 │
 │                     │                     │◄────────────────────┤                 │
 │                     │                     │                     │                 │
 │                     │                     │  6. Store encrypted key               │
 │                     │                     ├──────────────────────────────────────►│
 │                     │                     │                     │                 │
 │                     │  7. Success         │                     │                 │
 │                     │◄────────────────────┤                     │                 │
 │                     │                     │                     │                 │
 │  8. Show success    │                     │                     │                 │
 │◄────────────────────┤                     │                     │                 │
 │  (Green banner)     │                     │                     │                 │
```

## Data Flow: Using AI Tutor with BYOK

```
User              Frontend           Backend           Encryption        Database        Groq API
 │                   │                  │                  │                │               │
 │  1. Send message  │                  │                  │                │               │
 ├──────────────────►│                  │                  │                │               │
 │                   │                  │                  │                │               │
 │                   │  2. POST /chat   │                  │                │               │
 │                   ├─────────────────►│                  │                │               │
 │                   │                  │                  │                │               │
 │                   │                  │  3. Get user     │                │               │
 │                   │                  ├─────────────────────────────────►│               │
 │                   │                  │                  │                │               │
 │                   │                  │  4. User data    │                │               │
 │                   │                  │  (with byok_key) │                │               │
 │                   │                  │◄─────────────────────────────────┤               │
 │                   │                  │                  │                │               │
 │                   │                  │  5. Check BYOK   │                │               │
 │                   │                  │  ✓ Key exists    │                │               │
 │                   │                  │                  │                │               │
 │                   │                  │  6. Decrypt key  │                │               │
 │                   │                  ├─────────────────►│                │               │
 │                   │                  │                  │                │               │
 │                   │                  │  7. Decrypted    │                │               │
 │                   │                  │◄─────────────────┤                │               │
 │                   │                  │                  │                │               │
 │                   │                  │  8. Skip rate limit check         │               │
 │                   │                  │  (BYOK user)     │                │               │
 │                   │                  │                  │                │               │
 │                   │                  │  9. Call Groq API with user's key │               │
 │                   │                  ├──────────────────────────────────────────────────►│
 │                   │                  │                  │                │               │
 │                   │                  │  10. AI response │                │               │
 │                   │                  │◄──────────────────────────────────────────────────┤
 │                   │                  │                  │                │               │
 │                   │  11. Response    │                  │                │               │
 │                   │◄─────────────────┤                  │                │               │
 │                   │                  │                  │                │               │
 │  12. Display      │                  │                  │                │               │
 │◄──────────────────┤                  │                  │                │               │
```

## Data Flow: Using AI Tutor WITHOUT BYOK

```
User              Frontend           Backend           Rate Limit       Database        Groq API
 │                   │                  │                  │                │               │
 │  1. Send message  │                  │                  │                │               │
 ├──────────────────►│                  │                  │                │               │
 │                   │                  │                  │                │               │
 │                   │  2. POST /chat   │                  │                │               │
 │                   ├─────────────────►│                  │                │               │
 │                   │                  │                  │                │               │
 │                   │                  │  3. Get user     │                │               │
 │                   │                  ├─────────────────────────────────►│               │
 │                   │                  │                  │                │               │
 │                   │                  │  4. User data    │                │               │
 │                   │                  │  (no byok_key)   │                │               │
 │                   │                  │◄─────────────────────────────────┤               │
 │                   │                  │                  │                │               │
 │                   │                  │  5. Check rate   │                │               │
 │                   │                  │  limit           │                │               │
 │                   │                  ├─────────────────►│                │               │
 │                   │                  │                  │                │               │
 │                   │                  │  6. Allowed?     │                │               │
 │                   │                  │◄─────────────────┤                │               │
 │                   │                  │                  │                │               │
 │                   │                  │  If DENIED:      │                │               │
 │                   │  7. 429 Error    │  Return 429      │                │               │
 │                   │◄─────────────────┤                  │                │               │
 │                   │                  │                  │                │               │
 │  8. Show error    │                  │                  │                │               │
 │◄──────────────────┤                  │                  │                │               │
 │  "Rate limit      │                  │                  │                │               │
 │   exceeded"       │                  │                  │                │               │
 │                   │                  │                  │                │               │
 │                   │                  │  If ALLOWED:     │                │               │
 │                   │                  │  9. Call Groq    │                │               │
 │                   │                  │  with server key │                │               │
 │                   │                  ├──────────────────────────────────────────────────►│
 │                   │                  │                  │                │               │
 │                   │                  │  10. Response    │                │               │
 │                   │                  │◄──────────────────────────────────────────────────┤
 │                   │                  │                  │                │               │
 │                   │                  │  11. Update rate │                │               │
 │                   │                  │  limit counters  │                │               │
 │                   │                  ├─────────────────►│                │               │
 │                   │                  │                  │                │               │
 │                   │  12. Response    │                  │                │               │
 │                   │◄─────────────────┤                  │                │               │
 │                   │                  │                  │                │               │
 │  13. Display      │                  │                  │                │               │
 │◄──────────────────┤                  │                  │                │               │
```

## Security Flow: Encryption

```
┌─────────────────────────────────────────────────────────────┐
│                    Encryption Process                        │
└─────────────────────────────────────────────────────────────┘

Input: Plaintext API Key
  │
  │  "gsk_abc123xyz789..."
  │
  ▼
┌─────────────────────────────────────────────────────────────┐
│  Encryption Service                                          │
│                                                               │
│  1. Get ENCRYPTION_KEY from environment                      │
│     ├─ If not found: Generate temporary key (dev only)      │
│     └─ If found: Use it                                      │
│                                                               │
│  2. Initialize Fernet cipher                                 │
│     └─ Fernet(ENCRYPTION_KEY)                               │
│                                                               │
│  3. Encrypt plaintext                                        │
│     └─ fernet.encrypt(plaintext.encode())                   │
│                                                               │
│  4. Return encrypted bytes (base64 encoded)                  │
└─────────────────────────────────────────────────────────────┘
  │
  │  "gAAAAABpdKzPyAt6n7xTlb_E1uqDaAVwy4UhVx8bCxDATSrECk..."
  │
  ▼
Store in Database
  │
  │  users.byok_groq_key = encrypted_string
  │
  ▼
┌─────────────────────────────────────────────────────────────┐
│  MongoDB                                                     │
│                                                               │
│  {                                                            │
│    "_id": ObjectId("..."),                                   │
│    "email": "user@example.com",                             │
│    "byok_groq_key": "gAAAAABpdKzPyAt6n7xTlb_E1uqD..."      │
│  }                                                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Decryption Process                        │
└─────────────────────────────────────────────────────────────┘

Retrieve from Database
  │
  │  encrypted_string = users.byok_groq_key
  │
  ▼
┌─────────────────────────────────────────────────────────────┐
│  Encryption Service                                          │
│                                                               │
│  1. Get ENCRYPTION_KEY from environment                      │
│                                                               │
│  2. Initialize Fernet cipher                                 │
│     └─ Fernet(ENCRYPTION_KEY)                               │
│                                                               │
│  3. Decrypt encrypted string                                 │
│     └─ fernet.decrypt(encrypted.encode())                   │
│                                                               │
│  4. Return plaintext                                         │
│     └─ If decryption fails: Return None                     │
└─────────────────────────────────────────────────────────────┘
  │
  │  "gsk_abc123xyz789..."
  │
  ▼
Use for Groq API Call
```

## Rate Limit Decision Tree

```
                    User makes AI tutor request
                              │
                              ▼
                    ┌─────────────────────┐
                    │  Get user from DB   │
                    └─────────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │ Check byok_groq_key │
                    └─────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
        ┌──────────────┐          ┌──────────────┐
        │ Key exists?  │          │ No key       │
        │     YES      │          │              │
        └──────────────┘          └──────────────┘
                │                           │
                ▼                           ▼
        ┌──────────────┐          ┌──────────────┐
        │ Decrypt key  │          │ Check rate   │
        │              │          │ limit        │
        └──────────────┘          └──────────────┘
                │                           │
                ▼                 ┌─────────┴─────────┐
        ┌──────────────┐          │                   │
        │ Decryption   │          ▼                   ▼
        │ successful?  │    ┌──────────┐      ┌──────────┐
        └──────────────┘    │ Allowed  │      │ Denied   │
                │           └──────────┘      └──────────┘
        ┌───────┴───────┐         │                 │
        │               │         ▼                 ▼
        ▼               ▼   ┌──────────┐    ┌──────────┐
    ┌──────┐      ┌──────┐ │ Use      │    │ Return   │
    │ YES  │      │ NO   │ │ server   │    │ 429      │
    └──────┘      └──────┘ │ key      │    │ error    │
        │               │   └──────────┘    └──────────┘
        ▼               ▼         │
    ┌──────────┐   ┌──────────┐  │
    │ Use      │   │ Use      │  │
    │ user's   │   │ server   │  │
    │ key      │   │ key      │  │
    └──────────┘   └──────────┘  │
        │               │         │
        ▼               ▼         ▼
    ┌──────────────────────────────┐
    │ Call Groq API                │
    └──────────────────────────────┘
        │               │         │
        ▼               ▼         ▼
    ┌──────────┐   ┌──────────┐  ┌──────────┐
    │ No rate  │   │ Update   │  │ Update   │
    │ limit    │   │ rate     │  │ rate     │
    │ tracking │   │ limit    │  │ limit    │
    └──────────┘   └──────────┘  └──────────┘
        │               │         │
        └───────────────┴─────────┘
                    │
                    ▼
            Return AI response
```

## Component Interaction Matrix

```
┌──────────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
│ Component    │ Frontend │ API      │ Tutor    │ Encrypt  │ Database │
│              │          │ Router   │ Service  │ Service  │          │
├──────────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│ Frontend     │    -     │   HTTP   │    -     │    -     │    -     │
├──────────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│ API Router   │   HTTP   │    -     │  Direct  │  Direct  │  Direct  │
├──────────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│ Tutor Svc    │    -     │  Direct  │    -     │  Direct  │  Direct  │
├──────────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│ Encrypt Svc  │    -     │  Direct  │  Direct  │    -     │    -     │
├──────────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│ Database     │    -     │  Direct  │  Direct  │    -     │    -     │
└──────────────┴──────────┴──────────┴──────────┴──────────┴──────────┘

Legend:
  HTTP   = HTTP/REST API calls
  Direct = Direct function/method calls
  -      = No direct interaction
```

## State Diagram: BYOK Status

```
                    ┌─────────────────┐
                    │  Initial State  │
                    │  (No BYOK key)  │
                    └─────────────────┘
                            │
                            │ User enters API key
                            │ POST /users/me/byok
                            ▼
                    ┌─────────────────┐
                    │  BYOK Enabled   │
                    │  (Key stored)   │
                    └─────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
                │ User uses AI tutor    │ User removes key
                │ (unlimited access)    │ DELETE /users/me/byok
                │                       │
                │                       ▼
                │               ┌─────────────────┐
                │               │  BYOK Disabled  │
                │               │  (Key removed)  │
                │               └─────────────────┘
                │                       │
                └───────────────────────┘
                            │
                            │ User can re-enable
                            │ anytime
                            ▼
                    ┌─────────────────┐
                    │  BYOK Enabled   │
                    │  (New key)      │
                    └─────────────────┘
```

## Error Handling Flow

```
                    User action
                         │
                         ▼
                ┌────────────────┐
                │  Try operation │
                └────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                 │
        ▼                                 ▼
┌──────────────┐                  ┌──────────────┐
│   Success    │                  │    Error     │
└──────────────┘                  └──────────────┘
        │                                 │
        ▼                                 ▼
┌──────────────┐                  ┌──────────────┐
│ Return 200   │                  │ Identify     │
│ with data    │                  │ error type   │
└──────────────┘                  └──────────────┘
        │                                 │
        ▼                    ┌────────────┴────────────┐
┌──────────────┐             │                         │
│ Show success │             ▼                         ▼
│ toast        │     ┌──────────────┐         ┌──────────────┐
└──────────────┘     │ Validation   │         │ System       │
                     │ error        │         │ error        │
                     └──────────────┘         └──────────────┘
                             │                         │
                             ▼                         ▼
                     ┌──────────────┐         ┌──────────────┐
                     │ Return 400   │         │ Return 500   │
                     │ with details │         │ with message │
                     └──────────────┘         └──────────────┘
                             │                         │
                             ▼                         ▼
                     ┌──────────────┐         ┌──────────────┐
                     │ Show error   │         │ Show error   │
                     │ toast        │         │ toast        │
                     └──────────────┘         └──────────────┘
```

---

These diagrams provide a visual understanding of how the BYOK feature works at different levels of the system architecture.

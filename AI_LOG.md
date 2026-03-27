# 🧠 Jurnal de Reflecție și Erori AI (iTECify Sandbox)

**REGULĂ STRICTĂ:** Acest fișier trebuie actualizat la fiecare încercare eșuată majoră sau decizie arhitecturală importantă. Nu repeta o eroare care este deja documentată aici.

## 🎯 Task-ul Curent (Ce încercăm să construim acum)
* [x] Implementare strat Supabase: auth + DB sessions + realtime broadcast pentru sync cod Monaco
* [x] Colaborare în timp real cu Yjs + Monaco Editor (multi-cursor sync)

## ❌ Erori Întâlnite și Încercări Eșuate
*(Când primești o eroare, documentează abordarea greșită aici pentru a nu o repeta)*

1. **[2026-03-27]** - **Abordare:** Docker + WSL pentru sandboxing cod | **Eroare/Rezultat:** Docker/WSL nu funcționează în mediul de dezvoltare curent — blocker tehnic de mediu, nu de cod.

## 💡 Reflecție și Soluții Găsite

* **Docker blocat → Plan B: `child_process`** *(depășit — vezi mai jos)*
  Docker necesita WSL2, indisponibil inițial. Plan B cu `child_process` a deblocat echipa.

* **Docker instalat și funcțional → Upgrade la `dockerode`**
  Docker Desktop v29.3.1 instalat și verificat. Imagini `python:3.9-slim` și `node:18-alpine` disponibile local. Motorul de execuție a fost upgradeat la izolare reală prin containere Docker.

## ✅ Pași Finalizați cu Succes (Checkpoint-uri)
*(Nu reevalua codul pentru acești pași, consideră-i stabiliți)*

* [x] Inițializare proiect React și Node.js.
* [x] Setup frontend: Vite + React + TypeScript + Tailwind CSS v4 + Monaco Editor + Lucide React.
* [x] Setup backend: Express 5 + CORS + dotenv + nodemon.
* [x] **Membru 2 — Supabase layer v1**: `database.types.ts`, `supabaseClient.ts`, `sessionApi.ts`, `useAuth.ts`, `useRealtimeCode.ts`.
* [x] **Membru 2 — Supabase layer v2**: `lib/supabase.ts` (schema projects+files, default export), `hooks/useAuth.ts` (+ session, signIn/signUp), `hooks/useRealtimeEditor.ts` (postgres_changes + presence). `tsc --noEmit` → 0 erori.
* [x] **[2026-03-27] Verificare completă**: `tsc` OK, `dockerode` instalat în backend (`npm install`), toate fișierele verificate și corecte.
* [x] **Plan B Execution Engine:** `POST /api/execute` funcțional via `child_process` (suportă JavaScript și Python). Fișiere: `src/services/executionService.js`, `src/index.js`, `backend/temp/`.
* [x] **[2026-03-27] Membru 3:** Execuția codului prin `child_process` finalizată și verificată (Plan B).
* [x] **[2026-03-27] Membru 3:** Upgrade la Docker real — `dockerode` instalat, `executionService.js` rescris. Containere izolate: fără rețea, 50MB RAM, read-only mount. Testat: Python OK, JavaScript OK, timeout (buclă infinită) OK.
* [x] **[2026-03-28] Frontend — Easter Eggs (3x):**
  - **Konami Code** (↑↑↓↓←→←→BA): hook `useKonamiCode.ts` + component `KonamiExplosion.tsx` — overlay full-screen cu 280 particule roz/mov pe canvas + animație logo + mesaj "🎉 You found the secret!". Activ pe toate paginile via `App.tsx`.
  - **Hacker Mode** (5 click-uri pe logo din HomePage): filtru CSS `hue-rotate(90deg) saturate(4)` aplicat pe tot ecranul timp de 10 secunde + banner "HACKER MODE ACTIVATED" cu animație pulse. Implementat în `HomePage.tsx` cu `useRef` pentru counter și `useState` pentru activare.
  - **Toast 'itecify'** (scrie `itecify` în editor): toast slide-in în dreapta-jos cu "👾 Hello, fellow coder!" afișat 4 secunde. Se declanșează o singură dată per sesiune via `useRef` guard. Implementat în `EditorPage` din `App.tsx`.

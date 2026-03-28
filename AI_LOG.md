# 🧠 Jurnal de Reflecție și Erori AI (iTECify Sandbox)

**REGULĂ STRICTĂ:** Acest fișier trebuie actualizat la fiecare încercare eșuată majoră sau decizie arhitecturală importantă. Nu repeta o eroare care este deja documentată aici.

## 🎯 Task-ul Curent (Ce încercăm să construim acum)
* [x] Implementare strat Supabase: auth + DB sessions + realtime broadcast pentru sync cod Monaco
* [x] Colaborare în timp real cu Yjs + Monaco Editor (multi-cursor sync)
* [x] TASK 0.1 — Deleted supabaseClient.ts, fixed sessionApi.ts import
* [x] TASK 0.2 — Deleted useRealtimeCode.ts (unused)
* [x] TASK 1.1 — ProtectedRoute wrapping /editor and /dashboard
* [x] TASK 1.2 — EditorPage uses useProjectFiles() (dynamic Supabase files)
* [x] TASK 1.3 — useRealtimeEditor integrated; cursor broadcast via CodeEditor onCursorChange
* [x] TASK 1.4 — ConnectedUsers.tsx: avatar dots with colors, hover tooltip, stacked display
* [x] TASK 1.5.b — AIBlock.tsx: floating AI panel, chat UI, POST /api/ai
* [x] TASK 2.1.b — DashboardPage.tsx: project grid, create new project form, sign out
* [x] TASK 2.3 — Sidebar: inline new file form with "+" button, guesses language from extension

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
* [x] **[2026-03-28] Frontend — Marquee banner în HomePage (fix loop seamless):**
  - Un singur `<span>` cu lista duplicată (×2 via `flatMap`), animat `translateX(0→-50%)` — când primul set ajunge la capăt, al doilea ia locul exact, fără salt sau spațiu gol.
  - Limbi: Python, C, C++, TypeScript, JavaScript, React — separator `✦` roz, font monospace.
* [x] **[2026-03-28] Frontend — Replace particles cu blob animat în HomePage:**
  - Eliminat complet canvas-ul cu particule (`canvasRef`, `useEffect` particles, `<canvas>`).
  - Adăugat `blob.png` ca fundal fix (`position:fixed`, centrat cu `translate(-50%,-50%)`), 600×600px, `opacity:0.4`, `zIndex:0`, `pointerEvents:none`.
  - Animație `blob-float`: translateY -20px→+20px + rotate -5deg→+5deg, 6s ease-in-out infinite.
* [x] **[2026-03-28] Frontend — Features section în HomePage:**
  - 3 carduri Linear.app style: `feature1.png`/`feature2.png`/`feature3.png`, label `FIG 0.X` top-left, fade gradient bottom, titlu + descriere jos.
  - Scroll animations via Intersection Observer API (fără librării externe): fade-in + slide-up (translateY 40px→0, opacity 0→1), delay 0/150/300ms per card.
  - Root div schimbat din `height:100vh, overflow:hidden` la `minHeight:100vh` + canvas fixat (`position:fixed`) pentru a permite scroll.
  - Hover effect: border roz subtil + glow `box-shadow`.
* [x] **[2026-03-28] Frontend — Asset updates (KonamiExplosion + SecretPage):**
  - **KonamiExplosion**: înlocuit logo cu `cat-access.png` (200×200, border-radius 16px, glow roz/mov, animație float 3s). Animație `cat-float` adăugată în `<style>`.
  - **SecretPage**: `terminal-bg.png` ca fundal full-cover + overlay `rgba(0,0,0,0.72)` pentru lizibilitate + vignette cu `box-shadow: inset`. `zIndex` panel ridicat la 10.
* [x] **[2026-03-28] Frontend — Secret Terminal Page + Konami upgrade:**
  - **SecretPage** (`/secret`): terminal glassmorphism full-screen cu typewriter effect (15ms/char), cursor roz pulsant, prompt `iTECify@secret:~$`, 8 comenzi implementate (help/whoami/hack nasa/sudo make coffee/vibe check/rizz/ls /universe/exit). `exit` redirect la `/` după typewriter finish. Fișier: `src/pages/SecretPage.tsx`.
  - **KonamiExplosion upgrade**: înlocuit "🎉 You found the secret!" cu glitch CSS "ACCESS GRANTED" (pseudo-elements via `<style>` + `data-text`) + buton pulsating "Enter the void >" cu `useNavigate('/secret')`. Particule nu mai auto-închid overlay-ul.
  - Rută `/secret` adăugată în `App.tsx`.
* [x] **[2026-03-28] Frontend — Easter Eggs (3x):**
  - **Konami Code** (↑↑↓↓←→←→BA): hook `useKonamiCode.ts` + component `KonamiExplosion.tsx` — overlay full-screen cu 280 particule roz/mov pe canvas + animație logo + mesaj "🎉 You found the secret!". Activ pe toate paginile via `App.tsx`.
  - **Hacker Mode** (5 click-uri pe logo din HomePage): filtru CSS `hue-rotate(90deg) saturate(4)` aplicat pe tot ecranul timp de 10 secunde + banner "HACKER MODE ACTIVATED" cu animație pulse. Implementat în `HomePage.tsx` cu `useRef` pentru counter și `useState` pentru activare.
  - **Toast 'itecify'** (scrie `itecify` în editor): toast slide-in în dreapta-jos cu "👾 Hello, fellow coder!" afișat 4 secunde. Se declanșează o singură dată per sesiune via `useRef` guard. Implementat în `EditorPage` din `App.tsx`.

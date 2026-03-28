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
* [x] TASK 2.4 — TimeTravel.tsx: slider over useFileHistory snapshots, read-only Monaco overlay, Restore + Exit buttons
* [x] UI — TerminalOutput: butoane Run + Clear reglate (padding 6px, font 12px, border-radius 8px, hover glow roz)
* [x] Layout — Resize divider: drag 6px între editor și terminal (mousedown/mousemove/mouseup, min 80px, max 500px)
* [x] Layout — Toggle Sidebar: buton ‹/› la marginea sidebar-ului, width 0↔256px cu transition 0.2s
* [x] Layout — Toggle Terminal: buton ⌄/⌃ în header terminal, collapse la 36px (doar header)
* [x] UI — Sidebar: badge-uri colorate per extensie (JS galben, PY albastru, RS roșu etc.), 18×16px, border-radius 3px
* [x] Fix — HomePage: import blob revenит la blob.png (un coleg îl schimbase în hero.png, cauzând dispariția animației de fundal)
* [x] UI — HomePage navbar: butoane Contact + About Us cu dropdownuri glassmorphism (close on outside click, animatie dropdown-in)
* [x] UI — Dropdownuri navbar: onMouseLeave pe wrapper (nu click afară), zIndex 99999, bg rgba(8,4,25,0.98), text #ffffff, scrollbar roz, max-height 350px
* [x] UI — Marquee banner: text rgba(255,255,255,0.25), bg rgba(0,0,0,0.4) blur(5px), font 11px, separator · , border subtil 0.05
* [x] Fix — zIndex layering: navbar 99999, marquee 1, dropdownuri 999999
* [x] UI — Editor tab bar: buton ← Home (transparent, border roz subtil, useNavigate la /)
* [x] UI — Sidebar: titlu iTECify 16px/800, buton ← Home sub titlu (font monospace 11px, roz subtil, hover #f9a8d4, useNavigate la /)
* [x] UI — AIBlock: buton gradient roz/mov 48px + glow, animație pulse când e închis, panel glassmorphism 320×420px blur(20px), border-radius 16px
* [x] UI — AIBlock: butonul flotant înlocuit cu <TriqBot /> (bottom: 80px), X mic în header panel (14×14px, font 10px, padding 2px, top-right absolut)
* [x] UI — AIBlock: TriqBot repositionat la bottom: 200px, right: 24px (deasupra terminalului)
* [x] UI — AIBlock: TriqBot poziționat fix la position:fixed, right:32px, top:50vh, transform:translateY(-50%) — centrat vertical pe ecran, drag eliminat complet
* [x] UI — LoginPage: header card centrat (display:flex, flexDirection:column, alignItems:center, textAlign:center)
* [x] UI — Sidebar header: titlu înlocuit cu 'iTECify · editor' 13px — 'iTECify' roz #f472b6 bold cu animație @keyframes shimmer (pulsează între #f472b6 și #d8b4fe), ' · editor' rgba(255,255,255,0.4) normal
* [x] UI — Sidebar: buton '+ New Project' mutat deasupra titlului Explorer (primul element din zona flex-1, înaintea section header-ului)
* [x] UI — Tab bar editor (App.tsx): redesenat cu TabItem component (hover state propriu); bg rgba(0,0,0,0.3) blur(10px); tab activ: rgba(249,168,212,0.15) + border-bottom 2px solid #f472b6; tab inactiv: rgba(255,255,255,0.4), hover alb + rgba(255,255,255,0.05); buton X vizibil doar la hover; animație @keyframes tab-fade-in (opacity+translateY) la deschidere tab nou
* [x] UI — Bara proiecte (MultiProjectEditorWrapper): glassmorphism rgba(0,0,0,0.3) blur(10px), border-bottom rgba(249,168,212,0.15); tab activ: gradient roz #f9a8d4→#d8b4fe pe numele proiectului + border-bottom 2px solid #f472b6; tab inactiv: rgba(255,255,255,0.5), hover transparent→rgba(255,255,255,0.05)
* [x] Debug — console.log adăugat: remoteCursors în CodeEditor.tsx + presence state în useRealtimeEditor.ts + init/subscribe/track în useRealtimeEditor.ts (pentru verificare funcționare Presence)
* [x] Feature 2 — Cursoare live în editor:
  - useRealtimeEditor: cursor schimbat din `number | null` → `{ lineNumber, column } | null`; updateCursor actualizat; remoteCursors expus în return
  - CodeEditor: editorRef + monacoRef stocate la onMount; useEffect pe remoteCursors+activeFileId → deltaDecorations (line highlight + caret CSS) + ContentWidgets (label deasupra cursorului); cleanup la unmount
  - App.tsx: remoteCursors și activeFileId pasate din RealtimeEditor → CodeEditor
  - Build OK (tsc -b + vite): 0 erori

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
* [x] **[2026-03-28] Membru 2 — Multi-Project, Realtime per-room, Docker limits, Shared Terminal:**
  - **TASK 0.3**: `lib/supabase.ts` — înlocuit fallback placeholder cu `throw new Error(...)` dacă lipsesc env vars. Client creat direct cu variabilele validate.
  - **TASK 2.6**: `backend/src/services/executionService.js` — adăugat `MemorySwap` (fără swap extra), `NanoCpus: 500000000` (0.5 CPU), `PidsLimit: 50` (anti fork bomb), `OomKillDisable: false`, `ReadonlyRootfs: true`.
  - **TASK 2.1.a**: `lib/sessionApi.ts` rescris complet — `createSession(name)` creează proiect cu `invite_code` UUID, adaugă owner în `project_members`, seeduiește 3 fișiere default; `joinSession(inviteCode)` găsește proiect și adaugă member (tolerant la duplicate); `getUserProjects(userId)` returnează toate proiectele cu join pe `project_members`.
  - **TASK 2.1.c**: `hooks/useRealtimeEditor.ts` — adăugat `projectId` ca parametru; channel Realtime filtrat pe `project_id=eq.${projectId}`; presence extins cu `displayName`, `avatarColor`, `activeFileId`; profil Supabase fetched la setup pentru presence.
  - **TASK 2.2**: creat `hooks/useSharedTerminal.ts` — broadcast Realtime per proiect (`terminal-${projectId}`), tip `TerminalEntry` (userId/displayName/avatarColor/type/content/timestamp), expune `outputs`, `broadcast()`, `clearOutputs()`.
  - **⚠️ SUPABASE DASHBOARD — ACȚIUNI MANUALE NECESARE** (vezi mai jos în secțiunea de instrucțiuni).
* [x] **[2026-03-28] Membru 2 — Feature 2: Live Cursors în Editor (Monaco Decorations API):**
  - **`CodeEditor.tsx`**: rescris complet cu Monaco Decorations API + contentWidgets. Fișier de `useRef` stochează `editorRef`, `monacoRef`, `decorationIdsRef`, `widgetListRef`, `styleTagRef`. La fiecare schimbare `connectedUsers`, un `useEffect` (1) generează CSS dinamic per user (background rgba + border-left 3px), injectează un `<style id="itecify-remote-cursors">` în `<head>`, (2) aplică `deltaDecorations` cu `className` per linie, (3) adaugă `contentWidgets` cu eticheta numelui (DisplayName sau userId[:6]) deasupra cursorului — prefer ABOVE/BELOW. Cleanup: widgets + style tag la unmount. Parametru nou `currentUserId` pentru a exclude cursorul propriu.
  - **`ConnectedUsers.tsx`**: actualizat la interfața nouă `ConnectedUser` (userId/displayName/avatarColor/cursor). Eliminat `useProfile` — `displayName` și `avatarColor` vin direct din presence payload. Dots render direct cu datele disponibile.
  - **`useRealtimeEditor.ts`**: `projectId` făcut opțional. Channel fallback: dacă nu există `projectId`, folosește `file-${fileId}`. Filter postgres_changes adaptat: `project_id=eq.${projectId}` sau `id=eq.${fileId}`.
  - **`App.tsx`**: eliminat interfața locală `ConnectedUser`, importat din hook. `RealtimeEditor` extins cu props `projectId?` și `currentUserId?`. Transmitere `projectId` din `useProjectFiles()` și `currentUserId={user?.id}` spre `CodeEditor` pentru excluderea cursorului propriu.
* [x] **[2026-03-28] Membru 2 — Feature 3: Personal Terminals:**
  - creat `hooks/usePersonalTerminal.ts` — state local pur, fără Supabase, expune personalOutputs/addPersonalEntry/clearPersonalOutputs
  - `TerminalOutput.tsx`: adăugat tabs Shared/My Terminal în header; personal tab afișează TerminalEntry[] cu culori per tip; Clear șterge tab-ul activ
  - `App.tsx`: integrat usePersonalTerminal, addPersonalEntry apelat la fiecare event SSE (command/stdout/stderr/error/exit), props noi pasate la TerminalOutput

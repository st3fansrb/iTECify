import { useState, useRef, useEffect } from "react";
import "./TriqBot.css";

export default function TriqBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Sunt Triq. Cum te pot ajuta?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama3-8b-8192",
          messages: [
            {
              role: "system",
              content:
                "Ești Triq, un asistent AI elegant și concis. Răspunzi scurt, clar și direct. Nu ești agresiv, dar ești autoritar.",
            },
            ...newMessages,
          ],
          max_tokens: 512,
          temperature: 0.7,
        }),
      });

      if (!res.ok) throw new Error(`Groq error: ${res.status}`);
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content ?? "Eroare la răspuns.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "A apărut o eroare. Încearcă din nou." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="triq-wrap">
      <div className="triq-row">

        {/* ── CHAT — stânga ── */}
        {open && (
          <div className="triq-chat-col">
            <div className="triq-chat">
              <div className="triq-chat-header">
                <div className="triq-header-dot" />
                <span className="triq-header-title">Triq</span>
              </div>
              <div className="triq-messages">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`triq-msg ${m.role === "assistant" ? "triq-msg-bot" : "triq-msg-user"}`}
                  >
                    {m.content}
                  </div>
                ))}
                {loading && (
                  <div className="triq-thinking">
                    <span /><span /><span />
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="triq-input-row">
                <input
                  className="triq-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Scrie un mesaj..."
                />
                <button className="triq-send" onClick={sendMessage} disabled={loading}>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path d="M2 8L14 2L10 8L14 14L2 8Z" fill="#ddd6fe" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── AVATAR — dreapta ── */}
        <div className="triq-avatar-col">
          <div className="triq-btn" onClick={() => setOpen((o) => !o)}>
            <svg
              className={`triq-svg${open ? " open" : ""}`}
              width={open ? 195 : 150}
              height={open ? 280 : 215}
              viewBox="0 0 180 255"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* CAPE */}
              <path
                d="M44,152 Q10,164 6,200 Q4,224 20,232 L90,232 L160,232 Q176,224 174,200 Q170,164 136,152 Z"
                fill="#0d0618" className="triq-cape"
              />
              <path d="M44,152 Q30,174 28,214 Q28,226 36,232" fill="none" stroke="#2a1545" strokeWidth="1" opacity="0.7" />
              <path d="M136,152 Q150,174 152,214 Q152,226 144,232" fill="none" stroke="#2a1545" strokeWidth="1" opacity="0.7" />
              <path d="M90,154 Q88,188 86,232" fill="none" stroke="#1e0f38" strokeWidth="0.8" opacity="0.5" />
              <path d="M20,232 Q90,236 160,232" fill="none" stroke="#6d4aaf" strokeWidth="0.7" opacity="0.4" />

              {/* CHEST PLATE */}
              <path
                d="M44,152 Q50,188 58,210 L90,214 L122,210 Q130,188 136,152 Q112,158 90,159 Q68,158 44,152Z"
                fill="#160a28" stroke="#5b21b6" strokeWidth="1"
              />
              <line x1="90" y1="152" x2="90" y2="212" stroke="#2d1a4a" strokeWidth="0.7" opacity="0.6" />

              {/* LOGO pe piept */}
              <circle cx="90" cy="178" r="14" fill="#0e0620" stroke="#9d8abf" strokeWidth="1" />
              <circle cx="90" cy="178" r="11" fill="none" stroke="#5b21b6" strokeWidth="0.7" />
              <line x1="90" y1="166" x2="90" y2="190" stroke="#a78bfa" strokeWidth="1.2" />
              <line x1="78" y1="178" x2="102" y2="178" stroke="#a78bfa" strokeWidth="1.2" />
              <line x1="82" y1="170" x2="98" y2="186" stroke="#7c3aed" strokeWidth="0.7" opacity="0.7" />
              <line x1="98" y1="170" x2="82" y2="186" stroke="#7c3aed" strokeWidth="0.7" opacity="0.7" />
              <circle cx="90" cy="178" r="3" fill="#8b5cf6" className="triq-rank-pulse" />
              <circle cx="90" cy="178" r="1.5" fill="#ddd6fe" opacity="0.9" />

              {/* RANK stânga */}
              <rect x="52" y="162" width="26" height="14" rx="2" fill="#0e0620" stroke="#9d8abf" strokeWidth="0.8" />
              <rect x="54" y="164" width="5" height="4" rx="1" fill="#8b5cf6" className="triq-rank-pulse" />
              <rect x="61" y="164" width="5" height="4" rx="1" fill="#8b5cf6" className="triq-rank-pulse-d1" />
              <rect x="68" y="164" width="5" height="4" rx="1" fill="#8b5cf6" className="triq-rank-pulse-d2" />
              <rect x="54" y="170" width="5" height="4" rx="1" fill="#c4b5fd" />
              <rect x="61" y="170" width="5" height="4" rx="1" fill="#3d2060" />
              <rect x="68" y="170" width="5" height="4" rx="1" fill="#c4b5fd" />

              {/* RANK dreapta */}
              <rect x="102" y="162" width="26" height="14" rx="2" fill="#0e0620" stroke="#9d8abf" strokeWidth="0.8" />
              <rect x="104" y="164" width="5" height="4" rx="1" fill="#8b5cf6" className="triq-rank-pulse-d1" />
              <rect x="111" y="164" width="5" height="4" rx="1" fill="#8b5cf6" className="triq-rank-pulse-d2" />
              <rect x="118" y="164" width="5" height="4" rx="1" fill="#8b5cf6" className="triq-rank-pulse" />
              <rect x="104" y="170" width="5" height="4" rx="1" fill="#3d2060" />
              <rect x="111" y="170" width="5" height="4" rx="1" fill="#c4b5fd" />
              <rect x="118" y="170" width="5" height="4" rx="1" fill="#3d2060" />

              {/* UMERI */}
              <path d="M14,142 Q4,148 2,164 Q2,176 14,178 Q26,180 40,168 Q46,158 44,148 Q30,142 14,142Z"
                fill="#1e0f3a" stroke="#9d8abf" strokeWidth="1.1" />
              <path d="M8,154 Q8,146 18,144" fill="none" stroke="#c4b5fd" strokeWidth="0.7" opacity="0.5" />
              <path d="M166,142 Q176,148 178,164 Q178,176 166,178 Q154,180 140,168 Q134,158 136,148 Q150,142 166,142Z"
                fill="#1e0f3a" stroke="#9d8abf" strokeWidth="1.1" />
              <path d="M172,154 Q172,146 162,144" fill="none" stroke="#c4b5fd" strokeWidth="0.7" opacity="0.5" />

              {/* GÂT */}
              <rect x="72" y="120" width="36" height="26" rx="5" fill="#0d0618" />
              <rect x="74" y="118" width="32" height="26" rx="4" fill="#1a0d30" stroke="#7c3aed" strokeWidth="0.9" />
              <line x1="82" y1="119" x2="82" y2="143" stroke="#3d2060" strokeWidth="0.7" />
              <line x1="90" y1="119" x2="90" y2="143" stroke="#3d2060" strokeWidth="0.7" />
              <line x1="98" y1="119" x2="98" y2="143" stroke="#3d2060" strokeWidth="0.7" />
              <rect x="74" y="118" width="32" height="4" rx="2" fill="#2d1a4a" stroke="#9d8abf" strokeWidth="0.6" />
              <rect x="74" y="140" width="32" height="4" rx="2" fill="#2d1a4a" stroke="#9d8abf" strokeWidth="0.6" />

              {/* CONNECTOR umeri */}
              <path d="M44,148 Q58,150 74,144 L106,144 Q122,150 136,148 Q122,154 106,152 L74,152 Q58,154 44,148Z"
                fill="#160a28" stroke="#5b21b6" strokeWidth="0.8" />

              {/* HELMET shadow */}
              <path d="M28,112 Q24,72 32,48 Q42,18 90,16 Q138,18 148,48 Q156,72 152,112 Z" fill="#0d0618" />
              {/* dome */}
              <path d="M32,112 Q28,74 36,50 Q46,21 90,19 Q134,21 144,50 Q152,74 148,112 Z"
                fill="#1e0f3a" stroke="#7c3aed" strokeWidth="1.4" />
              <path d="M40,50 Q36,76 36,112" fill="none" stroke="#b0a0c8" strokeWidth="1.2" opacity="0.3" />
              <path d="M140,50 Q144,76 144,112" fill="none" stroke="#b0a0c8" strokeWidth="1.2" opacity="0.3" />
              <path d="M90,19 L90,112" stroke="#9d8abf" strokeWidth="1" opacity="0.4" />
              <path d="M56,24 Q44,54 42,112" stroke="#3d2060" strokeWidth="0.8" fill="none" />
              <path d="M124,24 Q136,54 138,112" stroke="#3d2060" strokeWidth="0.8" fill="none" />

              {/* CREST */}
              <path d="M70,19 Q90,10 110,19" fill="#160a28" stroke="#7c3aed" strokeWidth="1.1" />
              <path d="M78,17 Q90,11 102,17" fill="#1e0f3a" stroke="#a78bfa" strokeWidth="0.9" />
              <polygon points="90,13 94,18 90,21 86,18" fill="#5b21b6" stroke="#c4b5fd" strokeWidth="0.7" />
              <circle cx="90" cy="17" r="1.2" fill="#ddd6fe" opacity="0.8" />

              {/* FACEPLATE transition */}
              <path d="M36,76 Q62,82 90,83 Q118,82 144,76" fill="none" stroke="#9d8abf" strokeWidth="1.3" />
              {/* faceplate */}
              <path d="M36,76 Q34,94 38,112 Q44,122 90,124 Q136,122 142,112 Q146,94 144,76 Q118,82 90,83 Q62,82 36,76Z"
                fill="#160a28" stroke="#5b21b6" strokeWidth="1" />

              {/* COLTURI CASCA — Vader jowls */}
              <path d="M36,108 Q30,114 28,120 Q28,126 34,128 Q40,130 46,124 Q50,118 48,112 Q44,110 36,108Z"
                fill="#1a0d30" stroke="#7c3aed" strokeWidth="1" />
              <path d="M32,118 Q34,124 40,126" fill="none" stroke="#9d8abf" strokeWidth="0.7" />
              <path d="M36,110 Q32,116 32,122" fill="none" stroke="#3d2060" strokeWidth="0.6" opacity="0.7" />
              <path d="M144,108 Q150,114 152,120 Q152,126 146,128 Q140,130 134,124 Q130,118 132,112 Q136,110 144,108Z"
                fill="#1a0d30" stroke="#7c3aed" strokeWidth="1" />
              <path d="M148,118 Q146,124 140,126" fill="none" stroke="#9d8abf" strokeWidth="0.7" />
              <path d="M144,110 Q148,116 148,122" fill="none" stroke="#3d2060" strokeWidth="0.6" opacity="0.7" />

              {/* EYES */}
              <path d="M42,78 L68,78 L69,90 L41,90 Z" fill="#160a28" stroke="#c4b5fd" strokeWidth="0.9" />
              <path d="M44,80 L66,80 L67,88 L43,88 Z" fill="#2e1065" />
              <path d="M46,81 L64,81 L65,86 L45,86 Z" fill="#4c1d95" opacity="0.8" />
              <path d="M50,82 L62,82 L63,85 L49,85 Z" fill="#7c3aed" opacity="0.7" className="triq-eye-glow" />
              <path d="M46,81 L56,81 L55,83 L45,83 Z" fill="#a78bfa" opacity="0.3" />
              <path d="M112,78 L138,78 L139,90 L111,90 Z" fill="#160a28" stroke="#c4b5fd" strokeWidth="0.9" />
              <path d="M114,80 L136,80 L137,88 L113,88 Z" fill="#2e1065" />
              <path d="M116,81 L134,81 L135,86 L115,86 Z" fill="#4c1d95" opacity="0.8" />
              <path d="M118,82 L130,82 L131,85 L117,85 Z" fill="#7c3aed" opacity="0.7" className="triq-eye-glow-d" />
              <path d="M116,81 L126,81 L125,83 L115,83 Z" fill="#a78bfa" opacity="0.3" />

              {/* NOSE */}
              <rect x="78" y="92" width="24" height="18" rx="3" fill="#160a28" stroke="#9d8abf" strokeWidth="0.9" />
              <rect x="83" y="94" width="14" height="14" rx="2" fill="#120820" stroke="#6d4aaf" strokeWidth="0.6" />
              <rect x="85" y="96" width="10" height="2" rx="1" fill="#4a3070" />
              <rect x="85" y="100" width="10" height="2" rx="1" fill="#4a3070" />
              <rect x="85" y="104" width="10" height="2" rx="1" fill="#4a3070" />

              {/* MOUTH GRILLE */}
              <rect x="44" y="104" width="92" height="18" rx="3" fill="#0e0620" stroke="#9d8abf" strokeWidth="0.9" />
              {[47, 58, 69, 80, 91, 102, 113, 124].map((x, i) => (
                <rect key={i} x={x} y="106" width="8" height="14" rx="1" fill="#1e0f3a" stroke="#5b3f80" strokeWidth="0.5" />
              ))}
              <circle cx="49" cy="113" r="2.5" fill="#8b5cf6" className="triq-breathe" />
              <circle cx="131" cy="113" r="2.5" fill="#8b5cf6" className="triq-breathe-d" />

              {/* CHIN */}
              <path d="M38,112 Q44,124 56,128 L90,130 L124,128 Q136,124 142,112 Q118,118 90,119 Q62,118 38,112Z"
                fill="#1a0d30" stroke="#9d8abf" strokeWidth="0.9" />

              {/* VOICE BOX */}
              <rect x="70" y="130" width="40" height="14" rx="3" fill="#160a28" stroke="#9d8abf" strokeWidth="0.9" />
              <rect x="74" y="133" width="32" height="8" rx="2" fill="#0e0620" stroke="#5b3f80" strokeWidth="0.5" />
              <circle cx="81" cy="137" r="2" fill="#a78bfa" className="triq-breathe" />
              <circle cx="90" cy="137" r="2" fill="#3d2060" />
              <circle cx="99" cy="137" r="2" fill="#a78bfa" className="triq-breathe-d" />
            </svg>
          </div>
          <p className="triq-hint">{open ? "apasă să închizi" : "apasă să deschizi"}</p>
        </div>

      </div>
    </div>
  );
}

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');

// Fallback responses if API is unavailable
const FALLBACK_RESPONSES = {
  javascript: 'try {\n  // Your code here\n} catch (error) {\n  console.error("Error:", error.message);\n}',
  python: 'try:\n    # Your code here\n    pass\nexcept Exception as e:\n    print(f"Error: {e}")',
  rust: 'match result {\n    Ok(value) => println!("{}", value),\n    Err(e) => eprintln!("Error: {}", e),\n}',
  go: 'if err != nil {\n    fmt.Fprintf(os.Stderr, "Error: %v\\n", err)\n    os.Exit(1)\n}',
  java: 'try {\n    // Your code here\n} catch (Exception e) {\n    System.err.println("Error: " + e.getMessage());\n}',
};

router.post('/generate', requireAuth, async (req, res) => {
  const { code, prompt, language } = req.body;

  if (!code || !prompt || !language) {
    return res.status(400).json({ error: 'Missing code, prompt, or language' });
  }

  if (code.length > 5000) {
    return res.status(400).json({ error: 'Code too long. Max 5000 characters.' });
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    console.warn('GROQ_API_KEY not set — using fallback response');
    return res.json({
      generatedCode: FALLBACK_RESPONSES[language] || '// AI unavailable',
      model: 'fallback',
      fallback: true,
    });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 1000,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: `You are a code assistant in an online IDE called iTECify. The user is working in ${language}. Reply with ONLY the code — no explanations, no markdown fences, no comments. Pure executable ${language} code only.`,
          },
          {
            role: 'user',
            content: `Current code:\n\`\`\`${language}\n${code}\n\`\`\`\n\nRequest: ${prompt}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      if (response.status === 429) {
        return res.status(429).json({ error: 'AI rate limit exceeded. Try again in a moment.' });
      }
      throw new Error(errBody.error?.message || `API error ${response.status}`);
    }

    const data = await response.json();
    let generatedCode = data.choices?.[0]?.message?.content?.trim() || '';

    // Strip markdown fences if model adds them anyway
    generatedCode = generatedCode
      .replace(/^```[\w]*\n?/, '')
      .replace(/\n?```$/, '')
      .trim();

    res.json({
      generatedCode,
      model: data.model,
      usage: data.usage,
    });

  } catch (error) {
    console.error('AI generation error:', error.message);

    res.json({
      generatedCode: FALLBACK_RESPONSES[language] || '// AI temporarily unavailable',
      model: 'fallback',
      fallback: true,
      errorDetail: error.message,
    });
  }
});

router.post('/chat', requireAuth, async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Missing messages array' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.json({ reply: 'Triq nu este disponibil momentan (API key lipsă).' });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 512,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: 'Ești Triq, un asistent AI elegant și concis integrat în iTECify IDE. Răspunzi scurt, clar și direct. Ajuți cu cod, debugging și întrebări despre programare.',
          },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `API error ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim() ?? 'Eroare la răspuns.';
    res.json({ reply });
  } catch (error) {
    console.error('[TriqBot chat error]', error.message);
    res.json({ reply: 'A apărut o eroare. Încearcă din nou.' });
  }
});

module.exports = router;

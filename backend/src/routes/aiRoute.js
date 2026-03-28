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

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.warn('ANTHROPIC_API_KEY not set — using fallback response');
    return res.json({
      generatedCode: FALLBACK_RESPONSES[language] || '// AI unavailable',
      model: 'fallback',
      fallback: true,
    });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: `You are a code assistant in an online IDE called iTECify. The user is working in ${language}.\n\nIMPORTANT: Reply with ONLY the code — no explanations, no markdown fences, no comments about what the code does. Pure executable ${language} code only.\n\nCurrent code:\n\`\`\`${language}\n${code}\n\`\`\`\n\nRequest: ${prompt}`,
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
    let generatedCode = data.content?.[0]?.text?.trim() || '';

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

    // Fallback so the demo never crashes due to an external API
    res.json({
      generatedCode: FALLBACK_RESPONSES[language] || '// AI temporarily unavailable',
      model: 'fallback',
      fallback: true,
      errorDetail: error.message,
    });
  }
});

module.exports = router;

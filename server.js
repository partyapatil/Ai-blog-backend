const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

let articles = [];

// Generate multiple articles
app.post('/api/generate-articles', async (req, res) => {
  try {
    const { titles } = req.body;
    
    if (!titles || !Array.isArray(titles)) {
      return res.status(400).json({ error: 'Please provide an array of titles' });
    }

    const generatedArticles = [];

    for (const titleObj of titles) {
      const { title, details } = titleObj;

      // Use Gemini 2.5 Flash
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const prompt = `Write a comprehensive technical blog article about: "${title}"
      ${details ? `Additional details: ${details}` : ''}
      
      Requirements:
      - Write 800-1200 words
      - Include practical examples and code snippets where relevant
      - Use clear headings and structure
      - Make it engaging for developers
      - Include key takeaways at the end
      
      Format the article in markdown.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const content = response.text();

      const article = {
        id: Date.now() + Math.random(),
        title,
        content,
        details: details || '',
        createdAt: new Date().toISOString(),
        slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      };

      generatedArticles.push(article);
      articles.push(article);
      
      // Add delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    res.json({ 
      success: true, 
      articles: generatedArticles,
      count: generatedArticles.length 
    });

  } catch (error) {
    console.error('Error generating articles:', error);
    res.status(500).json({ 
      error: 'Failed to generate articles',
      message: error.message 
    });
  }
});

app.post('/api/generate-single', async (req, res) => {
  try {
    const { prompt } = req.body;
    
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const fullPrompt = `${prompt}
    
    Write this as a technical blog article with 800-1200 words.
    Include code examples if relevant.
    Format in markdown with proper headings.`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const content = response.text();
    
    // Extract title from content (first heading)
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : 'Generated Article';

    const article = {
      id: Date.now(),
      title,
      content,
      details: prompt,
      createdAt: new Date().toISOString(),
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    };

    articles.push(article);

    res.json({ success: true, article });

  } catch (error) {
    console.error('Error generating article:', error);
    res.status(500).json({ 
      error: 'Failed to generate article',
      message: error.message 
    });
  }
});

// Get all articles
app.get('/api/blog', (req, res) => {
  res.json({ articles: articles.reverse() });
});

// Get single article by slug
app.get('/api/blog/:slug', (req, res) => {
  const article = articles.find(a => a.slug === req.params.slug);
  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }
  res.json({ article });
});

// Delete all articles (for testing)
app.delete('/api/blog', (req, res) => {
  articles = [];
  res.json({ success: true, message: 'All articles deleted' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

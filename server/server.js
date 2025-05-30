require('dotenv').config({ path: '.env.local' }); const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

app.post('/chat', async (req, res) => {
    const { message } = req.body;
    try {
        // 1. Embed the input
        const embeddingRes = await openai.embeddings.create({
            model: 'text-embedding-ada-002',
            input: message
        });
        const embedding = embeddingRes.data[0].embedding;

        // 2. Semantic search in Supabase
        const { data: chunks, error: searchError } = await supabase.rpc('match_posts', {
            query_embedding: embedding,
            match_threshold: 0.78,
            match_count: 3
        });

        if (searchError) throw new Error(searchError.message);

        const context = (chunks || []).map(c => c.content.trim()).join('\n\n');
        if (!context) {
            return res.json({ answer: "Sorry, I couldn't find anything relevant to your question." });
        }

        console.log("contect", context);

        // 3. Generate answer with context
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'You are a helpful assistant. Use the provided context to answer the user’s question. Also, make sure to return what the context you recieved is!' },
                { role: 'user', content: `Context:\n${context}\n\nQuestion: ${message}` }
            ]
        });

        const answer = completion.choices[0].message.content;
        res.json({ answer });

    } catch (err) {
        console.error('Chat error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

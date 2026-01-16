const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = 3000;

// Supabase configuratie
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'your-anon-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// CORS configuratie
app.use(cors({
    origin: 'http://localhost:8081',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'api-server' });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'api-server' });
});

// Data endpoint - Nginx voegt automatisch JWT token toe in headers
// Nginx heeft al de authenticatie afgehandeld via OpenID Connect plugin
app.get('/data', async (req, res) => {
    try {
    
        const { data, error } = await supabase
            .from('entities')
            .select('*')
            .limit(10);

        if (error) {
            throw error;
        }

        res.json(data || []);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ 
            error: 'Fout bij ophalen data',
            message: error.message 
        });
    }
});

app.get('/api/data', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('entities')
            .select('*')
            .limit(10);

        if (error) {
            throw error;
        }

        res.json(data || []);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ 
            error: 'Fout bij ophalen data',
            message: error.message 
        });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`API server running on port ${PORT}`);
});

const express = require('express');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3000;

// Read the raw token from the environment variable
const RAW_TOKEN_VALUE = process.env.YODECK_API_KEY; 
const API_LABEL = "Trigger"; 

// 🛑 CRITICAL FIX: Clean the token by stripping the prefix for the final API call
const CLEAN_TOKEN = RAW_TOKEN_VALUE 
    ? RAW_TOKEN_VALUE.replace('digital_signage:', '') 
    : null;

// Base URL for the Yodeck Management Platform API
const YODECK_API_BASE = 'https://api.yodeck.com/v1'; 
const MEDIA_LIST_ENDPOINT = `${YODECK_API_BASE}/media?limit=100`; 

// CORS Middleware
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// ==========================================================
// 🚨 TEMPORARY DEBUGGING ROUTE 🚨 (Check if the token is clean)
// ==========================================================
app.get('/', (req, res) => {
    const keyLoaded = !!RAW_TOKEN_VALUE; 
    const keyStatus = keyLoaded ? "KEY IS LOADED" : "KEY IS NOT LOADED";
    const authHeader = `Authorization: Token ${API_LABEL}:${keyLoaded ? '[KEY_SET]' : '[KEY_MISSING]'}`;
    
    res.send(`
        <h2>Yodeck Media Connector is Running</h2>
        <p><strong>Key Status:</strong> ${keyStatus}</p>
        <p><strong>Clean Token Status:</strong> ${CLEAN_TOKEN ? 'READY' : 'ERROR'}</p>
        <p><strong>Auth Header Format:</strong> ${authHeader}</p>
        <p>If the key is loaded, please test the full API endpoint.</p>
    `);
});
// ==========================================================

// The main API endpoint
app.get('/api/get-yodeck-media-data', async (req, res) => {
    if (!CLEAN_TOKEN) {
        return res.status(500).json({ error: "Server misconfigured: YODECK_API_KEY missing or invalid prefix." });
    }

    try {
        // 🛑 CRITICAL FIX: Use the CLEAN_TOKEN without the prefix here
        const apiResponse = await fetch(MEDIA_LIST_ENDPOINT, {
            method: 'GET',
            headers: {
                'Authorization': `Token ${API_LABEL}:${CLEAN_TOKEN}`, 
                'Content-Type': 'application/json'
            }
        });
        
        // --- ROBUST ERROR HANDLING ---
        if (!apiResponse.ok) {
            let errorText = '';
            try {
                errorText = await apiResponse.text();
            } catch (e) {
                // Ignore failure to read error body
            }
            
            console.error(`Yodeck API Error: ${apiResponse.status} - Response Preview: ${errorText.substring(0, 150)}...`); 
            
            if (apiResponse.status === 401 || errorText.includes('<html>')) {
                 return res.status(401).json({ error: "Yodeck Authentication Failed. Check API Key validity and permissions." });
            }
            return res.status(apiResponse.status).json({ error: "Failed to fetch media from Yodeck Cloud." });
        }
        // --- END ROBUST ERROR HANDLING ---

        // 2. Process Data (Status 200 OK)
        const data = await apiResponse.json();
        const mediaCache = {};
        
        data.results.forEach(media => {
            let playbackUrl = 'UNAVAILABLE_FOR_DIRECT_PLAYBACK'; 
            let mediaType = media.media_type;

            if (media.arguments && media.arguments.source_url) {
                playbackUrl = media.arguments.source_url;
            } else if (media.url) {
                playbackUrl = media.url; 
            }

            mediaCache[media.id] = {
                url: playbackUrl,
                type: mediaType
            };
        });

        // 3. Return the simplified map to the Yodeck App
        res.json(mediaCache);

    } catch (error) {
        console.error("Server fetch error:", error);
        res.status(500).json({ error: `Internal server error during fetch: ${error.message}` });
    }
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
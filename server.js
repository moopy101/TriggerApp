const express = require('express');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3000;
const YODECK_API_KEY = process.env.YODECK_API_KEY; 
const API_LABEL = "YodeckApp"; // Label required by the Yodeck API format

// Base URL for the Yodeck Management Platform API
const YODECK_API_BASE = 'https://api.yodeck.com/v1'; 
const MEDIA_LIST_ENDPOINT = `${YODECK_API_BASE}/media?limit=100`; 

// CORS Middleware: Essential to allow the Yodeck Player to access this API
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
// 🚨 TEMPORARY DEBUGGING ROUTE (For Key Status Check) 🚨
// Use this to verify if the environment variable is loaded.
// ==========================================================
app.get('/', (req, res) => {
    const keyLoaded = !!YODECK_API_KEY; // Check if the key exists
    const keyStatus = keyLoaded ? "KEY IS LOADED" : "KEY IS NOT LOADED";
    const authHeader = `Authorization: Token ${API_LABEL}:${keyLoaded ? '[KEY_SET]' : '[KEY_MISSING]'}`;
    
    res.send(`
        <h2>Yodeck Media Connector is Running</h2>
        <p><strong>Key Status:</strong> ${keyStatus}</p>
        <p><strong>Auth Header Format:</strong> ${authHeader}</p>
        <p>If the key is loaded, please test the full API endpoint.</p>
    `);
});
// ==========================================================

// The main API endpoint that the Yodeck Custom App will call
app.get('/api/get-yodeck-media-data', async (req, res) => {
    if (!YODECK_API_KEY) {
        return res.status(500).json({ error: "Server misconfigured: YODECK_API_KEY missing." });
    }

    try {
        // 🛑 CRITICAL FIX: Using the required "Token <label>:<token_value>" format
        const apiResponse = await fetch(MEDIA_LIST_ENDPOINT, {
            method: 'GET',
            headers: {
                'Authorization': `Token ${API_LABEL}:${YODECK_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!apiResponse.ok) {
            // Log the error response details for better diagnosis
            const errorText = await apiResponse.text();
            console.error(`Yodeck API Error: ${apiResponse.status} - Response
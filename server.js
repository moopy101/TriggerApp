const express = require('express');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3000;
const YODECK_API_KEY = process.env.YODECK_API_KEY; 

// Base URL for the Yodeck Management Platform API
const YODECK_API_BASE = 'https://api.yodeck.com/v1'; 
const MEDIA_LIST_ENDPOINT = `${YODECK_API_BASE}/media?limit=100`; // Fetch up to 100 items

// CORS Middleware: Essential to allow the Yodeck Player to access this API
app.use((req, res, next) => {
    // Allow access from any origin (safe for an API endpoint that only returns public data)
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// ==========================================================
// 🚨 TEMPORARY DEBUGGING ROUTE (Must be updated in GitHub) 🚨
// This checks if the YODECK_API_KEY environment variable is loading correctly.
// ==========================================================
app.get('/', (req, res) => {
    // Check if the environment variable is loaded
    const keyStatus = YODECK_API_KEY ? "KEY IS LOADED" : "KEY IS NOT LOADED";
    
    // We are still sending a 200 OK status, but we now report the key status.
    res.send(`Yodeck Media Connector is running. Key Status: ${keyStatus}.`);
});
// ==========================================================

// The main API endpoint that the Yodeck Custom App will call via the /request proxy
app.get('/api/get-yodeck-media-data', async (req, res) => {
    if (!YODECK_API_KEY) {
        // This is the error we are currently debugging!
        return res.status(500).json({ error: "Server misconfigured: YODECK_API_KEY missing." });
    }

    try {
        // 1. Call the Yodeck Cloud API using the secret API Key
        const apiResponse = await fetch(MEDIA_LIST_ENDPOINT, {
            method: 'GET',
            headers: {
                'Authorization': `ApiKey ${YODECK_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!apiResponse.ok) {
            console.error(`Yodeck API Error: ${apiResponse
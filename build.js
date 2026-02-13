const fs = require('fs');
const path = require('path');

const spaceId = process.env.CONTENTFUL_SPACE_ID;
const token = process.env.CONTENTFUL_TOKEN;

if (!spaceId || !token) {
    console.error('Missing CONTENTFUL_SPACE_ID or CONTENTFUL_TOKEN');
    process.exit(1);
}

// Find all HTML files
const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

files.forEach(file => {
    let html = fs.readFileSync(file, 'utf8');
    
    // Only process if it has placeholders
    if (html.includes('{{CONTENTFUL_SPACE_ID}}')) {
        html = html
            .replace(/{{CONTENTFUL_SPACE_ID}}/g, spaceId)
            .replace(/{{CONTENTFUL_TOKEN}}/g, token);
        
        fs.writeFileSync(file, html);
        console.log(`Injected credentials into ${file}`);
    }
});

console.log('Build complete');


Juice Moon
{ "version": 2, "builds": [ { "src": "api/**/*.js", "use": "@vercel/node" }, { "src": "**/*.html", "use": "@vercel/static" } ], "routes": [ { "src": "/api/(.*)"
11:30 PM (10 minutes ago)

Luckey Day
{ "version": 2, "builds": [ { "src": "build.js", "use": "@vercel/node" },
11:36 PM (4 minutes ago)

Luckey Day
11:36 PM (4 minutes ago)
to me

const fs = require('fs');

const spaceId = process.env.CONTENTFUL_SPACE_ID;
const token = process.env.CONTENTFUL_TOKEN;

if (!spaceId || !token) {
    console.error('Missing env vars');
    process.exit(1);
}

// Process all HTML files
const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

files.forEach(file => {
    let html = fs.readFileSync(file, 'utf8');
    
    if (html.includes('{{CONTENTFUL_SPACE_ID}}')) {
        html = html
            .replace(/{{CONTENTFUL_SPACE_ID}}/g, spaceId)
            .replace(/{{CONTENTFUL_TOKEN}}/g, token);
        
        fs.writeFileSync(file, html);
        console.log(`Injected: ${file}`);
    }
});

// Copy files to dist if needed, or leave in place for static builder
console.log('Build complete');

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


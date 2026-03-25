import fs from 'fs';

const content = fs.readFileSync('./src/i18n.js', 'utf8');

// Fix the broken line 205 before parsing
// Original line 205: ¨Ø­Ø« Ø¹Ù† Ø§Ù„Ù‡Ø¯Ø§ÙŠØ§ Ø§Ù„Ù‚Ø±ÙŠØ¨Ø©",
// It should probably be "cta_map": "Ø¨Ø­Ø« Ø¹Ù† Ø§Ù„Ù‡Ø¯Ø§ÙŠØ§ Ø§Ù„Ù‚Ø±ÙŠØ¨Ø©",
const fixedContent = content.replace(/¨Ø­Ø« Ø¹Ù† Ø§Ù„Ù‡Ø¯Ø§ÙŠØ§ Ø§Ù„Ù‚Ø±ÙŠØ¨Ø©",/g, '"cta_map": "Ø¨Ø­Ø« Ø¹Ù† Ø§Ù„Ù‡Ø¯Ø§ÙŠØ§ Ø§Ù„Ù‚Ø±ÙŠØ¨Ø©",');

const match = fixedContent.match(/const resources = (\{[\s\S]*?\});\s*i18n/);
if (match) {
    try {
        const resourcesStr = match[1];
        // Using Function to safely evaluate the object literal
        const resources = new Function('return ' + resourcesStr)();
        
        fs.mkdirSync('./public/locales/en', { recursive: true });
        fs.mkdirSync('./public/locales/ru', { recursive: true });
        
        fs.writeFileSync('./public/locales/en/translation.json', JSON.stringify(resources.en.translation, null, 4));
        fs.writeFileSync('./public/locales/ru/translation.json', JSON.stringify(resources.ru.translation, null, 4));
        console.log("Successfully extracted locales to public/locales!");
    } catch (e) {
        console.error("Failed to parse resources:", e);
    }
} else {
    console.log("Failed to match resources");
}

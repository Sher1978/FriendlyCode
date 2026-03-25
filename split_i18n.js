import fs from 'fs';

const content = fs.readFileSync('./src/i18n.js', 'utf8');

const match = content.match(/const resources = (\{[\s\S]*?\});\s*i18n/);
if (match) {
    const resourcesStr = match[1];
    const resources = eval('(' + resourcesStr + ')');
    
    fs.mkdirSync('./src/locales', { recursive: true });
    fs.writeFileSync('./src/locales/en.json', JSON.stringify(resources.en.translation, null, 4));
    fs.writeFileSync('./src/locales/ru.json', JSON.stringify(resources.ru.translation, null, 4));
    console.log("Successfully extracted locales!");
} else {
    console.log("Failed to match resources");
}

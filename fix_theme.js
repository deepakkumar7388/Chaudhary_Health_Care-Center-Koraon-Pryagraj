const fs = require('fs');
const path = require('path');

const jsDir = path.join(__dirname, 'js');
const files = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
    const filePath = path.join(jsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace background: #fff or background: #ffffff with background: var(--card-bg)
    let modified = content.replace(/background:\s*#fff(?:fff)?\s*(!important)?\s*;/gi, 'background: var(--card-bg)$1;');
    modified = modified.replace(/background:\s*#fff(?:fff)?\s*(!important)?\s*"/gi, 'background: var(--card-bg)$1"');
    modified = modified.replace(/background:\s*#fff(?:fff)?\s*(!important)?\s*'/gi, 'background: var(--card-bg)$1\'');
    
    modified = modified.replace(/background-color:\s*#fff(?:fff)?\s*(!important)?\s*;/gi, 'background-color: var(--card-bg)$1;');
    modified = modified.replace(/background-color:\s*#fff(?:fff)?\s*(!important)?\s*"/gi, 'background-color: var(--card-bg)$1"');
    
    // Some background:#fff are in the middle with a space, so let's match word boundary
    modified = modified.replace(/background:\s*#fff(?:fff)?\b/gi, 'background: var(--card-bg)');

    // Light yellow backgrounds that hurt dark mode
    modified = modified.replace(/background:\s*#fffbeb\b/gi, 'background: var(--card-bg)');
    modified = modified.replace(/background:\s*#fff7ed\b/gi, 'background: var(--card-bg)');

    // But DON'T replace `--card-bg` if it's setting the CSS variable root.style.setProperty('--card-bg', '#ffffff')
    // Let's restore those explicitly if accidentally changed
    modified = modified.replace(/setProperty\('--card-bg',\s*'background: var\(--card-bg\)'\)/g, "setProperty('--card-bg', '#ffffff')");
    modified = modified.replace(/setProperty\('--sidebar-bg',\s*'background: var\(--card-bg\)'\)/g, "setProperty('--sidebar-bg', '#ffffff')");

    if (modified !== content) {
        fs.writeFileSync(filePath, modified, 'utf8');
        console.log(`Updated ${file}`);
    }
});
console.log("Done");

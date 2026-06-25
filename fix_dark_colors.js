const fs = require('fs');

const fileReplacements = [
    {
        file: 'js/patient-record.js',
        replacements: [
            { regex: /#f8fafc/gi, replace: 'var(--background)' },
            { regex: /#f1f5f9/gi, replace: 'var(--background)' },
            { regex: /#e2e8f0/gi, replace: 'var(--border)' },
            { regex: /#cbd5e1/gi, replace: 'var(--border)' },
            { regex: /#64748b/gi, replace: 'var(--text-muted)' },
            { regex: /#475569/gi, replace: 'var(--text-muted)' }
        ]
    },
    {
        file: 'js/settings.js',
        replacements: [
            { regex: /#f8fafc/gi, replace: 'var(--background)' },
            { regex: /#e2e8f0/gi, replace: 'var(--border)' }
        ]
    },
    {
        file: 'js/billing.js',
        replacements: [
            { regex: /#f8fafc/gi, replace: 'var(--background)' },
            { regex: /#e2e8f0/gi, replace: 'var(--border)' }
        ]
    },
    {
        file: 'js/daily-notes.js',
        replacements: [
            { regex: /#f8fafc/gi, replace: 'var(--background)' },
            { regex: /#e2e8f0/gi, replace: 'var(--border)' },
            { regex: /#f1f5f9/gi, replace: 'var(--background)' }
        ]
    }
];

fileReplacements.forEach(({ file, replacements }) => {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        let modified = content;
        replacements.forEach(({ regex, replace }) => {
            modified = modified.replace(regex, replace);
        });
        if (content !== modified) {
            fs.writeFileSync(file, modified);
            console.log(`Updated ${file}`);
        } else {
            console.log(`No changes in ${file}`);
        }
    } else {
        console.log(`File not found: ${file}`);
    }
});

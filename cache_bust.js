const fs=require('fs');
let c=fs.readFileSync('index.html','utf8');
c=c.replace(/href="(css\/[a-zA-Z0-9-]+\.css)(?:\?v=\d+)?"/g, 'href="$1?v=' + Date.now() + '"');
c=c.replace(/src="(js\/[a-zA-Z0-9-]+\.js)(?:\?v=\d+)?"/g, 'src="$1?v=' + Date.now() + '"');
fs.writeFileSync('index.html',c);
console.log('Cache busted CSS and JS');

const fs=require('fs');
const files=fs.readdirSync('js').filter(f=>f.endsWith('.js'));
files.forEach(f=>{
    let c=fs.readFileSync('js/'+f,'utf8');
    const m=c.replace(/background(-color)?:\s*white\b/gi, 'background$1: var(--card-bg)');
    if(m!==c){
        fs.writeFileSync('js/'+f,m);
        console.log('Fixed',f);
    }
});

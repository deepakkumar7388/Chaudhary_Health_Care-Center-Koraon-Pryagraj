const fs=require('fs');
const files=['css/style.css', 'css/patient.css', 'css/add-patient.css', 'css/daily-notes.css', 'css/users.css'];
files.forEach(f=>{
    if(!fs.existsSync(f)) return;
    let c=fs.readFileSync(f,'utf8');
    const m=c.replace(/background(-color)?:\s*(#fff|#ffffff|white)\b(?!\s*!important)/gi, 'background$1: var(--card-bg)');
    if(m!==c){
        fs.writeFileSync(f,m);
        console.log('Fixed',f);
    }
});

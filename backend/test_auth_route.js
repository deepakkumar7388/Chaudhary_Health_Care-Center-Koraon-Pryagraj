const http = require('http');

async function test() {
    // 1. Login to get token
    const loginData = JSON.stringify({
        username: 'admin',
        password: 'admin123'
    });

    const loginOptions = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': loginData.length
        }
    };

    const loginReq = http.request(loginOptions, (loginRes) => {
        let body = '';
        loginRes.on('data', chunk => body += chunk);
        loginRes.on('end', () => {
            const result = JSON.parse(body);
            if (!result.token) return;
            
            const req = http.request({
                hostname: 'localhost',
                port: 5000,
                path: '/api/patients',
                method: 'GET',
                headers: { 'Authorization': `Bearer ${result.token}` }
            }, res => {
                let pBody = '';
                res.on('data', c => pBody += c);
                res.on('end', () => console.log(pBody));
            });
            req.end();
        });
    });

    loginReq.write(loginData);
    loginReq.end();
}

test();

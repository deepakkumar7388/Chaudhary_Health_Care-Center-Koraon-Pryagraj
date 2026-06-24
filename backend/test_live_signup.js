const fetch = require('node-fetch');

async function testLiveSignup() {
    try {
        console.log("Attempting to sign up on LIVE Render server...");
        const response = await fetch('https://hms-backend-w20q.onrender.com/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Live Test User',
                email: 'testlive' + Date.now() + '@gmail.com',
                mobile: '1234567890',
                password: 'password123',
                role: 'admin' // or user
            })
        });
        
        const data = await response.json();
        console.log("Response from Live Server:", data);
    } catch (err) {
        console.error("Error pinging live server:", err);
    }
}

testLiveSignup();

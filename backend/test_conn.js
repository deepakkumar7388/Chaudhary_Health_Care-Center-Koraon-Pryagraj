const mongoose = require('mongoose');
const uri = 'mongodb+srv://deepak:Deepak123456@cluster0.evytu0b.mongodb.net/chaudhary_hms_db?retryWrites=true&w=majority';
mongoose.connect(uri)
    .then(() => {
        console.log('SUCCESS: Password Deepak123456 worked!');
        process.exit(0);
    })
    .catch(err => {
        console.log('FAILED: Password Deepak123456 failed. Error:', err.message);
        process.exit(1);
    });

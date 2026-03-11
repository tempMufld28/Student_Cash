const db = require('./db');
const bcrypt = require('bcrypt');

async function test() {
    const hashedPassword = await bcrypt.hash('password123', 10);
    console.log('Testing DB insert...');

    db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', ['Test2', 'test2@test.com', hashedPassword], function (err) {
        if (err) {
            console.error('DB ERROR:', err);
        } else {
            console.log('User registered successfully', this.lastID);
        }

        console.log('Testing DB select...');
        db.get('SELECT * FROM users WHERE email = ?', ['test2@test.com'], (err, user) => {
            if (err) {
                console.error('Select error:', err);
            } else {
                console.log('Found user:', user);
            }
            process.exit(0);
        });
    });
}

test();

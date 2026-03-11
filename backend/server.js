const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const getDb = require('./db');

const app = express();
app.use(express.json());
app.use(cors());

app.use((req, res, next) => {
    console.log(`[REQ] ${req.method} ${req.url}`, req.body);
    next();
});

const PORT = process.env.PORT || 5005;
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_student_cash';

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Access denied' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

// --- Rutas de Auth ---
app.post('/api/auth/register', async (req, res) => {
    console.log('-> Hit /api/auth/register');
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });

    try {
        const db = await getDb();
        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashedPassword]);
        res.status(201).json({ message: 'User registered successfully', userId: result.lastID });
    } catch (error) {
        console.error('Register Error:', error);
        if (error.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

    try {
        const db = await getDb();
        const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);

        if (!user) return res.status(400).json({ error: 'User not found' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).json({ error: 'Invalid password' });

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ message: 'Login successful', token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// --- Rutas deTransactions ---
app.get('/api/transactions', authenticateToken, async (req, res) => {
    try {
        const db = await getDb();
        const rows = await db.all('SELECT * FROM transactions WHERE userId = ? ORDER BY date DESC', [req.user.userId]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/transactions', authenticateToken, async (req, res) => {
    const { type, description, amount, category, date } = req.body;
    if (!type || !description || amount == null || !category || !date) {
        return res.status(400).json({ error: 'Missing fields' });
    }

    try {
        const db = await getDb();
        const result = await db.run(
            'INSERT INTO transactions (userId, type, description, amount, category, date) VALUES (?, ?, ?, ?, ?, ?)',
            [req.user.userId, type, description, amount, category, date]
        );
        res.status(201).json({ id: result.lastID, type, description, amount, category, date });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.delete('/api/transactions/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const db = await getDb();
        await db.run('DELETE FROM transactions WHERE id = ? AND userId = ?', [id, req.user.userId]);
        res.status(204).end();
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// --- Planned Expenses Routes ---
app.get('/api/planned-expenses', authenticateToken, async (req, res) => {
    try {
        const db = await getDb();
        const rows = await db.all('SELECT * FROM planned_expenses WHERE userId = ? ORDER BY date ASC', [req.user.userId]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/planned-expenses', authenticateToken, async (req, res) => {
    const { description, amount, date, modules } = req.body;
    if (!description || amount == null || !date) {
        return res.status(400).json({ error: 'Missing fields' });
    }

    try {
        const db = await getDb();
        const result = await db.run(
            'INSERT INTO planned_expenses (userId, description, amount, date, modules) VALUES (?, ?, ?, ?, ?)',
            [req.user.userId, description, amount, date, JSON.stringify(modules || [])]
        );
        res.status(201).json({ id: result.lastID, description, amount, date, modules: modules || [] });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.delete('/api/planned-expenses/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const db = await getDb();
        await db.run('DELETE FROM planned_expenses WHERE id = ? AND userId = ?', [id, req.user.userId]);
        res.status(204).end();
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Ensure DB is initialized before listening
getDb().then(() => {
    app.listen(PORT, '127.0.0.1', () => {
        console.log(`Server running on http://127.0.0.1:${PORT}`);
    });
}).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});

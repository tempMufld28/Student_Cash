const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');

let dbInstance = null;

async function getDb() {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database', err.message);
        reject(err);
        return;
      }

      console.log('Connected to the SQLite database.');

      db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT UNIQUE,
            password TEXT,
            gender TEXT,
            avatar TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER,
            type TEXT, /* 'Gasto' or 'Ingreso' */
            description TEXT,
            amount REAL,
            category TEXT,
            date TEXT,
            FOREIGN KEY (userId) REFERENCES users (id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS planned_expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER,
            description TEXT,
            amount REAL,
            date TEXT,
            modules TEXT,
            deadline_date TEXT,
            event_date TEXT,
            collaborators TEXT,
            FOREIGN KEY (userId) REFERENCES users (id)
        )`);

        // Intentar agregar columnas nuevas si la tabla ya existía sin ellas
        db.run('ALTER TABLE planned_expenses ADD COLUMN modules TEXT', (err) => {
          if (err && !err.message.includes('duplicate column')) {
            console.error('Error adding modules column to planned_expenses:', err.message);
          }
        });

        db.run('ALTER TABLE planned_expenses ADD COLUMN deadline_date TEXT', (err) => {
          if (err && !err.message.includes('duplicate column')) {
            console.error('Error adding deadline_date column to planned_expenses:', err.message);
          }
        });

        db.run('ALTER TABLE planned_expenses ADD COLUMN event_date TEXT', (err) => {
          if (err && !err.message.includes('duplicate column')) {
            console.error('Error adding event_date column to planned_expenses:', err.message);
          }
        });

        db.run('ALTER TABLE planned_expenses ADD COLUMN collaborators TEXT', (err) => {
          if (err && !err.message.includes('duplicate column')) {
            console.error('Error adding collaborators column to planned_expenses:', err.message);
          }
        });

        db.run('ALTER TABLE users ADD COLUMN gender TEXT', (err) => {
          if (err && !err.message.includes('duplicate column')) {
            console.error('Error adding gender column to users:', err.message);
          }
        });

        db.run('ALTER TABLE users ADD COLUMN avatar TEXT', (err) => {
          if (err && !err.message.includes('duplicate column')) {
            console.error('Error adding avatar column to users:', err.message);
          }
        });

        // Promisify the db methods we need in server.js
        dbInstance = {
          run: (sql, params) => new Promise((res, rej) => db.run(sql, params, function (err) { err ? rej(err) : res(this) })),
          get: (sql, params) => new Promise((res, rej) => db.get(sql, params, (err, row) => err ? rej(err) : res(row))),
          all: (sql, params) => new Promise((res, rej) => db.all(sql, params, (err, rows) => err ? rej(err) : res(rows)))
        };
        resolve(dbInstance);
      });
    });
  });

}

module.exports = getDb;

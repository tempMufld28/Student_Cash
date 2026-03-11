const express = require('express');
const app = express();
app.use(express.json());
app.post('/api/test', (req, res) => {
    console.log("Ping");
    res.json({ok: true});
});
app.listen(5000, '0.0.0.0', () => console.log('test running'));

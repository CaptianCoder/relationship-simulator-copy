const express = require('express');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const app = express();

const PORT = 3000;
const ADMIN_EMAIL = "admin.cool@hwdsb.on.ca".toLowerCase();
const REGISTRY_FILE = 'participants.csv';
const LOG_FILE = 'scenario-results.log';

// Setup
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Admin authentication middleware
const adminAuth = (req, res, next) => {
    try {
        const authCookie = req.cookies?.auth;
        if (!authCookie) throw new Error('No authentication token');
        
        const email = Buffer.from(authCookie, 'base64').toString('utf-8');
        if (email !== ADMIN_EMAIL) throw new Error('Invalid admin credentials');
        
        next();
    } catch (error) {
        res.status(403).send(`Admin Access Denied: ${error.message}`);
    }
};

// Initialize data files
[REGISTRY_FILE, LOG_FILE].forEach(file => {
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, 'Timestamp,FirstName,LastName,Email,Completed,Eligible\n');
    }
});

// Registration endpoint
app.post('/register', (req, res) => {
    const { firstName, lastName, email } = req.body;
    const cleanEmail = email.toLowerCase().trim();
    
    // Validation
    if (!firstName || !lastName || !cleanEmail.endsWith('@hwdsb.on.ca')) {
        return res.status(400).json({ error: 'Invalid HWDSB email' });
    }

    const entry = `${new Date().toISOString()},${firstName},${lastName},${cleanEmail},false,false\n`;

    fs.appendFile(REGISTRY_FILE, entry, (err) => {
        if (err) return res.status(500).json({ error: 'Registration failed' });

        // Set auth cookie
        res.cookie('auth', Buffer.from(cleanEmail).toString('base64'), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
        });

        // Determine redirect
        const isAdmin = cleanEmail === ADMIN_EMAIL;
        res.json({ 
            redirectTo: isAdmin ? '/admin' : '/#main-content' 
        });
    });
});

// Admin endpoints
app.get('/admin', adminAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/admin.html'));
});

app.get('/admin/stats', adminAuth, (req, res) => {
    try {
        const participants = fs.readFileSync(REGISTRY_FILE, 'utf8')
            .split('\n')
            .slice(1)
            .filter(row => row.trim())
            .map(row => {
                const [timestamp, firstName, lastName, email, completed, eligible] = row.split(',');
                return {
                    timestamp,
                    firstName: firstName.replace(/"/g, ''),
                    lastName: lastName.replace(/"/g, ''),
                    email: email.replace(/"/g, ''),
                    completed: completed === 'true',
                    eligible: eligible?.trim() === 'true'
                };
            });

        const stats = {
            totalParticipants: participants.length,
            completedCount: participants.filter(p => p.completed).length,
            eligibleCount: participants.filter(p => p.eligible).length,
            recentParticipants: participants.slice(-10).reverse()
        };

        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load stats' });
    }
});

// Other existing endpoints
app.get('/scenarios', (req, res) => {
    res.sendFile(path.join(__dirname, 'scenarios.json'));
});

app.post('/log', (req, res) => {
    // Existing logging code
});

app.listen(PORT, () => {
    console.log(`Server running: http://localhost:${PORT}`);
});
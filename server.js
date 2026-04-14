

require('dotenv').config();

const express = require('express');
const fs = require('fs');
const path = require('path');
const morgan = require('morgan');
const bcrypt = require('bcrypt');
const { Storage } = require('@google-cloud/storage');

const app = express();
const PORT = process.env.PORT || 8080;
const SALT_ROUNDS = 10;


// --- GCP Configuration ---
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'formbucket37';
const BLOB_NAME = process.env.GCS_BLOB_NAME || 'users/users.json';
const DEFAULT_KEY_PATHS = [
  process.env.GOOGLE_APPLICATION_CREDENTIALS,
  '/home/abhaypandey/Downloads/advance-drive-492907-q3-08a60ab6ec6d.json',
  '/home/abhaypandey/advance-drive-492907-q3.json',
  '/home/abhay/advance-drive-492907-q3.json',
].filter(Boolean);


const keyFilename = DEFAULT_KEY_PATHS.find((candidate) => fs.existsSync(candidate));

const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT || 'advance-drive-492907-q3',
  keyFilename,
});

const blob = storage.bucket(BUCKET_NAME).file(BLOB_NAME);

// --- Middleware ---
app.use(morgan('dev'));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));



const normalizePhone = (value = '') => {
  const cleaned = String(value).trim().replace(/[^\d+]/g, '');
  const digitsOnly = cleaned.replace(/\D/g, '');

  if (!digitsOnly) {
    return '';
  }

  if (cleaned.startsWith('+')) {
    return `+${digitsOnly}`;
  }

  return digitsOnly;
};

// --- Helper: Read users from GCP bucket ---
const readUsers = async () => {
  try {
    const [exists] = await blob.exists();
    if (!exists) {
      await blob.save(JSON.stringify([], null, 2), { contentType: 'application/json' });
      return [];
    }
    const [contents] = await blob.download();
    return JSON.parse(contents.toString('utf-8'));
  } catch (err) {
    console.error('Error reading users from GCP:', err.message);
    throw err;
  }
};

// --- Helper: Write users to GCP bucket ---
const writeUsers = async (users) => {
  try {
    await blob.save(JSON.stringify(users, null, 2), { contentType: 'application/json' });
  } catch (err) {
    console.error('Error writing users to GCP:', err.message);
    throw err;
  }
};

// --- API Endpoints ---

// POST /api/submit  (Registration)
app.post('/api/submit', async (req, res) => {
  const { name, email, phone, password } = req.body;
  const normalizedPhone = normalizePhone(phone);

  if (!name || !email || !phone || !password) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  if (/\d/.test(name)) {
    return res.status(400).json({ success: false, message: 'Name cannot contain digits.' });
  }

  const emailRegex = /^[^\s@]+@(gmail|yahoo|outlook|highspring)\.(com|in)$/i;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'Unsupported email provider or domain.' });
  }

  if (normalizedPhone.length < 10) {
    return res.status(400).json({ success: false, message: 'Please enter a valid phone number.' });
  }

  const pwRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
  if (!pwRegex.test(password)) {
    return res.status(400).json({ success: false, message: 'Password does not meet complexity requirements.' });
  }

  try {
    const users = await readUsers();

    if (users.find((u) => u.email === email || normalizePhone(u.phone) === normalizedPhone)) {
      return res.status(400).json({ success: false, message: 'User already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const newUser = {
      id:            users.length + 1,
      name,
      email,
      phone: normalizedPhone,
      password:      hashedPassword,
      registered_at: new Date().toISOString(),
    };

    users.push(newUser);
    await writeUsers(users);

    console.log('New user registered: ' + name + ' (' + email + ') saved to GCS');
    return res.json({ success: true, message: 'Registration successful!' });
  } catch (err) {
    console.error('Error during registration:', err);
    return res.status(500).json({ success: false, message: 'Failed to save user data.' });
  }
});

// POST /api/login
app.post('/api/login', async (req, res) => {
  const { identifier, password } = req.body;
  const normalizedIdentifier = normalizePhone(identifier);

  if (!identifier || !password) {
    return res.status(400).json({ success: false, message: 'Credentials required.' });
  }

  try {
    const users = await readUsers();

    const user = users.find(
      (u) => u.email === identifier.trim() || normalizePhone(u.phone) === normalizedIdentifier
    );

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email/phone or password.' });
    }

    const match = await bcrypt.compare(password, user.password);

    if (match) {
      console.log('User logged in: ' + user.name + ' (' + user.email + ')');
      return res.json({
        success: true,
        message: 'Login successful!',
        user: { name: user.name, email: user.email },
      });
    } else {
      return res.status(401).json({ success: false, message: 'Invalid email/phone or password.' });
    }
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

app.listen(PORT, () => {
  console.log('Server is live on port ' + PORT);
  console.log('GCS Bucket: gs://' + BUCKET_NAME + '/' + BLOB_NAME);
  console.log('Using credentials from ' + keyFilename);
});

/**
 * ADVANCED AUTH SYSTEM v2.0
 * Features: Login/Register Toggle, Country Search, Phone Masking, Strict Validation, Bcrypt Integration.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let mode = 'register'; // 'register' or 'login'
    let selectedCC = '+91';
    let selectedFlag = '🇮🇳';

    // --- DOM Elements ---
    const authWrapper = document.querySelector('.auth-toggle-wrapper');
    const toggleBtns = document.querySelectorAll('.toggle-btn');
    const modeBadge = document.getElementById('mode-badge');
    const modeTitle = document.getElementById('mode-title');
    const modeDesc = document.getElementById('mode-desc');
    const submitBtnText = document.querySelector('.btn-text');

    const authForm = document.getElementById('auth-form');
    const serverMessage = document.getElementById('server-message');
    const loader = document.querySelector('.loader');

    const countrySelector = document.getElementById('country-selector');
    const countryDropdown = document.getElementById('country-dropdown');
    const countrySearch = document.getElementById('country-search');
    const countryList = document.getElementById('country-list');
    const selectedCCEl = document.querySelector('#selected-country .prefix');
    const selectedFlagEl = document.querySelector('#selected-country .flag');

    const phoneInput = document.getElementById('phone');
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    const successSection = document.getElementById('success-section');
    const authSection = document.getElementById('auth-section');

    // --- Country Data ---
    const countries = [
        { name: 'India', code: 'IN', prefix: '+91', flag: '🇮🇳' },
        { name: 'United States', code: 'US', prefix: '+1', flag: '🇺🇸' },
        { name: 'United Kingdom', code: 'GB', prefix: '+44', flag: '🇬🇧' },
        { name: 'Canada', code: 'CA', prefix: '+1', flag: '🇨🇦' },
        { name: 'Australia', code: 'AU', prefix: '+61', flag: '🇦🇺' },
        { name: 'Germany', code: 'DE', prefix: '+49', flag: '🇩🇪' },
        { name: 'France', code: 'FR', prefix: '+33', flag: '🇫🇷' },
        { name: 'Japan', code: 'JP', prefix: '+81', flag: '🇯🇵' },
        { name: 'Singapore', code: 'SG', prefix: '+65', flag: '🇸🇬' },
        { name: 'United Arab Emirates', code: 'AE', prefix: '+971', flag: '🇦🇪' },
    ];

    // --- Initialize Country List ---
    const renderCountries = (filter = '') => {
        countryList.innerHTML = '';
        const filtered = countries.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()) || c.prefix.includes(filter));
        
        filtered.forEach(c => {
            const li = document.createElement('li');
            li.className = 'country-item';
            li.innerHTML = `<span>${c.flag} ${c.name}</span><span class="code">${c.prefix}</span>`;
            li.onclick = (e) => {
                e.stopPropagation();
                selectedCC = c.prefix;
                selectedFlag = c.flag;
                selectedCCEl.textContent = selectedCC;
                selectedFlagEl.textContent = selectedFlag;
                countryDropdown.classList.add('hidden');
            };
            countryList.appendChild(li);
        });
    };

    renderCountries();

    // Toggle Dropdown
    countrySelector.addEventListener('click', (e) => {
        e.stopPropagation();
        countryDropdown.classList.toggle('hidden');
        if (!countryDropdown.classList.contains('hidden')) countrySearch.focus();
    });

    countrySearch.addEventListener('input', (e) => renderCountries(e.target.value));
    document.addEventListener('click', () => countryDropdown.classList.add('hidden'));

    // --- Phone Masking (3-3-4 Format) ---
    phoneInput.addEventListener('input', (e) => {
        let x = e.target.value.replace(/\D/g, '').match(/(\d{0,3})(\d{0,3})(\d{0,4})/);
        e.target.value = !x[2] ? x[1] : x[1] + '-' + x[2] + (x[3] ? '-' + x[3] : '');
    });

    // --- Mode Switching ---
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            mode = btn.dataset.mode;
            document.querySelector('.main-container').setAttribute('data-mode', mode);
            
            toggleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update UI
            if (mode === 'login') {
                modeBadge.textContent = 'Welcome Back';
                modeTitle.innerHTML = 'Vault <span>Login.</span>';
                modeDesc.textContent = 'Enter your details to re-enter your vault.';
                submitBtnText.textContent = 'Access Vault';
                emailInput.placeholder = 'Email or Phone';
            } else {
                modeBadge.textContent = 'New Account';
                modeTitle.innerHTML = 'Get <span>Started.</span>';
                modeDesc.textContent = 'Enter your credentials to access the vault.';
                submitBtnText.textContent = 'Create Account';
                emailInput.placeholder = 'alex@gmail.com';
            }
            
            serverMessage.textContent = '';
            authForm.querySelectorAll('.input-group').forEach(g => g.classList.remove('invalid'));
        });
    });

    // --- Validation Logic ---
    const validateField = (id) => {
        const input = document.getElementById(id);
        const group = input.closest('.input-group');
        let isValid = true;
        const val = input.value.trim();

        if (mode === 'login') {
            if (id === 'email') isValid = val.length > 0;
            if (id === 'password') isValid = val.length >= 8;
        } else {
            if (id === 'name') isValid = val.length >= 2 && !/\d/.test(val);
            if (id === 'email') {
                const emailRegex = /^[^\s@]+@(gmail|yahoo|outlook|highspring)\.(com|in)$/i;
                isValid = emailRegex.test(val);
            }
            if (id === 'phone') isValid = val.replace(/\D/g, '').length === 10;
            if (id === 'password') {
                const pwRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
                isValid = pwRegex.test(val);
            }
        }

        group.classList.toggle('invalid', !isValid);
        return isValid;
    };

    // --- Real-time Validation ---
    const setupRealTimeValidation = () => {
        ['name', 'email', 'phone', 'password'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('input', () => {
                // For phone, we only validate if it's long enough or was already invalid
                // But user wants "instant" errors, so we show if it's NOT 10 digits
                validateField(id);
            });
            // Also validate on blur to be safe
            el.addEventListener('blur', () => validateField(id));
        });
    };

    setupRealTimeValidation();

    // --- Form Submission ---
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Validate
        const fields = mode === 'register' ? ['name', 'email', 'phone', 'password'] : ['email', 'password'];
        let isAllValid = true;
        fields.forEach(f => { if (!validateField(f)) isAllValid = false; });
        if (!isAllValid) return;

        // UI Loading
        submitBtnText.style.opacity = '0';
        loader.classList.remove('hidden');
        serverMessage.textContent = '';

        const endpoint = mode === 'register' ? '/api/submit' : '/api/login';
        
        const payload = mode === 'register' ? {
            name: nameInput.value.trim(),
            email: emailInput.value.trim(),
            phone: selectedCC + ' ' + phoneInput.value,
            password: passwordInput.value
        } : {
            identifier: emailInput.value.trim(),
            password: passwordInput.value
        };

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (data.success) {
                showSuccess(data.user || payload, mode);
            } else {
                serverMessage.textContent = data.message;
            }
        } catch (err) {
            serverMessage.textContent = 'Server connection failed.';
        } finally {
            submitBtnText.style.opacity = '1';
            loader.classList.add('hidden');
        }
    });

    // --- Success State ---
    const showSuccess = (user, type) => {
        document.getElementById('res-name-val').textContent = user.name || 'User';
        document.getElementById('res-id-val').textContent = user.email || user.identifier;
        
        if (type === 'login') {
            document.getElementById('success-status').textContent = 'Access Granted!';
            document.getElementById('success-detail').textContent = 'You have successfully logged into your vault.';
        }

        authSection.classList.remove('active');
        authWrapper.style.opacity = '0';
        authWrapper.style.pointerEvents = 'none';

        setTimeout(() => {
            authSection.style.display = 'none';
            successSection.style.display = 'block';
            setTimeout(() => successSection.classList.add('active'), 50);
        }, 500);
    };

    // --- Password visibility ---
    document.getElementById('toggle-password').addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.querySelector('.eye-open').classList.toggle('hidden');
        this.querySelector('.eye-closed').classList.toggle('hidden');
    });
});
// Get DOM elements
const loadingState = document.getElementById('loadingState');
const formState = document.getElementById('formState');
const successState = document.getElementById('successState');
const errorState = document.getElementById('errorState');
const captchaCheckbox = document.getElementById('captchaCheckbox');
const verifyBtn = document.getElementById('verifyBtn');
const errorMessage = document.getElementById('errorMessage');

// Get token from URL
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('t');

// Track if verification already attempted
let verificationAttempted = false;

// State management
function showState(state) {
    loadingState.classList.add('hidden');
    formState.classList.add('hidden');
    successState.classList.add('hidden');
    errorState.classList.add('hidden');

    state.classList.remove('hidden');
}

function showError(message) {
    errorMessage.textContent = message;
    showState(errorState);
}

function showSuccess() {
    showState(successState);
}

function showForm() {
    showState(formState);
}

// Enable/disable verify button based on captcha
captchaCheckbox.addEventListener('change', () => {
    verifyBtn.disabled = !captchaCheckbox.checked;
});

// Verify button click handler
verifyBtn.addEventListener('click', async () => {
    if (verificationAttempted) {
        showError('Token sudah pernah digunakan');
        return;
    }

    if (!captchaCheckbox.checked) {
        return;
    }

    verificationAttempted = true;
    verifyBtn.disabled = true;
    verifyBtn.classList.add('loading');
    verifyBtn.querySelector('.btn-text').textContent = 'Memverifikasi';

    try {
        const response = await fetch('/api/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token: token,
                captcha: 'confirmed'
            })
        });

        const data = await response.json();

        if (data.success) {
            showSuccess();

            // Redirect to Telegram after 2 seconds
            setTimeout(() => {
                if (data.deepLink) {
                    window.location.href = data.deepLink;
                }
            }, 2000);
        } else {
            showError(data.message || 'Verifikasi gagal');

            // Redirect to Telegram after 3 seconds
            setTimeout(() => {
                window.location.href = 'https://telegram.me';
            }, 3000);
        }
    } catch (error) {
        console.error('Verification error:', error);
        showError('Terjadi kesalahan. Silakan coba lagi.');
        verificationAttempted = false;
        verifyBtn.disabled = false;
        verifyBtn.classList.remove('loading');
        verifyBtn.querySelector('.btn-text').textContent = 'Verifikasi Sekarang';
    }
});

// Validate token on page load
async function validateToken() {
    if (!token) {
        showError('Token tidak ditemukan');
        setTimeout(() => {
            window.location.href = 'https://telegram.me';
        }, 3000);
        return;
    }

    try {
        const response = await fetch('/api/validate-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token })
        });

        const data = await response.json();

        if (data.success) {
            showForm();
        } else {
            showError(data.message || 'Token tidak valid');
            setTimeout(() => {
                window.location.href = 'https://telegram.me';
            }, 3000);
        }
    } catch (error) {
        console.error('Token validation error:', error);
        showError('Terjadi kesalahan saat memvalidasi token');
        setTimeout(() => {
            window.location.href = 'https://telegram.me';
        }, 3000);
    }
}

// Prevent refresh/back after verification
window.addEventListener('beforeunload', (e) => {
    if (verificationAttempted) {
        e.preventDefault();
        e.returnValue = '';
    }
});

// Detect if page was refreshed
if (performance.navigation.type === 1) {
    // Page was refreshed
    showError('Halaman tidak boleh di-refresh. Token sudah tidak valid.');
    setTimeout(() => {
        window.location.href = 'https://telegram.me';
    }, 3000);
} else {
    // First load
    validateToken();
}

// Prevent back button after verification
window.history.pushState(null, '', window.location.href);
window.addEventListener('popstate', () => {
    if (verificationAttempted) {
        window.history.pushState(null, '', window.location.href);
        showError('Token sudah digunakan dan tidak dapat digunakan lagi');
    }
});

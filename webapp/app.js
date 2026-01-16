const API_URL = 'http://localhost:8080/api';

let userInfo = null;

// Check if user is authenticated by making a request
// NGINX gateway will redirect to login if not authenticated
async function checkAuth() {
    try {
        // Probeer data op te halen - gateway handelt auth af
        const response = await fetch(`${API_URL}/data`, {
            method: 'GET',
            credentials: 'include' // Important: include cookies for session
        });

        if (response.ok) {
            // User is authenticated
            showDataSection();
            return true;
        } else if (response.status === 302 || response.redirected) {
            // NGINX gateway redirect naar login
            showLoginSection();
            return false;
        } else {
            showLoginSection();
            return false;
        }
    } catch (error) {
        console.error('Auth check error:', error);
        showLoginSection();
        return false;
    }
}

// Check auth on page load
checkAuth();

// Handle login button - gewoon naar de API gaan, gateway redirect naar Keycloak
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    // Gewoon naar de API gaan - gateway handelt de redirect naar Keycloak af
    window.location.href = `${API_URL}/data`;
});

document.getElementById('fetch-data-btn').addEventListener('click', async () => {
    try {
        const response = await fetch(`${API_URL}/data`, {
            method: 'GET',
            credentials: 'include' // Important: include cookies
        });

        if (!response.ok) {
            if (response.status === 302 || response.redirected) {
                // NGINX gateway redirect naar login
                showLoginSection();
                throw new Error('Niet ingelogd, wordt doorgestuurd naar login');
            }
            throw new Error('Fout bij ophalen data');
        }

        const data = await response.json();
        displayData(data);
    } catch (error) {
        document.getElementById('data-content').innerHTML = 
            `<p class="error">Fout: ${error.message}</p>`;
    }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    // Logout wordt afgehandeld via gateway (nog te configureren in NGINX)
    window.location.href = 'http://localhost:8080/logout';
});

function showDataSection() {
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('data-section').classList.remove('hidden');
    document.getElementById('user-name').textContent = 'Gebruiker';
}

function showLoginSection() {
    document.getElementById('login-section').classList.remove('hidden');
    document.getElementById('data-section').classList.add('hidden');
    document.getElementById('data-content').innerHTML = '';
    document.getElementById('error-message').textContent = '';
}

function displayData(data) {
    const container = document.getElementById('data-content');
    if (Array.isArray(data) && data.length === 0) {
        container.innerHTML = '<p>Geen data gevonden.</p>';
        return;
    }
    
    container.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
}

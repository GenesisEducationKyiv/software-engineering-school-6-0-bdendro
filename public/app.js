const subscribeForm = document.querySelector('[data-testid="subscribe-form"]');
const emailInput = document.querySelector('[data-testid="email-input"]');
const repoInput = document.querySelector('[data-testid="repo-input"]');
const submitButton = document.querySelector('[data-testid="subscribe-button"]');
const statusMessage = document.querySelector('[data-testid="status-message"]');

const API_ENDPOINTS = {
  subscribe: '/api/subscribe',
};

subscribeForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  clearStatus();

  const email = emailInput.value.trim();
  const repo = repoInput.value.trim();

  const clientValidationError = validateForm({ email, repo });

  if (clientValidationError) {
    showStatus('error', clientValidationError);
    return;
  }

  setLoading(true);

  try {
    const response = await fetch(API_ENDPOINTS.subscribe, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, repo }),
    });

    const responseBody = await readJsonResponse(response);

    if (!response.ok) {
      showApiError(response.status, responseBody);
      return;
    }

    showStatus(
      'success',
      responseBody.message || 'Subscription successful. Confirmation email sent.',
    );

    subscribeForm.reset();
  } catch (error) {
    showStatus('error', 'Could not connect to the server.');
  } finally {
    setLoading(false);
  }
});

function validateForm({ email, repo }) {
  if (!email) {
    return 'Email is required.';
  }

  if (!emailInput.checkValidity()) {
    return 'Enter a valid email address.';
  }

  if (!repo) {
    return 'GitHub repository is required.';
  }

  if (!isValidRepo(repo)) {
    return 'Repository must be in owner/repo format.';
  }

  return null;
}

function isValidRepo(repo) {
  return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo);
}

async function readJsonResponse(response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (err) {
    return {};
  }
}

function showApiError(status, responseBody) {
  if (responseBody && Array.isArray(responseBody.details)) {
    showValidationError(responseBody.message || 'Validation Error', responseBody.details);
    return;
  }

  const fallbackMessage = getFallbackErrorMessage(status);
  showStatus('error', responseBody.message || fallbackMessage);
}

function showValidationError(title, details) {
  const detailsList = details
    .map((detail) => {
      const path = Array.isArray(detail.path) ? detail.path.join('.') : 'field';
      return `<li><strong>${escapeHtml(path)}:</strong> ${escapeHtml(detail.message)}</li>`;
    })
    .join('');

  showStatusHtml(
    'error',
    `
      <p class="status__title">${escapeHtml(title)}</p>
      <ul class="status__details">${detailsList}</ul>
    `,
  );
}

function getFallbackErrorMessage(status) {
  switch (status) {
    case 400:
      return 'Invalid subscription data.';
    case 404:
      return 'GitHub repository was not found or is inaccessible.';
    case 409:
      return 'This email is already subscribed to this repository.';
    case 503:
      return 'GitHub service is temporarily unavailable. Try again later.';
    default:
      return 'Something went wrong. Try again later.';
  }
}

function showStatus(type, message) {
  showStatusHtml(type, escapeHtml(message));
}

function showStatusHtml(type, html) {
  statusMessage.hidden = false;
  statusMessage.className = `status status--${type}`;
  statusMessage.innerHTML = html;
}

function clearStatus() {
  statusMessage.hidden = true;
  statusMessage.className = 'status';
  statusMessage.textContent = '';
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? 'Processing...' : 'Subscribe';

  emailInput.disabled = isLoading;
  repoInput.disabled = isLoading;

  if (isLoading) {
    showStatus('info', 'Creating subscription...');
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

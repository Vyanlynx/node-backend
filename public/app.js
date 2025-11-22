// Constants
const TERMS_ACCEPTED_KEY = "jsonvault_terms_accepted";
const NOTIFICATION_DURATION = 3000;
const STATUS_RESET_DELAY = 3000;
const CHAR_COUNT_DEBOUNCE = 100;

// Utility: Debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Utility: Safe element selection
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

// DOM Elements - Cached for performance
let elements = {};

function initElements() {
  elements = {
    form: $("#jsonForm"),
    textarea: $("#inputjson"),
    submitBtn: $("#submitButton"),
    clearBtn: $("#clearBtn"),
    formatBtn: $("#formatBtn"),
    charCount: $(".char-count"),
    responseSection: $("#responseSection"),
    responseContent: $("#responseContent"),
    statusDot: $(".status-dot"),
    statusText: $(".status-indicator span"),
    termsModal: $("#termsModal"),
    acceptBtn: $("#acceptBtn"),
    declineBtn: $("#declineBtn"),
  };
}

// Terms & Conditions Modal
function showTermsModal() {
  if (elements.termsModal) {
    elements.termsModal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }
}

function hideTermsModal() {
  if (elements.termsModal) {
    elements.termsModal.style.display = "none";
    document.body.style.overflow = "auto";
  }
}

function checkTermsAcceptance() {
  try {
    const accepted = localStorage.getItem(TERMS_ACCEPTED_KEY);
    if (!accepted) {
      setTimeout(showTermsModal, 300); // Slight delay for better UX
    }
  } catch (error) {
    console.warn("localStorage not available:", error);
  }
}

function acceptTerms() {
  try {
    localStorage.setItem(TERMS_ACCEPTED_KEY, "true");
    hideTermsModal();
    showNotification("Thank you for accepting our terms!", "success");
  } catch (error) {
    console.error("Failed to save terms acceptance:", error);
    hideTermsModal();
  }
}

function declineTerms() {
  if (confirm("Are you sure you want to decline? You'll be redirected away.")) {
    window.location.href = "https://www.google.com";
  }
}

// Character counter (optimized with debouncing)
function updateCharCount() {
  if (!elements.textarea || !elements.charCount) return;
  requestAnimationFrame(() => {
    const count = elements.textarea.value.length;
    elements.charCount.textContent = `${count.toLocaleString()} characters`;
  });
}

const debouncedUpdateCharCount = debounce(updateCharCount, CHAR_COUNT_DEBOUNCE);

// JSON Validation
function isValidJSON(str) {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

// Format JSON function
function formatJSON() {
  if (!elements.textarea) return;

  const value = elements.textarea.value.trim();
  if (!value) {
    showNotification("Please enter JSON data first", "info");
    return;
  }

  if (!isValidJSON(value)) {
    showNotification("Invalid JSON - please check your syntax", "error");
    return;
  }

  try {
    const parsed = JSON.parse(value);
    const formatted = JSON.stringify(parsed, null, 2);
    elements.textarea.value = formatted;
    updateCharCount();
    showNotification("JSON formatted successfully! ✓", "success");
  } catch (error) {
    showNotification("Error formatting JSON", "error");
    console.error("Format error:", error);
  }
}

// Clear textarea
function clearTextarea() {
  if (!elements.textarea) return;

  if (elements.textarea.value.length > 0) {
    elements.textarea.value = "";
    updateCharCount();
    showNotification("Content cleared", "info");
  }
}

// Update status indicator (optimized)
function updateStatus(status, text) {
  if (!elements.statusDot || !elements.statusText) return;

  requestAnimationFrame(() => {
    elements.statusDot.className = "status-dot";
    elements.statusDot.classList.add(status);
    elements.statusText.textContent = text;
  });
} // Notification system (optimized)
let activeNotifications = [];
const MAX_NOTIFICATIONS = 3;
let notificationContainer = null;

function createNotificationContainer() {
  if (!notificationContainer) {
    notificationContainer = document.createElement("div");
    notificationContainer.id = "notification-container";
    notificationContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      pointer-events: none;
    `;
    document.body.appendChild(notificationContainer);
  }
  return notificationContainer;
}

function showNotification(message, type = "info") {
  const container = createNotificationContainer();

  // Remove oldest if exceeding max
  while (activeNotifications.length >= MAX_NOTIFICATIONS) {
    const oldest = activeNotifications.shift();
    if (oldest?.parentNode) {
      oldest.remove();
    }
  }

  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.textContent = message;

  const colors = {
    success: "#10b981",
    error: "#ef4444",
    info: "#3b82f6",
  };

  notification.style.cssText = `
    padding: 1rem 1.5rem;
    border-radius: 10px;
    color: white;
    font-weight: 600;
    font-size: 0.9rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    background: ${colors[type] || colors.info};
    max-width: 350px;
    word-wrap: break-word;
    margin-bottom: 10px;
    opacity: 0;
    transform: translateX(100%);
    transition: opacity 0.3s ease, transform 0.3s ease;
    pointer-events: auto;
  `;

  container.appendChild(notification);
  activeNotifications.push(notification);

  // Trigger animation
  requestAnimationFrame(() => {
    notification.style.opacity = "1";
    notification.style.transform = "translateX(0)";
  });

  // Remove after duration
  setTimeout(() => {
    notification.style.opacity = "0";
    notification.style.transform = "translateX(100%)";
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
      activeNotifications = activeNotifications.filter(
        (n) => n !== notification
      );
    }, 300);
  }, NOTIFICATION_DURATION);
}

// Display API response (optimized)
function displayResponse(data, isError = false) {
  if (!elements.responseContent || !elements.responseSection) return;

  const sanitizedData =
    typeof data === "string" ? data : JSON.stringify(data, null, 2);

  const responseHtml = `
    <div class="response-data ${isError ? "error" : "success"}">
      <pre>${sanitizedData}</pre>
    </div>
  `;

  requestAnimationFrame(() => {
    elements.responseContent.innerHTML = responseHtml;
    elements.responseSection.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  });
}

// Generate unique project ID
function generateProjectId() {
  const randomStr = Math.random().toString(36).substring(2, 15);
  return `${randomStr}`;
}

// Form submission handler
async function handleFormSubmit(e) {
  e.preventDefault();

  if (!elements.textarea || !elements.submitBtn) return;

  const input = elements.textarea.value.trim();

  if (!input) {
    showNotification("Please enter your JSON data before saving", "error");
    elements.textarea.focus();
    return;
  }

  if (!isValidJSON(input)) {
    showNotification("Invalid JSON format - please verify your data", "error");
    return;
  }

  const payload = {
    key: generateProjectId(),
    data: input,
  };

  // Set loading state
  elements.submitBtn.classList.add("loading");
  elements.submitBtn.disabled = true;
  updateStatus("loading", "Saving...");

  try {
    const response = await fetch("/setData", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success) {
      displayResponse(result);
      showNotification("✓ Data saved successfully!", "success");
      updateStatus("success", "Saved");
    } else {
      throw new Error(result.message || "Failed to save data");
    }
  } catch (error) {
    console.error("Error submitting data:", error);
    displayResponse({ error: error.message }, true);
    showNotification("Failed to save data - please try again", "error");
    updateStatus("error", "Error");
  } finally {
    // Reset loading state
    elements.submitBtn.classList.remove("loading");
    elements.submitBtn.disabled = false;

    // Reset status after delay
    setTimeout(() => {
      updateStatus("ready", "All Systems Go");
    }, STATUS_RESET_DELAY);
  }
}

// Event listener setup (optimized with passive listeners)
function setupEventListeners() {
  if (elements.form) {
    elements.form.addEventListener("submit", handleFormSubmit);
  }

  if (elements.textarea) {
    // Use debounced version for input event with passive listener
    elements.textarea.addEventListener("input", debouncedUpdateCharCount, {
      passive: true,
    });

    // Keyboard shortcuts
    elements.textarea.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "Enter") {
          e.preventDefault();
          elements.form?.dispatchEvent(new Event("submit"));
        }
        if (e.key === "d") {
          e.preventDefault();
          clearTextarea();
        }
      }
    });
  }
  if (elements.clearBtn) {
    elements.clearBtn.addEventListener("click", clearTextarea);
  }

  if (elements.formatBtn) {
    elements.formatBtn.addEventListener("click", formatJSON);
  }

  if (elements.acceptBtn) {
    elements.acceptBtn.addEventListener("click", acceptTerms);
  }

  if (elements.declineBtn) {
    elements.declineBtn.addEventListener("click", declineTerms);
  }
} // Inject CSS animations (optimized)
function injectStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .status-dot.ready { background: #10b981; box-shadow: 0 0 8px rgba(16, 185, 129, 0.4); }
    .status-dot.loading { background: #f59e0b; }
    .status-dot.success { background: #10b981; }
    .status-dot.error { background: #ef4444; }
    .response-data pre {
      margin: 0;
      white-space: pre-wrap;
      word-wrap: break-word;
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      font-size: 0.875rem;
      line-height: 1.5;
    }
  `;
  document.head.appendChild(style);
}

// Initialize application
function init() {
  // Initialize DOM element cache
  initElements();

  // Setup all event listeners
  setupEventListeners();

  // Initialize UI
  updateCharCount();
  updateStatus("ready", "All Systems Go");

  // Check terms acceptance
  checkTermsAcceptance();

  // Inject styles
  injectStyles();

  console.log("🔒 JSONVault initialized successfully");
}

// Start app when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

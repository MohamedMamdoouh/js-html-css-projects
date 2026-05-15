import { openDatabaseAsync, dbHelpers } from "../database.js";

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
}

const VALIDATION = {
  NAME_MIN_LENGTH: 3,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MEDIUM_LENGTH: 10,
  ADDRESS_MIN_LENGTH: 10,
  MODAL_AUTO_HIDE_DELAY_MS: 2000,
  STRENGTH_WEAK_THRESHOLD: 2,
  STRENGTH_MEDIUM_THRESHOLD: 4,
  REMEMBER_ME_DURATION_MS: 7 * 24 * 60 * 60 * 1000,
};

const SESSION_DURATION_MS = 30 * 60 * 1000;
const SESSION_KEY = "ecommerce_session";

let signInForm;
let signUpForm;
let signUpBtn;
let signInBtn;
let formTitle;
let formSubtitle;
let successModal;
let modalTitle;
let modalMessage;
let modalCloseBtn;
let signUpPassword;
let strengthBar;

document.addEventListener("DOMContentLoaded", async () => {
  signInForm = document.getElementById("signInForm");
  signUpForm = document.getElementById("signUpForm");
  signUpBtn = document.getElementById("signUpBtn");
  signInBtn = document.getElementById("signInBtn");
  formTitle = document.getElementById("formTitle");
  formSubtitle = document.getElementById("formSubtitle");
  successModal = document.getElementById("successModal");
  modalTitle = document.getElementById("modalTitle");
  modalMessage = document.getElementById("modalMessage");
  modalCloseBtn = document.getElementById("modalCloseBtn");
  signUpPassword = document.getElementById("signUpPassword");
  strengthBar = document.getElementById("strength-bar");

  await openDatabaseAsync();
  checkSession();
  setupEventListeners();
});

function setupEventListeners() {
  signInForm?.addEventListener("submit", handleSignIn);
  signUpForm?.addEventListener("submit", handleSignUp);
  signUpBtn?.addEventListener("click", () => switchForm("signup"));
  signInBtn?.addEventListener("click", () => switchForm("signin"));
  signUpPassword?.addEventListener("input", updatePasswordStrength);

  modalCloseBtn?.addEventListener("click", () => {
    if (modalTimeout) {
      clearTimeout(modalTimeout);
      modalTimeout = null;
    }
    // use shared handler for consistent behavior
    setModalCloseHandler();
  });

  document.querySelectorAll("input, textarea").forEach((input) => {
    input.addEventListener("blur", () => validateInput(input));
  });

  // Bind show/hide password toggles using SVG icons
  const ICON_SHOW = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const ICON_HIDE = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8 1.5-3 4-5.5 8-6.7"/><path d="M1 1l22 22"/></svg>`;

  document.querySelectorAll(".show-pass-toggle").forEach((btn) => {
    const targetId = btn.dataset.target;
    const input = document.getElementById(targetId);
    if (!input) return;
    const isCurrentlyText = input.type === "text";
    btn.innerHTML = isCurrentlyText ? ICON_HIDE : ICON_SHOW;
    btn.setAttribute("aria-pressed", String(isCurrentlyText));
    btn.title = isCurrentlyText ? "Hide password" : "Show password";

    btn.addEventListener("click", () => {
      const isText = input.type === "text";
      input.type = isText ? "password" : "text";
      btn.setAttribute("aria-pressed", String(!isText));
      btn.title = isText ? "Show password" : "Hide password";
      btn.innerHTML = isText ? ICON_SHOW : ICON_HIDE;
    });
  });
}

function switchForm(form) {
  clearErrors();
  if (form === "signup") {
    signInForm.classList.add("hidden");
    signUpForm.classList.remove("hidden");
    formTitle.textContent = "Sign Up";
    formSubtitle.textContent = "Create your account to get started";
    signUpForm.reset();
  } else {
    signUpForm.classList.add("hidden");
    signInForm.classList.remove("hidden");
    formTitle.textContent = "Sign In";
    formSubtitle.textContent = "Please enter your details";
    signInForm.reset();
  }
}

async function handleSignIn(e) {
  e.preventDefault();
  clearErrors();

  const emailInput = document.getElementById("signInEmail");
  const passwordInput = document.getElementById("signInPassword");
  const rememberMe = document.getElementById("rememberMe").checked;

  const isEmailValid = validateInput(emailInput);
  const isPasswordValid = validateInput(passwordInput);
  if (!isEmailValid || !isPasswordValid) return;

  const user = await dbHelpers.getByIndex(
    "users",
    "email",
    emailInput.value.trim(),
  );

  const hashedPassword = await hashPassword(passwordInput.value);
  if (user?.password !== hashedPassword) {
    ShowErrorMessage("signInEmail", "Invalid email or password");
    return;
  }

  const session = {
    userId: String(user.id),
    email: user.email,
    name: user.name,
    address: user.address,
    loginTime: Date.now(),
    expiresAt: Date.now() + SESSION_DURATION_MS,
  };

  if (rememberMe) {
    session.expiresAt = Date.now() + VALIDATION.REMEMBER_ME_DURATION_MS;
  }

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));

  showModal(
    "Welcome Back!",
    `You have been logged in successfully as ${user.name}`,
    true,
    "../Shop/shop.html",
  );
  setModalCloseHandler("../Shop/shop.html");
}

function ShowErrorMessage(inputId, message) {
  const errorElement = document.getElementById(inputId + "Error");
  if (errorElement) {
    errorElement.textContent = message;
  }
}

async function handleSignUp(e) {
  e.preventDefault();
  clearErrors();

  const nameInput = document.getElementById("signUpName");
  const emailInput = document.getElementById("signUpEmail");
  const passwordInput = document.getElementById("signUpPassword");
  const confirmPasswordInput = document.getElementById("signUpConfirmPassword");
  const addressInput = document.getElementById("signUpAddress");

  const isNameValid = validateInput(nameInput);
  const isEmailValid = validateInput(emailInput);
  const isPasswordValid = validateInput(passwordInput);
  const isConfirmPasswordValid = validateInput(confirmPasswordInput);
  const isAddressValid = validateInput(addressInput);

  if (
    !isNameValid ||
    !isEmailValid ||
    !isPasswordValid ||
    !isConfirmPasswordValid ||
    !isAddressValid
  ) {
    return;
  }

  const existingUser = await dbHelpers.getByIndex(
    "users",
    "email",
    emailInput.value.trim(),
  );
  if (existingUser) {
    ShowErrorMessage("signUpEmail", "Email already exists");
    return;
  }

  const hashedPassword = await hashPassword(passwordInput.value);
  const newUser = {
    name: nameInput.value.trim(),
    email: emailInput.value.trim(),
    password: hashedPassword,
    address: addressInput.value.trim(),
    createdAt: new Date().toISOString(),
  };

  try {
    const userId = await dbHelpers.add("users", newUser);
    newUser.id = userId;
  } catch (error) {
    console.error("Error creating user:", error);
    return;
  }

  const session = {
    userId: newUser.id,
    email: newUser.email,
    name: newUser.name,
    address: newUser.address,
    loginTime: Date.now(),
    expiresAt: Date.now() + SESSION_DURATION_MS,
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));

  showModal(
    "Account Created!",
    "You have been successfully registered and logged in.",
    true,
    "../Shop/shop.html",
  );
  setModalCloseHandler("../Shop/shop.html");
}

function checkSession() {
  const sessionStr = localStorage.getItem(SESSION_KEY);
  if (!sessionStr) {
    return false;
  }

  try {
    const session = JSON.parse(sessionStr);
    if (Date.now() > session.expiresAt) {
      logout();
      return false;
    }
    session.expiresAt = Date.now() + SESSION_DURATION_MS;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return true;
  } catch (error) {
    logout();
    console.error("Error parsing session:", error.message);
    return false;
  }
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
}

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function clearErrors() {
  document.querySelectorAll(".error-message").forEach((el) => {
    el.textContent = "";
  });
}

function validateEmailInput(value) {
  if (!value) return "Email is required";
  if (!validateEmail(value)) return "Please enter a valid email address";
  return "";
}

function validatePasswordInput(value) {
  if (!value) return "Password is required";
  if (value.length < VALIDATION.PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters`;
  }
  return "";
}

function validateConfirmPasswordInput(value) {
  if (!value) return "Please confirm your password";
  const password = document.getElementById("signUpPassword").value;
  if (value !== password) return "Passwords do not match";
  return "";
}

function validateNameInput(value) {
  if (!value) return "Name is required";
  if (value.length < VALIDATION.NAME_MIN_LENGTH) {
    return `Name must be at least ${VALIDATION.NAME_MIN_LENGTH} characters`;
  }
  return "";
}

function validateAddressInput(value) {
  if (!value) return "Address is required";
  if (value.length < VALIDATION.ADDRESS_MIN_LENGTH) {
    return "Please enter a valid address";
  }
  return "";
}

function getValidationError(inputId, value) {
  switch (inputId) {
    case "signInEmail":
    case "signUpEmail":
      return validateEmailInput(value);
    case "signInPassword":
    case "signUpPassword":
      return validatePasswordInput(value);
    case "signUpConfirmPassword":
      return validateConfirmPasswordInput(value);
    case "signUpName":
      return validateNameInput(value);
    case "signUpAddress":
      return validateAddressInput(value);
    default:
      return "";
  }
}

function validateInput(input) {
  const errorElementId = input.id + "Error";
  const errorElement = document.getElementById(errorElementId);
  if (!errorElement) return true;

  const value = input.value.trim();
  const errorMessage = getValidationError(input.id, value);
  const isValid = errorMessage === "";

  errorElement.textContent = errorMessage;
  return isValid;
}

function updatePasswordStrength() {
  const password = signUpPassword.value;
  let strength = 0;

  if (password.length >= VALIDATION.PASSWORD_MIN_LENGTH) strength++;
  if (password.length >= VALIDATION.PASSWORD_MEDIUM_LENGTH) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;

  strengthBar.classList.remove("weak", "medium", "strong");

  if (password.length === 0) {
    strengthBar.classList.remove("weak", "medium", "strong");
  } else if (strength <= VALIDATION.STRENGTH_WEAK_THRESHOLD) {
    strengthBar.classList.add("weak");
  } else if (strength <= VALIDATION.STRENGTH_MEDIUM_THRESHOLD) {
    strengthBar.classList.add("medium");
  } else {
    strengthBar.classList.add("strong");
  }
}

let modalTimeout = null;
let countdownInterval = null;

function setModalCloseHandler(redirectUrl = null) {
  if (!modalCloseBtn) return;
  // remove existing listeners by replacing the element
  const newBtn = modalCloseBtn.cloneNode(true);
  modalCloseBtn.parentNode.replaceChild(newBtn, modalCloseBtn);
  modalCloseBtn = newBtn;
  modalCloseBtn.addEventListener("click", () => {
    if (modalTimeout) {
      clearTimeout(modalTimeout);
      modalTimeout = null;
    }
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
    successModal?.classList.add("hidden");
    if (redirectUrl) globalThis.location.href = redirectUrl;
  });
}

function showModal(title, message, autoHide = true, redirectUrl = null) {
  modalTitle.textContent = title;
  modalMessage.textContent = message;
  successModal.classList.remove("hidden");

  if (modalTimeout) clearTimeout(modalTimeout);
  if (countdownInterval) clearInterval(countdownInterval);

  const existingCountdown = document.querySelector(".modal-countdown");
  if (existingCountdown) existingCountdown.remove();

  if (autoHide) {
    const countdown = document.createElement("div");
    countdown.className = "modal-countdown";

    const spinner = document.createElement("div");
    spinner.className = "countdown-spinner";

    const countdownText = document.createElement("span");
    countdownText.className = "countdown-text";

    countdown.appendChild(spinner);
    countdown.appendChild(countdownText);

    // Append to the modal content div, not the overlay
    const modalContent = successModal.querySelector(".modal");
    modalContent.appendChild(countdown);

    let secondsLeft = VALIDATION.MODAL_AUTO_HIDE_DELAY_MS / 1000;
    countdownText.textContent = `Auto-redirecting in ${secondsLeft}s...`;

    countdownInterval = setInterval(() => {
      secondsLeft -= 1;
      countdownText.textContent = `Auto-redirecting in ${secondsLeft}s...`;
      if (secondsLeft <= 0) {
        clearInterval(countdownInterval);
      }
    }, 1000);

    modalTimeout = setTimeout(() => {
      clearInterval(countdownInterval);
      countdown.remove();
      successModal.classList.add("hidden");
      if (redirectUrl) globalThis.location.href = redirectUrl;
    }, VALIDATION.MODAL_AUTO_HIDE_DELAY_MS);
  }
}

// export functions for use in other modules
export { checkSession, logout };

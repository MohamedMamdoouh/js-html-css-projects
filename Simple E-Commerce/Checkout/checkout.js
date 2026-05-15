import { checkSession } from "../Auth/auth.js";
import { openDatabaseAsync, dbHelpers } from "../database.js";

const basketBody = document.getElementById("basketBody");
const emptyMsg = document.getElementById("emptyMsg");
const totalAmount = document.getElementById("totalAmount");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const btnConfirmOrder = document.getElementById("confirmOrderBtn");
const btnClearCart = document.getElementById("clearBasketBtn");
const btnBack = document.getElementById("backBtn");

const SESSION_KEY = "ecommerce_session";

function getSessionUser() {
  const sessionStr = localStorage.getItem(SESSION_KEY);
  if (!sessionStr) return null;
  try {
    const session = JSON.parse(sessionStr);
    return { userId: session.userId, email: session.email };
  } catch {
    return null;
  }
}

function setStatusOk(msg) {
  statusDot.classList.remove("dot-wait");
  statusDot.classList.add("dot-ok");
  statusText.textContent = msg;
}

function setStatusWait(msg) {
  statusDot.classList.remove("dot-ok");
  statusDot.classList.add("dot-wait");
  statusText.textContent = msg;
}

function showToast(message, type = "info", duration = 3000) {
  const toast = document.createElement("div");
  toast.className = "ui-toast";

  const icon = document.createElement("div");
  icon.className = "toast-icon";
  icon.textContent = type === "error" ? "!" : "i";

  const txt = document.createElement("div");
  txt.textContent = message;

  toast.appendChild(icon);
  toast.appendChild(txt);
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, duration);
}

function showAlertModal(title, message) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "ui-modal-overlay";

    const modal = document.createElement("div");
    modal.className = "ui-modal";

    const h = document.createElement("h3");
    h.textContent = title || "Notice";

    const p = document.createElement("p");
    p.textContent = message || "";

    const actions = document.createElement("div");
    actions.className = "ui-modal-actions";

    const ok = document.createElement("button");
    ok.className = "ui-modal-button primary";
    ok.textContent = "OK";

    actions.appendChild(ok);
    modal.appendChild(h);
    modal.appendChild(p);
    modal.appendChild(actions);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    ok.addEventListener("click", () => {
      overlay.remove();
      resolve(true);
    });

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.remove();
        resolve(true);
      }
    });
  });
}

function showConfirmModal(title, message) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "ui-modal-overlay";

    const modal = document.createElement("div");
    modal.className = "ui-modal";

    const h = document.createElement("h3");
    h.textContent = title || "Confirm";

    const p = document.createElement("p");
    p.textContent = message || "";

    const actions = document.createElement("div");
    actions.className = "ui-modal-actions";

    const cancel = document.createElement("button");
    cancel.className = "ui-modal-button ghost";
    cancel.textContent = "Cancel";

    const ok = document.createElement("button");
    ok.className = "ui-modal-button primary";
    ok.textContent = "Yes";

    actions.appendChild(cancel);
    actions.appendChild(ok);

    modal.appendChild(h);
    modal.appendChild(p);
    modal.appendChild(actions);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    cancel.addEventListener("click", () => {
      overlay.remove();
      resolve(false);
    });

    ok.addEventListener("click", () => {
      overlay.remove();
      resolve(true);
    });

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.remove();
        resolve(false);
      }
    });
  });
}

function updateCartButtons(hasItems) {
  btnConfirmOrder.disabled = !hasItems;
  btnClearCart.disabled = !hasItems;
}

async function loadCart() {
  basketBody.innerHTML = "";
  emptyMsg.textContent = "Loading basket...";
  try {
    const items = await dbHelpers.getAll("cart");
    if (!items || items.length === 0) {
      emptyMsg.textContent = "Basket is empty.";
      totalAmount.textContent = "$0.00";
      updateCartButtons(false);
      return;
    }

    emptyMsg.textContent = "";
    updateCartButtons(true);
    let total = 0;

    items.forEach((item) => {
      const tr = document.createElement("tr");

      const nameCell = document.createElement("td");
      nameCell.textContent = item.name;

      const qtyCell = document.createElement("td");
      qtyCell.classList.add("text-center");
      qtyCell.textContent = item.quantity;

      const priceCell = document.createElement("td");
      priceCell.classList.add("text-center");
      priceCell.textContent = `$${item.price.toFixed(2)}`;

      const totalCell = document.createElement("td");
      totalCell.classList.add("text-center");
      totalCell.textContent = `$${(item.price * item.quantity).toFixed(2)}`;

      tr.appendChild(nameCell);
      tr.appendChild(qtyCell);
      tr.appendChild(priceCell);
      tr.appendChild(totalCell);

      total += item.price * item.quantity;
      basketBody.appendChild(tr);
    });

    totalAmount.textContent = "$" + total.toFixed(2);
  } catch (error) {
    console.error("Error loading cart:", error);
    emptyMsg.textContent = "Error loading basket.";
  }
}

async function clearBasket() {
  toggleButton(true, true);

  const ok = await showConfirmModal("Clear basket", "Clear entire basket?");
  if (!ok) {
    await loadCart();
    return;
  }

  try {
    await dbHelpers.clear("cart");
    clearCartUI();
    updateCartButtons(false);
    setStatusOk("Basket cleared.");
  } catch (error) {
    console.error("Error clearing basket:", error);
  } finally {
    await loadCart();
  }
}

async function validateCart() {
  const items = await dbHelpers.getAll("cart");
  if (!items || items.length === 0) {
    showToast("Your basket is empty!", "info");
    return null;
  }
  return items;
}

function calculateOrderDetails(items) {
  let total = 0;
  const orderItems = items.map((item) => {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;
    return {
      name: item.name,
      qty: item.quantity,
      price: item.price,
    };
  });
  return { orderItems, total };
}

function clearCartUI() {
  emptyMsg.textContent = "Basket is empty.";
  basketBody.innerHTML = "";
  totalAmount.textContent = "$0.00";
}

async function ProcessOrder() {
  toggleButton(true, true);

  try {
    const items = await validateCart();
    if (!items) {
      hideProcessingSpinner();
      await loadCart();
      return;
    }

    const user = getSessionUser();
    if (!user) {
      hideProcessingSpinner();
      await loadCart();
      await showAlertModal("Session expired", "Please sign in again.");
      goToAuth();
      return;
    }

    const { orderItems, total } = calculateOrderDetails(items);

    const purchase = {
      userId: user.userId,
      email: user.email,
      date: new Date().toISOString(),
      items: orderItems,
      totalPrice: total,
    };

    await dbHelpers.add("purchases", purchase);
    hideProcessingSpinner();
    showOrderConfirmation(orderItems, total);
    await dbHelpers.clear("cart");
    clearCartUI();
    setStatusOk("Order processed successfully!");
  } catch (error) {
    hideProcessingSpinner();
    toggleButton(false, false);
    console.error("Error processing order:", error);
    await showAlertModal(
      "Order Error",
      "Error processing order. Please try again",
    );
  }
}

function showOrderConfirmation(items, total) {
  const REDIRECT_DELAY_SECONDS = 5;
  let secondsLeft = REDIRECT_DELAY_SECONDS;
  let countdownInterval;

  const overlay = document.createElement("div");
  overlay.classList.add("order-overlay");

  const modal = document.createElement("div");
  modal.classList.add("order-modal");

  const title = document.createElement("h2");
  title.classList.add("order-title");
  title.textContent = "✓ Order Confirmed!";
  modal.appendChild(title);

  const detailsContainer = document.createElement("div");
  detailsContainer.classList.add("order-details-container");

  const detailsHeading = document.createElement("h3");
  detailsHeading.classList.add("order-details-heading");
  detailsHeading.textContent = "Order Details:";
  detailsContainer.appendChild(detailsHeading);

  items.forEach((item) => {
    const itemRow = document.createElement("div");
    itemRow.classList.add("order-item-row");

    const itemName = document.createElement("span");
    itemName.classList.add("order-item-name");
    itemName.textContent = `${item.name} (x${item.qty})`;

    const itemPrice = document.createElement("span");
    itemPrice.classList.add("order-item-price");
    itemPrice.textContent = `$${(item.price * item.qty).toFixed(2)}`;

    itemRow.appendChild(itemName);
    itemRow.appendChild(itemPrice);
    detailsContainer.appendChild(itemRow);
  });

  modal.appendChild(detailsContainer);

  const totalSection = document.createElement("div");
  totalSection.classList.add("order-total-section");

  const totalLabel = document.createElement("span");
  totalLabel.classList.add("order-total-label");
  totalLabel.textContent = "Total Amount:";

  const totalValue = document.createElement("span");
  totalValue.classList.add("order-total-value");
  totalValue.textContent = `$${total.toFixed(2)}`;

  totalSection.appendChild(totalLabel);
  totalSection.appendChild(totalValue);
  modal.appendChild(totalSection);

  // Countdown section with spinner
  const countdownSection = document.createElement("div");
  countdownSection.classList.add("redirect-countdown");

  const spinner = document.createElement("div");
  spinner.classList.add("redirect-spinner");

  const countdownText = document.createElement("span");
  countdownText.classList.add("redirect-text");
  countdownText.textContent = `Redirecting to shop in ${secondsLeft}s...`;

  countdownSection.appendChild(spinner);
  countdownSection.appendChild(countdownText);
  modal.appendChild(countdownSection);

  const closeButton = document.createElement("button");
  closeButton.classList.add("order-close-button");
  closeButton.textContent = "Continue Shopping Now";
  modal.appendChild(closeButton);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Start countdown
  countdownInterval = setInterval(() => {
    secondsLeft -= 1;
    countdownText.textContent = `Redirecting to shop in ${secondsLeft}s...`;
    if (secondsLeft <= 0) {
      clearInterval(countdownInterval);
      overlay.remove();
      globalThis.location.href = "../Shop/shop.html";
    }
  }, 1000);

  // Close modal on button click
  closeButton.addEventListener("click", () => {
    clearInterval(countdownInterval);
    overlay.remove();
    goToShop();
  });

  // Close modal on overlay click
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      clearInterval(countdownInterval);
      overlay.remove();
      goToShop();
    }
  });
}

function showProcessingSpinner() {
  const overlay = document.createElement("div");
  overlay.classList.add("processing-overlay");
  overlay.id = "processingOverlay";

  const spinner = document.createElement("div");
  spinner.classList.add("processing-spinner");

  const text = document.createElement("span");
  text.classList.add("processing-text");
  text.textContent = "Processing your order...";

  overlay.appendChild(spinner);
  overlay.appendChild(text);
  document.body.appendChild(overlay);
}

function hideProcessingSpinner() {
  const overlay = document.getElementById("processingOverlay");
  if (overlay) overlay.remove();
}

async function confirmOrder() {
  toggleButton(true, true);

  const confirmed = await showConfirmModal(
    "Confirm Order",
    "Are you sure you want to confirm the order?",
  );

  if (!confirmed) {
    await loadCart();
    toggleButton(false, false);
    return;
  }

  showProcessingSpinner();
  setTimeout(() => {
    ProcessOrder();
  }, 1000);
}

function goToAuth() {
  globalThis.location.href = "../Auth/auth.html";
}

function goToShop() {
  globalThis.location.href = "../Shop/shop.html";
}

function toggleButton(disableClearBtn, disableConfirmBtn) {
  btnClearCart.disabled = disableClearBtn;
  btnConfirmOrder.disabled = disableConfirmBtn;
}

async function initApp() {
  if (!checkSession()) {
    globalThis.location.href = "../Auth/auth.html";
    return;
  }

  setStatusWait("Opening database...");

  try {
    await openDatabaseAsync();
    setStatusOk("Database opened.");
    await loadCart();
  } catch (error) {
    console.error("Error opening database:", error);
    setStatusWait("Error opening DB.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  btnBack.addEventListener("click", goToShop);
  btnClearCart.addEventListener("click", clearBasket);
  btnConfirmOrder.addEventListener("click", confirmOrder);
  initApp();
});

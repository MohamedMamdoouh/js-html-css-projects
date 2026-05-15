import { checkSession, logout } from "../Auth/auth.js";
import { openDatabaseAsync, dbHelpers } from "../database.js";

const productsGrid = document.getElementById("productsGrid");
const cartItems = document.getElementById("cartItems");
const cartEmpty = document.getElementById("cartEmpty");
const cartTotal = document.getElementById("cartTotal");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const clearCartBtn = document.getElementById("clearCartBtn");
const checkoutBtn = document.getElementById("checkoutBtn");
const logoutBtn = document.getElementById("logoutBtn");

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
  setTimeout(() => toast.remove(), duration);
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

async function loadProducts() {
  try {
    const products = await dbHelpers.getAll("products");

    if (!products || products.length === 0) {
      productsGrid.innerHTML =
        '<p class="no-products-message">No products available.</p>';
      return;
    }

    productsGrid.innerHTML = "";

    products.forEach((product) => {
      const card = document.createElement("div");
      card.classList.add("product-card");

      card.innerHTML = `
        <span class="product-name">${product.name}</span>
        <span class="product-desc">${product.description}</span>
        <div class="product-footer">
          <span class="product-price">$${product.price.toFixed(2)}</span>
          <button data-id="${product.id}">Add to Cart</button>
        </div>
      `;

      const addBtn = card.querySelector("button");
      addBtn.addEventListener("click", () => addToCart(product));

      productsGrid.appendChild(card);
    });
  } catch (error) {
    console.error("Error loading products:", error);
    productsGrid.innerHTML =
      '<p class="no-products-message">Error loading products.</p>';
  }
}

async function addToCart(product) {
  try {
    const existingItem = await dbHelpers.get("cart", product.id);

    if (existingItem) {
      existingItem.quantity += 1;
      await dbHelpers.put("cart", existingItem);
    } else {
      const cartItem = {
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
      };
      await dbHelpers.put("cart", cartItem);
    }

    await loadCart();
    setStatusOk(`Added "${product.name}" to cart.`);
  } catch (error) {
    console.error("Error adding to cart:", error);
  }
}

function updateCartButtons(hasItems) {
  clearCartBtn.disabled = !hasItems;
  checkoutBtn.disabled = !hasItems;
}

async function loadCart() {
  try {
    const items = await dbHelpers.getAll("cart");

    const existingItems = cartItems.querySelectorAll(".cart-item");
    existingItems.forEach((item) => item.remove());

    if (!items || items.length === 0) {
      cartEmpty.classList.add("visible");
      cartEmpty.classList.remove("hidden");
      cartTotal.textContent = "$0.00";
      updateCartButtons(false);
      return;
    }

    cartEmpty.classList.remove("visible");
    cartEmpty.classList.add("hidden");
    updateCartButtons(true);

    let total = 0;

    items.forEach((item) => {
      const cartItem = document.createElement("div");
      cartItem.classList.add("cart-item");

      cartItem.innerHTML = `
        <div class="cart-item-main">
          <span class="cart-item-name">${item.name}</span>
          <span class="cart-item-price">$${item.price.toFixed(2)} each</span>
          <span class="remove-link" data-id="${item.id}">Remove</span>
        </div>
        <div class="cart-item-controls">
          <button class="small-btn" data-action="decrease" data-id="${item.id}">-</button>
          <span class="qty-display">${item.quantity}</span>
          <button class="small-btn" data-action="increase" data-id="${item.id}">+</button>
        </div>
      `;

      const removeLink = cartItem.querySelector(".remove-link");
      removeLink.addEventListener("click", () => removeFromCart(item.id));

      const decreaseBtn = cartItem.querySelector('[data-action="decrease"]');
      decreaseBtn.addEventListener("click", () =>
        updateQuantity(item.id, item.quantity - 1),
      );

      const increaseBtn = cartItem.querySelector('[data-action="increase"]');
      increaseBtn.addEventListener("click", () =>
        updateQuantity(item.id, item.quantity + 1),
      );

      total += item.price * item.quantity;
      cartItems.appendChild(cartItem);
    });

    cartTotal.textContent = "$" + total.toFixed(2);
  } catch (error) {
    console.error("Error loading cart:", error);
  }
}

async function updateQuantity(id, newQuantity) {
  try {
    if (newQuantity <= 0) {
      await removeFromCart(id);
      return;
    }

    const item = await dbHelpers.get("cart", id);
    if (item) {
      item.quantity = newQuantity;
      await dbHelpers.put("cart", item);
      await loadCart();
    }
  } catch (error) {
    console.error("Error updating quantity:", error);
  }
}

async function removeFromCart(id) {
  try {
    await dbHelpers.delete("cart", id);
    await loadCart();
    setStatusOk("Item removed from cart.");
  } catch (error) {
    console.error("Error removing from cart:", error);
  }
}

async function clearCart() {
  clearCartBtn.disabled = true;
  checkoutBtn.disabled = true;

  const ok = await showConfirmModal("Clear basket", "Clear entire basket?");
  if (!ok) {
    await loadCart();
    return;
  }

  try {
    await dbHelpers.clear("cart");
    await loadCart();
    setStatusOk("Basket cleared.");
  } catch (error) {
    console.error("Error clearing cart:", error);
    await loadCart();
  }
}

function goToCheckout() {
  globalThis.location.href = "../Checkout/checkout.html";
}

function goToAuth() {
  globalThis.location.href = "../Auth/auth.html";
}

function setupEventListeners() {
  clearCartBtn?.addEventListener("click", clearCart);
  checkoutBtn?.addEventListener("click", goToCheckout);
  logoutBtn?.addEventListener("click", performLogout);
}

async function performLogout() {
  const confirmed = await showConfirmModal(
    "Log out",
    "Are you sure you want to log out?",
  );

  if (!confirmed) return;

  setStatusWait("Logging out...");

  try {
    logout();
  } catch {
    localStorage.removeItem("ecommerce_session");
  }

  await dbHelpers.clear?.("cart").catch(() => {});

  showToast("You have been logged out.", "info", 1000);
  setStatusOk("Logged out.");
  setTimeout(goToAuth, 500);
}

async function initApp() {
  if (!checkSession()) {
    return goToAuth();
  }

  setStatusWait("Opening database...");

  try {
    await openDatabaseAsync();
    setStatusOk("Database ready.");
    await loadProducts();
    await loadCart();
  } catch (error) {
    console.error("Error opening database:", error);
    setStatusWait("Error opening DB.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  initApp();
});

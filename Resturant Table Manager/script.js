let tables = [
  { id: 1, name: "Table 1", isOpen: false },
  { id: 2, name: "Table 2", isOpen: false },
  { id: 3, name: "Table 3", isOpen: false },
  { id: 4, name: "Table 4", isOpen: false },
];

let menu = [
  {
    id: 101,
    name: "Margherita Pizza",
    price: 8.5,
    description: "Tomato, mozzarella, basil.",
  },
  {
    id: 102,
    name: "Grilled Chicken",
    price: 11,
    description: "Served with vegetables and rice.",
  },
  {
    id: 103,
    name: "Caesar Salad",
    price: 6.5,
    description: "Fresh lettuce, croutons, parmesan.",
  },
  {
    id: 104,
    name: "Spaghetti Bolognese",
    price: 9,
    description: "Rich meat sauce, parmesan.",
  },
  {
    id: 105,
    name: "Lemonade",
    price: 2.5,
    description: "Freshly squeezed.",
  },
  {
    id: 106,
    name: "Cheesecake",
    price: 4.5,
    description: "Classic baked cheesecake.",
  },
];

const ordersByTable = {};
let selectedTableId = null;

function showAlert(message) {
  const popup = document.getElementById("customPopup");

  const messageElement = document.getElementById("popupMessage");
  messageElement.textContent = message;

  const popupCancel = document.getElementById("popupCancel");
  popupCancel.classList.add("hide");
  popupCancel.classList.remove("show-flex");

  const popupOK = document.getElementById("popupOK");
  popupOK.classList.remove("hide");
  popupOK.classList.add("show-flex");

  popup.classList.add("show-flex");

  return new Promise((resolve) => {
    popupOK.onclick = () => {
      popup.classList.remove("show-flex");
      resolve();
    };
  });
}

async function showConfirm(message) {
  const popup = document.getElementById("customPopup");
  document.getElementById("popupMessage").textContent = message;
  document.getElementById("popupCancel").classList.remove("hide");
  document.getElementById("popupOK").classList.remove("hide");
  popup.classList.add("show-flex");

  return new Promise((resolve) => {
    document.getElementById("popupOK").onclick = () => {
      popup.classList.remove("show-flex");
      resolve(true);
    };

    document.getElementById("popupCancel").onclick = () => {
      popup.classList.remove("show-flex");
      resolve(false);
    };
  });
}

const tablesList = document.getElementById("tablesList");
const selectedTableLabel = document.getElementById("selectedTableLabel");
const menuGrid = document.getElementById("menuGrid");
const orderBody = document.getElementById("orderBody");
const orderEmpty = document.getElementById("orderEmpty");
const orderTotal = document.getElementById("orderTotal");
const btnClearOrder = document.getElementById("btnClearOrder");
const btnPrintCheckCloseTable = document.getElementById(
  "btnPrintCheckCloseTable",
);
const btnAddTable = document.getElementById("btnAddTable");
const btnResetAllTables = document.getElementById("btnResetAllTables");
const btnAddMenuItem = document.getElementById("btnAddItemToMenu");

function renderTables() {
  tablesList.innerHTML = "";

  tables.forEach(function (table) {
    const row = document.createElement("div");
    row.className = "table-item";

    const info = document.createElement("div");
    info.className = "table-info";

    const name = document.createElement("div");
    name.className = "table-name";
    name.textContent = table.name;

    const status = document.createElement("div");
    status.className = "table-status";

    const dot = document.createElement("div");
    dot.className = "status-dot " + (table.isOpen ? "dot-open" : "dot-closed");

    const statusText = document.createElement("span");
    statusText.textContent = table.isOpen ? "Open" : "Closed";

    status.appendChild(dot);
    status.appendChild(statusText);

    info.appendChild(name);
    info.appendChild(status);

    const actions = document.createElement("div");
    actions.className = "table-actions";

    const selectBtn = document.createElement("button");
    selectBtn.className = "btn-small";
    selectBtn.textContent = "Select";
    selectBtn.onclick = function () {
      selectTable(table.id);
    };

    const toggleBtn = document.createElement("button");
    toggleBtn.className = "btn-secondary btn-small";
    toggleBtn.textContent = table.isOpen ? "Close" : "Open";
    toggleBtn.onclick = function () {
      toggleTableOpen(table.id);
    };

    actions.appendChild(selectBtn);
    actions.appendChild(toggleBtn);

    row.appendChild(info);
    row.appendChild(actions);
    row.dataset.tableId = table.id;

    tablesList.appendChild(row);
  });
}

function selectTable(tableId) {
  selectedTableId = tableId;

  const table = tables.find(function (t) {
    return t.id === tableId;
  });

  if (table) {
    selectedTableLabel.textContent =
      "Selected table: " +
      table.name +
      (table.isOpen ? " (Open)" : " (Closed)");
  } else {
    selectedTableLabel.textContent = "Selected table: none";
  }

  highlightSelectedTable(tableId);
  renderCurrentOrder();
}

function highlightSelectedTable(tableId) {
  document.querySelectorAll(".table-item").forEach((item) => {
    item.classList.toggle(
      "selected-table",
      item.dataset.tableId === String(tableId),
    );
  });
}

function toggleTableOpen(tableId) {
  const table = tables.find(function (t) {
    return t.id === tableId;
  });

  if (!table) return;

  table.isOpen = !table.isOpen;

  renderTables();
  renderCurrentOrder();
  selectTable(tableId);
}

function addNewTable() {
  const nextId =
    tables.length > 0 ? Math.max(...tables.map((t) => t.id)) + 1 : 1;

  tables.push({
    id: nextId,
    name: "Table " + nextId,
    isOpen: false,
  });

  renderTables();
  highlightSelectedTable(selectedTableId);
}

async function resetAll() {
  if (!(await showConfirm("Reset all tables and orders?"))) return;

  tables = [
    { id: 1, name: "Table 1", isOpen: false },
    { id: 2, name: "Table 2", isOpen: false },
    { id: 3, name: "Table 3", isOpen: false },
    { id: 4, name: "Table 4", isOpen: false },
  ];

  for (const key in ordersByTable) {
    delete ordersByTable[key];
  }

  selectedTableId = null;
  selectedTableLabel.textContent = "Selected table: none";

  renderTables();
  renderCurrentOrder();
  highlightSelectedTable(selectedTableId);
}

function renderMenu() {
  menuGrid.innerHTML = "";

  menu.forEach(function (item) {
    const card = document.createElement("div");
    card.className = "menu-item";

    const name = document.createElement("div");
    name.className = "menu-name";
    name.textContent = item.name;

    const desc = document.createElement("div");
    desc.className = "menu-desc";
    desc.textContent = item.description;

    const footer = document.createElement("div");
    footer.className = "menu-footer";

    const price = document.createElement("div");
    price.className = "menu-price";
    price.textContent = "$" + item.price.toFixed(2);

    const addBtn = document.createElement("button");
    addBtn.className = "btn-small";
    addBtn.textContent = "Add";
    addBtn.onclick = function () {
      addMenuItemToOrder(item.id);
    };

    const removeBtn = document.createElement("button");
    removeBtn.className = "btn-danger btn-small";
    removeBtn.textContent = "Remove";
    removeBtn.onclick = function () {
      removeMenuItem(item.id);
    };

    const menuActions = document.createElement("div");
    menuActions.className = "menu-actions";

    menuActions.appendChild(addBtn);
    menuActions.appendChild(removeBtn);

    footer.appendChild(price);
    footer.appendChild(menuActions);

    card.appendChild(name);
    card.appendChild(desc);
    card.appendChild(footer);

    menuGrid.appendChild(card);
  });
}

async function addMenuItemToOrder(menuId) {
  if (selectedTableId === null) {
    await showAlert("Please select a table first.");
    return;
  }

  const table = tables.find(function (t) {
    return t.id === selectedTableId;
  });

  if (!table?.isOpen) {
    await showAlert("Selected table must be OPEN to add items.");
    return;
  }

  const menuItem = menu.find(function (m) {
    return m.id === menuId;
  });

  if (!menuItem) return;

  if (!ordersByTable[selectedTableId]) {
    ordersByTable[selectedTableId] = [];
  }

  const orderItems = ordersByTable[selectedTableId];

  const existingItem = orderItems.find(function (it) {
    return it.menuId === menuId;
  });

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    orderItems.push({
      menuId: menuItem.id,
      name: menuItem.name,
      price: menuItem.price,
      quantity: 1,
    });
  }

  renderCurrentOrder();
}

function renderCurrentOrder() {
  orderBody.innerHTML = "";

  if (selectedTableId === null) {
    orderEmpty.textContent = "No table selected.";
    orderEmpty.classList.remove("hidden");
    orderTotal.textContent = "$0.00";
    return;
  }

  const orderItems = ordersByTable[selectedTableId] || [];

  if (orderItems.length === 0) {
    orderEmpty.textContent = "No items for this table yet.";
    orderEmpty.classList.remove("hidden");
    orderTotal.textContent = "$0.00";
    return;
  }

  orderEmpty.classList.add("hidden");

  let total = 0;

  orderItems.forEach(function (item) {
    const tr = document.createElement("tr");

    const tdName = document.createElement("td");
    tdName.textContent = item.name;

    const tdPrice = document.createElement("td");
    tdPrice.textContent = "$" + item.price.toFixed(2);

    const tdQty = document.createElement("td");
    const qtyControls = document.createElement("div");
    qtyControls.className = "qty-controls";

    const btnMinus = document.createElement("button");
    btnMinus.className = "btn-small";
    btnMinus.textContent = "-";
    btnMinus.onclick = function () {
      changeQuantity(item.menuId, -1);
    };

    const spanQty = document.createElement("span");
    spanQty.className = "qty-value";
    spanQty.textContent = item.quantity;

    const btnPlus = document.createElement("button");
    btnPlus.className = "btn-small";
    btnPlus.textContent = "+";
    btnPlus.onclick = function () {
      changeQuantity(item.menuId, 1);
    };

    qtyControls.appendChild(btnMinus);
    qtyControls.appendChild(spanQty);
    qtyControls.appendChild(btnPlus);
    tdQty.appendChild(qtyControls);

    const tdSub = document.createElement("td");
    const subtotal = item.price * item.quantity;
    tdSub.textContent = "$" + subtotal.toFixed(2);
    total += subtotal;

    const tdRemove = document.createElement("td");
    const removeBtn = document.createElement("button");
    removeBtn.className = "btn-danger btn-small";
    removeBtn.textContent = "x";
    removeBtn.onclick = function () {
      removeOrderItem(item.menuId);
    };
    tdRemove.appendChild(removeBtn);

    tr.appendChild(tdName);
    tr.appendChild(tdPrice);
    tr.appendChild(tdQty);
    tr.appendChild(tdSub);
    tr.appendChild(tdRemove);

    orderBody.appendChild(tr);
  });

  orderTotal.textContent = "$" + total.toFixed(2);
}

function changeQuantity(menuId, delta) {
  if (selectedTableId === null) return;

  const orderItems = ordersByTable[selectedTableId] || [];
  if (!orderItems) return;

  const item = orderItems.find(function (it) {
    return it.menuId === menuId;
  });

  if (!item) return;

  item.quantity += delta;

  if (item.quantity <= 0) {
    const index = orderItems.indexOf(item);
    if (index !== -1) orderItems.splice(index, 1);
  }

  renderCurrentOrder();
}

function removeOrderItem(menuId) {
  if (selectedTableId === null) return;

  const orderItems = ordersByTable[selectedTableId] || [];
  if (!orderItems) return;

  const index = orderItems.findIndex(function (it) {
    return it.menuId === menuId;
  });

  if (index !== -1) orderItems.splice(index, 1);

  renderCurrentOrder();
}

async function clearOrder() {
  if (selectedTableId === null) {
    await showAlert("Select a table first.");
    return;
  }

  const current = ordersByTable[selectedTableId] || [];
  if (current.length === 0) {
    await showAlert("No items to clear for this table.");
    return;
  }

  if (!(await showConfirm("Clear all items for this table?"))) return;

  ordersByTable[selectedTableId] = [];
  renderCurrentOrder();
}

async function printCheckAndClose() {
  if (selectedTableId === null) {
    await showAlert("Please select a table first.");
    return;
  }

  const table = tables.find(function (t) {
    return t.id === selectedTableId;
  });

  if (!table) {
    await showAlert("Table not found.");
    return;
  }

  const orderItems = ordersByTable[selectedTableId] || [];
  if (orderItems.length === 0) {
    await showAlert("No items for this table to print.");
    return;
  }

  let total = 0;
  orderItems.forEach(function (item) {
    total += item.price * item.quantity;
  });

  // Open a popup window (new tab/window)
  const popup = window.open("", "PrintCheck", "width=600,height=700");
  const doc = popup.document;
  const now = new Date();

  // Set up basic document structure
  doc.title = "Bill - " + table.name;

  // Add styles via link element
  const link = doc.createElement("link");
  link.rel = "stylesheet";
  link.href = "print-styles.css";
  doc.head.appendChild(link);

  // Create header
  const header = doc.createElement("div");
  header.className = "header";

  const h1 = doc.createElement("h1");
  h1.textContent = "Restaurant Bill";
  header.appendChild(h1);

  const h2 = doc.createElement("h2");
  h2.textContent = table.name;
  header.appendChild(h2);

  doc.body.appendChild(header);

  // Create meta section (date/time)
  const meta = doc.createElement("div");
  meta.className = "meta";
  meta.innerHTML =
    "Date: " +
    now.toLocaleDateString() +
    "<br/>Time: " +
    now.toLocaleTimeString();
  doc.body.appendChild(meta);

  // Create table
  const tableElement = doc.createElement("table");

  // Table header
  const thead = doc.createElement("thead");
  const headerRow = doc.createElement("tr");

  const headers = [
    { text: "Item", className: "col-item" },
    { text: "Price", className: "col-price" },
    { text: "Qty", className: "col-qty" },
    { text: "Subtotal", className: "col-subtotal" },
  ];

  headers.forEach(function (h) {
    const th = doc.createElement("th");
    th.textContent = h.text;
    th.className = h.className;
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  tableElement.appendChild(thead);

  // Table body with order items
  const tbody = doc.createElement("tbody");

  orderItems.forEach(function (item) {
    const tr = doc.createElement("tr");
    const subtotal = item.price * item.quantity;

    const tdName = doc.createElement("td");
    tdName.textContent = item.name;
    tr.appendChild(tdName);

    const tdPrice = doc.createElement("td");
    tdPrice.textContent = "$" + item.price.toFixed(2);
    tr.appendChild(tdPrice);

    const tdQty = doc.createElement("td");
    tdQty.textContent = item.quantity;
    tr.appendChild(tdQty);

    const tdSub = doc.createElement("td");
    tdSub.textContent = "$" + subtotal.toFixed(2);
    tr.appendChild(tdSub);

    tbody.appendChild(tr);
  });

  // Total row
  const totalRow = doc.createElement("tr");
  totalRow.className = "total-row";

  const tdTotal = doc.createElement("td");
  tdTotal.colSpan = 3;
  tdTotal.textContent = "Total";
  totalRow.appendChild(tdTotal);

  const tdTotalAmount = doc.createElement("td");
  tdTotalAmount.textContent = "$" + total.toFixed(2);
  totalRow.appendChild(tdTotalAmount);

  tbody.appendChild(totalRow);
  tableElement.appendChild(tbody);
  doc.body.appendChild(tableElement);

  // Footer
  const footer = doc.createElement("div");
  footer.className = "footer";

  const thankYou = doc.createElement("div");
  thankYou.textContent = "Thank you for your visit!";
  footer.appendChild(thankYou);

  const small = doc.createElement("div");
  small.className = "small";
  small.textContent =
    "You can print this page or save it as PDF from your browser.";
  footer.appendChild(small);

  doc.body.appendChild(footer);

  // Auto-print when loaded
  popup.onload = function () {
    popup.print();
  };

  selectedTableId = null;
  table.isOpen = false;
  ordersByTable[selectedTableId] = [];

  highlightSelectedTable(selectedTableId);
  renderTables();
  renderCurrentOrder();
}

function addItemToMenu(name, price, description) {
  const nextId = menu.length > 0 ? Math.max(...menu.map((m) => m.id)) + 1 : 1;
  menu.push({
    id: nextId,
    name: name,
    price: price,
    description: description,
  });

  renderMenu();
}

async function handleAddMenuItem() {
  const popup = document.getElementById("customPopup");
  document.getElementById("popupMessage").classList.add("hide");
  document.getElementById("popupForm").classList.remove("hide");
  document.getElementById("popupCancel").classList.remove("hide");
  document.getElementById("popupOK").classList.remove("hide");
  popup.classList.add("show");

  document.getElementById("itemName").value = "";
  document.getElementById("itemPrice").value = "";
  document.getElementById("itemDescription").value = "";

  return new Promise((resolve) => {
    document.getElementById("popupOK").onclick = () => {
      const name = document.getElementById("itemName").value.trim();
      const price = Number.parseFloat(
        document.getElementById("itemPrice").value,
      );
      const description = document
        .getElementById("itemDescription")
        .value.trim();

      if (!name || Number.isNaN(price) || price <= 0 || !description) {
        showAlert("Please fill in all fields with valid values.");
        return;
      }

      popup.classList.remove("show");
      document.getElementById("popupMessage").classList.remove("hide");
      document.getElementById("popupForm").classList.add("hide");

      addItemToMenu(name, price, description);
      resolve();
    };

    document.getElementById("popupCancel").onclick = () => {
      popup.classList.remove("show");
      document.getElementById("popupMessage").classList.remove("hide");
      document.getElementById("popupForm").classList.add("hide");
      resolve();
    };
  });
}

async function removeMenuItem(itemId) {
  if (
    !(await showConfirm(
      "Are you sure you want to remove this item? Please notice that's a soft delete. Items are stored in RAM only, not real db.",
    ))
  )
    return;

  menu = menu.filter((m) => m.id !== itemId);
  renderMenu();
}

addEventListener("DOMContentLoaded", function () {
  btnClearOrder.onclick = clearOrder;
  btnPrintCheckCloseTable.onclick = printCheckAndClose;
  btnAddTable.onclick = addNewTable;
  btnResetAllTables.onclick = resetAll;
  btnAddMenuItem.onclick = handleAddMenuItem;
});

// Initial render
renderTables();
renderMenu();
renderCurrentOrder();

const API = "https://api.frankfurter.dev/v1";

const UI = {
  loading: document.getElementById("loading"),
  error: document.getElementById("error"),
  content: document.getElementById("content"),

  amount: document.getElementById("amount"),
  from: document.getElementById("from"),
  to: document.getElementById("to"),

  btnConvert: document.getElementById("btnConvert"),
  btnSwap: document.getElementById("btnSwap"),
  btnUseUSDEGY: document.getElementById("btnUseUSDEGY"),
  btnUseEURUSD: document.getElementById("btnUseEURUSD"),

  result: document.getElementById("result"),
  meta: document.getElementById("meta"),
  ratePill: document.getElementById("ratePill"),
  datePill: document.getElementById("datePill"),

  chart: document.getElementById("chart"),
  historyBody: document.getElementById("historyBody"),
};

let controller = null;
let currencyMap = {};

function setLoading(isLoading) {
  UI.loading.style.display = isLoading ? "flex" : "none";

  UI.btnConvert.disabled = isLoading;
  UI.btnSwap.disabled = isLoading;
  UI.btnUseUSDEGY.disabled = isLoading;
  UI.btnUseEURUSD.disabled = isLoading;
}

function setError(message) {
  if (!message) {
    UI.error.style.display = "none";
    UI.error.textContent = "";
    return;
  }

  UI.error.style.display = "block";
  UI.error.textContent = message;
}

async function apiFetchJson(url, signal) {
  const res = await fetch(url, { signal });

  if (!res.ok) throw new Error(`HTTP ${res.status} (${res.statusText})`);

  return res.json();
}

async function loadCurrencies() {
  const data = await apiFetchJson(`${API}/currencies`, controller.signal);
  currencyMap = data;

  const codes = Object.keys(currencyMap).sort((a, b) => a.localeCompare(b));

  UI.from.innerHTML = "";
  UI.to.innerHTML = "";

  for (const code of codes) {
    const name = currencyMap[code];

    const opt1 = document.createElement("option");
    opt1.value = code;
    opt1.textContent = `${code} — ${name}`;
    UI.from.appendChild(opt1);

    const opt2 = document.createElement("option");
    opt2.value = code;
    opt2.textContent = `${code} — ${name}`;
    UI.to.appendChild(opt2);
  }

  UI.from.value = "USD";
  UI.to.value = "EGP";
  if (!currencyMap["EGP"]) UI.to.value = "EUR";

  UI.content.style.display = "grid";
}

async function convertOnce(from, to, amount) {
  const url = `${API}/latest?base=${encodeURIComponent(
    from,
  )}&symbols=${encodeURIComponent(to)}`;

  const data = await apiFetchJson(url, controller.signal);

  const rate = data.rates?.[to];
  if (!rate) throw new Error(`Rate not found for ${from} → ${to}`);

  const converted = amount * rate;

  return { rate, converted, date: data.date, base: data.base };
}

function formatDate(d) {
  if (!(d instanceof Date)) throw new Error("Invalid Date object");

  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function loadHistory(from, to, days = 30) {
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

  const startStr = formatDate(start);

  const url = `${API}/${startStr}..?base=${encodeURIComponent(
    from,
  )}&symbols=${encodeURIComponent(to)}`;

  const data = await apiFetchJson(url, controller.signal);

  const rows = Object.entries(data.rates)
    .map(([date, obj]) => ({ date, rate: obj[to] }))
    .filter((r) => typeof r.rate === "number")
    .sort((a, b) => a.date.localeCompare(b.date));

  return rows;
}

let chartInstance = null;

function drawChart(canvas, points) {
  // Destroy previous chart if exists
  if (chartInstance) {
    chartInstance.destroy();
  }

  // If no points: show a message
  if (!points.length) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "16px system-ui";
    ctx.fillText("No history data available.", 18, 40);
    return;
  }

  // Prepare data
  const labels = points.map((p) => p.date);
  const data = points.map((p) => p.rate);

  // Create new chart
  chartInstance = new Chart(canvas, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Exchange Rate",
          data: data,
          borderColor: "rgb(75, 192, 192)",
          tension: 0.1,
        },
      ],
    },
    options: {
      responsive: false,
      scales: {
        y: {
          beginAtZero: false,
        },
      },
    },
  });
}

function renderHistoryTable(rows) {
  const last = rows.slice(-12).reverse();

  UI.historyBody.innerHTML = last
    .map(
      (r) => `
        <tr>
          <td>${r.date}</td>
          <td>${r.rate.toFixed(6)}</td>
        </tr>
      `,
    )
    .join("");
}

async function run() {
  // Cancel previous request (prevents old response overwriting new response)
  if (controller) controller.abort();

  controller = new AbortController();

  setError("");

  const amount = Number(UI.amount.value);
  const from = UI.from.value;
  const to = UI.to.value;

  if (!Number.isFinite(amount) || amount <= 0)
    return setError("❌ Enter a valid positive amount.");

  if (from === to) return setError("❌ Choose two different currencies.");

  setLoading(true);

  try {
    const { rate, converted, date } = await convertOnce(from, to, amount);

    UI.result.textContent = `${converted.toFixed(2)} ${to}`;
    UI.meta.textContent = `${amount.toFixed(2)} ${from} → ${to}`;
    UI.ratePill.textContent = `Rate: 1 ${from} = ${rate.toFixed(6)} ${to}`;
    UI.datePill.textContent = `Date: ${date}`;

    const rows = await loadHistory(from, to, 30);

    drawChart(UI.chart, rows);
    renderHistoryTable(rows);
  } catch (err) {
    if (err.name === "AbortError") return;
    setError(`❌ ${err.message}`);
  } finally {
    setLoading(false);
  }
}

UI.btnConvert.addEventListener("click", run);

UI.btnSwap.addEventListener("click", () => {
  [UI.from.value, UI.to.value] = [UI.to.value, UI.from.value];
  run();
});

UI.btnUseUSDEGY.addEventListener("click", () => {
  UI.from.value = "USD";
  UI.to.value = currencyMap["EGP"] ? "EGP" : "EUR";
  run();
});

UI.btnUseEURUSD.addEventListener("click", () => {
  UI.from.value = "EUR";
  UI.to.value = "USD";
  run();
});

UI.amount.addEventListener("keydown", (e) => {
  if (e.key === "Enter") run();
});

// Initial load
setLoading(true);
try {
  controller = new AbortController();
  await loadCurrencies();
  await run();
} catch (err) {
  setError(`❌ ${err.message}`);
} finally {
  setLoading(false);
}

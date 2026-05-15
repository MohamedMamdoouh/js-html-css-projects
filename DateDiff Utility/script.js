//DOM References
const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");

const autoSwapInput = document.getElementById("autoSwap");
const inclusiveDaysInput = document.getElementById("inclusiveDays");

const btnCalc = document.getElementById("btnCalc");
const btnDemo = document.getElementById("btnDemo");
const btnClear = document.getElementById("btnClear");

const outDays = document.getElementById("outDays");
const outWeeks = document.getElementById("outWeeks");
const outMonths = document.getElementById("outMonths");
const outYears = document.getElementById("outYears");

const rangeLine = document.getElementById("rangeLine");
const breakdownLine = document.getElementById("breakdownLine");

const msgBox = document.getElementById("msgBox");
const statusChip = document.getElementById("statusChip");
const todayChip = document.getElementById("todayChip");

// Helper Functions
function formatDate(date) {
    return date.toLocaleDateString(undefined, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "2-digit",
    });
}

function stripTime(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseDateInput(value) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
}

function showMessage(type, text) {
    msgBox.classList.remove("good", "bad");
    if (type === "good") msgBox.classList.add("good");
    if (type === "bad") msgBox.classList.add("bad");
    msgBox.textContent = text;
}

function setStatus(text) {
    statusChip.textContent = text;
}

function resetOutputs() {
    outDays.textContent = "—";
    outWeeks.textContent = "—";
    outMonths.textContent = "—";
    outYears.textContent = "—";
    rangeLine.textContent = "Range: —";
    breakdownLine.textContent = "Breakdown: —";
    setStatus("Waiting…");
}

const msPerDay = 1000 * 60 * 60 * 24;

// Core Functions for calendar month/year differences
function diffCalendarMonths(start, end) {
    let months =
        (end.getFullYear() - start.getFullYear()) * 12 +
        (end.getMonth() - start.getMonth());

    if (end.getDate() < start.getDate()) months -= 1;

    return Math.max(0, months);
}

function diffCalendarYears(start, end) {
    let years = end.getFullYear() - start.getFullYear();

    if (
        end.getMonth() < start.getMonth() ||
        (end.getMonth() === start.getMonth() &&
            end.getDate() < start.getDate())
    ) {
        years -= 1;
    }

    return Math.max(0, years);
}

function calculateDateDiff() {
    const startVal = startDateInput.value;
    const endVal = endDateInput.value;

    if (!startVal || !endVal) {
        showMessage("bad", "❌ Please choose BOTH start and end dates.");
        resetOutputs();
        return;
    }

    let start = stripTime(parseDateInput(startVal));
    let end = stripTime(parseDateInput(endVal));

    if (start > end) {
        if (autoSwapInput.checked) {
            [start, end] = [end, start];
            showMessage(
                "",
                "📌 Dates were swapped (start was after end).",
            );
        } else {
            showMessage(
                "bad",
                "❌ Start date must be before end date (or enable auto-swap).",
            );
            resetOutputs();
            return;
        }
    } else {
        showMessage("good", "✅ Date difference calculated successfully.");
    }

    let totalDays = Math.round((end - start) / msPerDay);

    if (inclusiveDaysInput.checked) {
        totalDays += 1;
    }

    const totalWeeks = totalDays / 7;

    const calMonths = diffCalendarMonths(start, end);
    const calYears = diffCalendarYears(start, end);

    outDays.textContent = totalDays.toLocaleString();
    outWeeks.textContent = totalWeeks.toFixed(2);
    outMonths.textContent = calMonths.toLocaleString();
    outYears.textContent = calYears.toLocaleString();

    rangeLine.textContent = `Range: ${formatDate(start)} → ${formatDate(
        end,
    )}`;

    breakdownLine.textContent = `Breakdown: ${totalDays.toLocaleString()} days ≈ ${totalWeeks.toFixed(
        2,
    )} weeks | ${calMonths.toLocaleString()} full months | ${calYears.toLocaleString()} full years`;

    setStatus("Calculated ✅");
}

todayChip.textContent = `Today: ${formatDate(new Date())}`;

btnCalc.addEventListener("click", () => {
    markActiveButton(btnCalc);
    calculateDateDiff();
});

btnDemo.addEventListener("click", () => {
    markActiveButton(btnDemo);
    const end = stripTime(new Date());
    const start = new Date(end);
    start.setDate(start.getDate() - 90);

    const toISO = (d) => {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    };

    startDateInput.value = toISO(start);
    endDateInput.value = toISO(end);

    setStatus("Ready…");
    showMessage(
        "",
        "📌 Demo dates set (last 90 days). Click Calculate.",
    );
});

btnClear.addEventListener("click", () => {
    markActiveButton(btnClear);
    startDateInput.value = "";
    endDateInput.value = "";
    autoSwapInput.checked = true;
    inclusiveDaysInput.checked = false;
    resetOutputs();
    showMessage(
        "",
        "Tip: Pick start/end dates, then click “Calculate Difference”.",
    );
});

[startDateInput, endDateInput, autoSwapInput, inclusiveDaysInput].forEach(
    (el) => {
        el.addEventListener("change", () => {
            setStatus("Ready…");
        });
    },
);

function markActiveButton(button) {
    const buttons = [btnCalc, btnDemo, btnClear];
    buttons.forEach((btn) => {
        if (btn === button) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });
}
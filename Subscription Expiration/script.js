// Constants
const MESSAGE_TYPES = {
    GOOD: "good",
    WARN: "warn",
    BAD: "bad"
};

const STATUS_TYPES = {
    ACTIVE: "ACTIVE",
    EXPIRING_SOON: "EXPIRING_SOON",
    IN_GRACE: "IN_GRACE",
    EXPIRED: "EXPIRED"
};

const PLAN_DAYS = {
    WEEKLY: 7,
    MONTHLY: 30,
    QUARTERLY: 90,
    YEARLY: 365
};

const DEFAULT_VALUES = {
    GRACE_DAYS: 0,
    SOON_THRESHOLD: 7,
    PLAN: "30"
};

const DEMO_OFFSET_DAYS = -20;
const PLACEHOLDER_TEXT = "—";
const DATE_PAD_LENGTH = 2;
const DATE_PAD_CHAR = "0";

// DOM references
const startDateInput = document.getElementById("startDate");
const planInput = document.getElementById("plan");
const graceDaysInput = document.getElementById("graceDays");
const soonDaysInput = document.getElementById("soonDays");

const inclusiveEndInput = document.getElementById("inclusiveEnd");
const fixedDaysModeInput = document.getElementById("fixedDaysMode");

const btnCheck = document.getElementById("btnCheck");
const btnDemo = document.getElementById("btnDemo");
const btnClear = document.getElementById("btnClear");

const msgBox = document.getElementById("msgBox");
const statusChip = document.getElementById("statusChip");
const todayChip = document.getElementById("todayChip");
const badge = document.getElementById("badge");

const outEnd = document.getElementById("outEnd");
const outDaysLeft = document.getElementById("outDaysLeft");
const outGraceEnd = document.getElementById("outGraceEnd");
const outFinalValid = document.getElementById("outFinalValid");
const detailsLine = document.getElementById("detailsLine");

// Helper Functions
const msPerDay = 1000 * 60 * 60 * 24;

function stripTime(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseDateInput(value) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
}
function formatDate(date) {
    return date.toLocaleDateString(undefined, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "2-digit",
    });
}

function showMessage(type, text) {
    msgBox.classList.remove(MESSAGE_TYPES.GOOD, MESSAGE_TYPES.WARN, MESSAGE_TYPES.BAD);
    if (type === MESSAGE_TYPES.GOOD) msgBox.classList.add(MESSAGE_TYPES.GOOD);
    if (type === MESSAGE_TYPES.WARN) msgBox.classList.add(MESSAGE_TYPES.WARN);
    if (type === MESSAGE_TYPES.BAD) msgBox.classList.add(MESSAGE_TYPES.BAD);
    msgBox.textContent = text;
}

function setStatus(text) {
    statusChip.textContent = text;
}

function setBadge(type, text) {
    badge.classList.remove(MESSAGE_TYPES.GOOD, MESSAGE_TYPES.WARN, MESSAGE_TYPES.BAD);
    if (type === MESSAGE_TYPES.GOOD) badge.classList.add(MESSAGE_TYPES.GOOD);
    if (type === MESSAGE_TYPES.WARN) badge.classList.add(MESSAGE_TYPES.WARN);
    if (type === MESSAGE_TYPES.BAD) badge.classList.add(MESSAGE_TYPES.BAD);
    badge.textContent = text;
}

function resetOutputs() {
    outEnd.textContent = PLACEHOLDER_TEXT;
    outDaysLeft.textContent = PLACEHOLDER_TEXT;
    outGraceEnd.textContent = PLACEHOLDER_TEXT;
    outFinalValid.textContent = PLACEHOLDER_TEXT;
    detailsLine.textContent = `Details: ${PLACEHOLDER_TEXT}`;
    setBadge("", "Status: —");
    setStatus("Waiting…");
}

function safeInt(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

// Core Functions
function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

function addCalendarMonths(date, months) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
}

function addCalendarYears(date, years) {
    const d = new Date(date);
    d.setFullYear(d.getFullYear() + years);
    return d;
}

function computeEndDate(start, planValue, fixedDaysMode) {
    const planDays = Number(planValue);

    if (fixedDaysMode) {
        return addDays(start, planDays);
    }

    if (planDays === PLAN_DAYS.WEEKLY) return addDays(start, PLAN_DAYS.WEEKLY);
    if (planDays === PLAN_DAYS.MONTHLY) return addCalendarMonths(start, 1);
    if (planDays === PLAN_DAYS.QUARTERLY) return addCalendarMonths(start, 3);
    if (planDays === PLAN_DAYS.YEARLY) return addCalendarYears(start, 1);

    return addDays(start, planDays);
}

function getSubscriptionStatus({
    startDate,
    planValue,
    fixedDaysMode,
    inclusiveEnd,
    graceDays,
    soonThresholdDays,
    today,
}) {
    const endDate = stripTime(
        computeEndDate(startDate, planValue, fixedDaysMode),
    );

    const effectiveEnd = inclusiveEnd ? endDate : addDays(endDate, -1);

    const graceEnd = stripTime(addDays(effectiveEnd, graceDays));

    const t = stripTime(today);

    const daysLeft = Math.floor((effectiveEnd - t) / msPerDay);

    const isActive = t <= effectiveEnd;
    const inGrace = !isActive && graceDays > 0 && t <= graceEnd;

    let status = STATUS_TYPES.EXPIRED;
    let uiType = MESSAGE_TYPES.BAD;

    if (isActive) {
        if (daysLeft <= soonThresholdDays) {
            status = STATUS_TYPES.EXPIRING_SOON;
            uiType = MESSAGE_TYPES.WARN;
        } else {
            status = STATUS_TYPES.ACTIVE;
            uiType = MESSAGE_TYPES.GOOD;
        }
    } else if (inGrace) {
        status = STATUS_TYPES.IN_GRACE;
        uiType = MESSAGE_TYPES.WARN;
    }

    const finalValidUntil = graceDays > 0 ? graceEnd : effectiveEnd;

    return {
        status,
        uiType,
        endDate,
        effectiveEnd,
        graceEnd: graceDays > 0 ? graceEnd : null,
        finalValidUntil,
        daysLeft,
    };
}

// UI Actions
function checkStatus() {
    const startVal = startDateInput.value;

    if (!startVal) {
        showMessage(MESSAGE_TYPES.BAD, "❌ Please select a start date.");
        resetOutputs();
        return;
    }

    const startDate = stripTime(parseDateInput(startVal));
    const planValue = planInput.value;

    const graceDays = safeInt(graceDaysInput.value, DEFAULT_VALUES.GRACE_DAYS);
    const soonDays = safeInt(soonDaysInput.value, DEFAULT_VALUES.SOON_THRESHOLD);

    const inclusiveEnd = inclusiveEndInput.checked;
    const fixedDaysMode = fixedDaysModeInput.checked;

    const today = new Date();

    const result = getSubscriptionStatus({
        startDate,
        planValue,
        fixedDaysMode,
        inclusiveEnd,
        graceDays,
        soonThresholdDays: soonDays,
        today,
    });

    outEnd.textContent = formatDate(result.endDate);
    outDaysLeft.textContent = result.daysLeft.toLocaleString();
    outGraceEnd.textContent = result.graceEnd
        ? formatDate(result.graceEnd)
        : PLACEHOLDER_TEXT;
    outFinalValid.textContent = formatDate(result.finalValidUntil);

    if (result.status === STATUS_TYPES.ACTIVE) {
        setBadge(MESSAGE_TYPES.GOOD, "Status: ACTIVE ✅");
        showMessage(MESSAGE_TYPES.GOOD, "✅ Subscription is active.");
    } else if (result.status === STATUS_TYPES.EXPIRING_SOON) {
        setBadge(MESSAGE_TYPES.WARN, "Status: EXPIRING SOON ⚠️");
        showMessage(
            MESSAGE_TYPES.WARN,
            `⚠️ Subscription will expire soon (≤ ${soonDays} days left).`,
        );
    } else if (result.status === STATUS_TYPES.IN_GRACE) {
        setBadge(MESSAGE_TYPES.WARN, "Status: IN GRACE 🕒");
        showMessage(
            MESSAGE_TYPES.WARN,
            "🕒 Subscription expired, but user is still within grace period.",
        );
    } else {
        setBadge(MESSAGE_TYPES.BAD, "Status: EXPIRED ❌");
        showMessage(MESSAGE_TYPES.BAD, "❌ Subscription is expired.");
    }

    const planLabel = planInput.options[planInput.selectedIndex].text;
    const modeLabel = fixedDaysMode ? "Fixed-days" : "Calendar-based";
    const endRule = inclusiveEnd
        ? "Inclusive end date"
        : "Exclusive end date";

    detailsLine.textContent =
        `Details: Plan = ${planLabel} | Mode = ${modeLabel} | ` +
        `${endRule} | Grace = ${graceDays} day(s) | Soon threshold = ${soonDays} day(s)`;

    setStatus("Checked ✅");
}

todayChip.textContent = `Today: ${formatDate(new Date())}`;

btnCheck.addEventListener("click", () => {
    markActiveButton(btnCheck);
    checkStatus();
});

btnDemo.addEventListener("click", () => {
    markActiveButton(btnDemo);

    const t = new Date();
    t.setDate(t.getDate() + DEMO_OFFSET_DAYS);

    const yyyy = t.getFullYear();
    const mm = String(t.getMonth() + 1).padStart(DATE_PAD_LENGTH, DATE_PAD_CHAR);
    const dd = String(t.getDate()).padStart(DATE_PAD_LENGTH, DATE_PAD_CHAR);
    startDateInput.value = `${yyyy}-${mm}-${dd}`;

    planInput.value = DEFAULT_VALUES.PLAN;
    graceDaysInput.value = "5";
    soonDaysInput.value = String(DEFAULT_VALUES.SOON_THRESHOLD);
    inclusiveEndInput.checked = true;
    fixedDaysModeInput.checked = true;

    setStatus("Ready…");
    showMessage("", "📌 Demo values set. Click “Check Status”.");
});

btnClear.addEventListener("click", () => {
    markActiveButton(btnClear);
    startDateInput.value = "";
    planInput.value = DEFAULT_VALUES.PLAN;
    graceDaysInput.value = String(DEFAULT_VALUES.GRACE_DAYS);
    soonDaysInput.value = String(DEFAULT_VALUES.SOON_THRESHOLD);
    inclusiveEndInput.checked = true;
    fixedDaysModeInput.checked = true;

    resetOutputs();
    showMessage(
        "",
        "Tip: Choose a start date, plan, then click “Check Status”.",
    );
});

[
    startDateInput,
    planInput,
    graceDaysInput,
    soonDaysInput,
    inclusiveEndInput,
    fixedDaysModeInput,
].forEach((el) => {
    el.addEventListener("change", () => {
        setStatus("Ready…");
    });
});


function markActiveButton(button) {
    const buttons = [btnCheck, btnDemo, btnClear];
    buttons.forEach((btn) => {
        if (btn === button) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });
}

// Initial reset
resetOutputs();
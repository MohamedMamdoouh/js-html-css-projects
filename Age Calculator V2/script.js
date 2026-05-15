import {
  differenceInCalendarDays,
  intervalToDuration,
  isAfter,
  isValid as isValidDateFns,
  parseISO,
  setYear,
  startOfDay,
} from "https://cdn.jsdelivr.net/npm/date-fns@3.6.0/+esm";

// Constants
const MIN_YEAR = 1900;
const MAX_YEAR = new Date().getFullYear();
const MAX_AGE_YEARS = 150;

// Get DOM references
const birthDateInput = document.getElementById("birthDate");

const btnCalc = document.getElementById("btnCalc");
const btnToday = document.getElementById("btnToday");
const btnClear = document.getElementById("btnClear");

const outYears = document.getElementById("outYears");
const outMonths = document.getElementById("outMonths");
const outDays = document.getElementById("outDays");

const nextBirthdayLine = document.getElementById("nextBirthdayLine");
const extraLine = document.getElementById("extraLine");
const dayOfWeekLine = document.getElementById("dayOfWeekLine");
const generationLine = document.getElementById("generationLine");

const todayChip = document.getElementById("todayChip");
const statusChip = document.getElementById("statusChip");

const msgBox = document.getElementById("msgBox");

// Helper functions
function formatDateForChip(date) {
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function stripTime(date) {
  return startOfDay(date);
}

function getDayOfWeek(date) {
  return date.toLocaleDateString(undefined, { weekday: "long" });
}

function getGeneration(year) {
  if (year >= 1928 && year <= 1945) {
    return { name: "Silent Generation", emoji: "🎩" };
  } else if (year >= 1946 && year <= 1964) {
    return { name: "Baby Boomer", emoji: "👶" };
  } else if (year >= 1965 && year <= 1980) {
    return { name: "Generation X", emoji: "🎸" };
  } else if (year >= 1981 && year <= 1996) {
    return { name: "Millennial", emoji: "💻" };
  } else if (year >= 1997 && year <= 2012) {
    return { name: "Gen Z", emoji: "📱" };
  } else if (year >= 2013) {
    return { name: "Gen Alpha", emoji: "🚀" };
  } else {
    return { name: "Greatest Generation", emoji: "🌟" };
  }
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
  outYears.textContent = "—";
  outMonths.textContent = "—";
  outDays.textContent = "—";
  nextBirthdayLine.textContent = "Next birthday: —";
  extraLine.textContent = "Extra info: —";
  dayOfWeekLine.textContent = "Day of birth: —";
  generationLine.textContent = "Generation: —";
  setStatus("Waiting…");
}

function calculateExactAge(birthDate, today) {
  const { years = 0, months = 0, days = 0 } = intervalToDuration({
    start: birthDate,
    end: today,
  });

  return { years, months, days };
}

function daysUntilNextBirthday(birthDate, today) {
  const todayStart = stripTime(today);
  const thisYear = todayStart.getFullYear();

  let candidate = stripTime(setYear(birthDate, thisYear));
  if (!isAfter(candidate, todayStart)) {
    candidate = stripTime(setYear(birthDate, thisYear + 1));
  }

  const diffDays = differenceInCalendarDays(candidate, todayStart);
  return { nextBirthdayDate: candidate, daysLeft: diffDays };
}

// UI Events (buttons)

const now = new Date();
todayChip.textContent = `Today: ${formatDateForChip(now)}`;

function validateBirthDate(birthValue) {
  if (!birthValue) {
    showMessage("bad", "❌ Please select your birth date first.");
    return null;
  }

  const [y, m, d] = birthValue.split("-").map(Number);

  if (!y || !m || !d) {
    showMessage("bad", "❌ Invalid date format.");
    return null;
  }

  const parsed = parseISO(birthValue);
  if (!isValidDateFns(parsed)) {
    showMessage(
      "bad",
      "❌ Invalid date. Please check the day/month combination.",
    );
    return null;
  }

  const birthDate = stripTime(parsed);

  if (y < MIN_YEAR) {
    showMessage("bad", `❌ Please enter a valid year (${MIN_YEAR} or later).`);
    return null;
  }

  if (y > MAX_YEAR) {
    showMessage("bad", `❌ Year cannot be greater than ${MAX_YEAR}.`);
    return null;
  }

  const today = stripTime(new Date());

  if (isAfter(birthDate, today)) {
    showMessage("bad", "❌ Birth date cannot be in the future.");
    return null;
  }

  const roughAge = today.getFullYear() - birthDate.getFullYear();
  if (roughAge > MAX_AGE_YEARS) {
    showMessage(
      "bad",
      `❌ Age cannot exceed ${MAX_AGE_YEARS} years. Please check the date.`,
    );
    return null;
  }

  return { birthDate, today };
}

// Calculate Age
btnCalc.addEventListener("click", () => {
  markActiveButton(btnCalc);

  const birthValue = birthDateInput.value;
  const validationResult = validateBirthDate(birthValue);

  if (!validationResult) {
    resetOutputs();
    return;
  }

  const { birthDate, today } = validationResult;

  const age = calculateExactAge(birthDate, today);

  outYears.textContent = age.years;
  outMonths.textContent = age.months;
  outDays.textContent = age.days;

  const { nextBirthdayDate, daysLeft } = daysUntilNextBirthday(
    birthDate,
    today,
  );

  const isBirthdayToday =
    birthDate.getMonth() === today.getMonth() &&
    birthDate.getDate() === today.getDate();

  if (isBirthdayToday) {
    nextBirthdayLine.textContent = `Happy Birthday! Next one: ${formatDateForChip(
      nextBirthdayDate,
    )} (in ${daysLeft} days${daysLeft === 1 ? "" : "s"}) 🎉`;
  } else {
    nextBirthdayLine.textContent = `Next birthday: ${formatDateForChip(
      nextBirthdayDate,
    )} (in ${daysLeft} day${daysLeft === 1 ? "" : "s"})`;
  }

  const totalDays = differenceInCalendarDays(today, birthDate);
  const totalWeeks = Math.floor(totalDays / 7);
  const totalMonths = age.years * 12 + age.months;

  extraLine.textContent = `You have lived ${totalDays.toLocaleString()} days •
  ${totalWeeks.toLocaleString()} weeks • ${totalMonths} months 🏃`;

  const dayOfWeek = getDayOfWeek(birthDate);
  dayOfWeekLine.textContent = `Day of birth: You were born on a ${dayOfWeek} 📅`;

  const generation = getGeneration(birthDate.getFullYear());
  generationLine.textContent = `Generation: ${generation.name} ${generation.emoji}`;

  if (isBirthdayToday) {
    showMessage("good", "🎉 Age calculated! Happy Birthday!");
    setStatus("Birthday! 🎂");
  } else {
    showMessage("good", "✅ Age calculated successfully.");
    setStatus("Calculated ✅");
  }
});

btnToday.addEventListener("click", () => {
  markActiveButton(btnToday);

  const t = new Date();

  const yyyy = t.getFullYear();
  const mm = String(t.getMonth() + 1).padStart(2, "0");
  const dd = String(t.getDate()).padStart(2, "0");

  birthDateInput.value = `${yyyy}-${mm}-${dd}`;

  showMessage("", "📌 Birth date set to today (demo). Now click Calculate.");
  setStatus("Ready…");
});

// Clear everything
btnClear.addEventListener("click", () => {
  markActiveButton(btnClear);

  birthDateInput.value = "";
  resetOutputs();
  showMessage("", "Tip: Choose a birth date and press “Calculate Age”.");
});

// Birth Date input change
birthDateInput.addEventListener("change", () => {
  setStatus("Ready…");
  showMessage("", "📌 Date selected. Click “Calculate Age”.");
});

function markActiveButton(button) {
  const buttons = [btnCalc, btnToday, btnClear];
  buttons.forEach((btn) => {
    if (btn === button) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

birthDateInput.min = `${MIN_YEAR}-01-01`;
birthDateInput.max = `${MAX_YEAR}-12-31`;
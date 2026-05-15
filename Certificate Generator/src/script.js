// Getting DOM references
const elName = document.getElementById("studentName");
const elCourse = document.getElementById("courseName");
const elInstructor = document.getElementById("instructorName");
const elSignatureFile = document.getElementById("signatureFile");
const elIssued = document.getElementById("issuedDate");
const elSerial = document.getElementById("serial");

// DOM References (Certificate Preview)
const certName = document.getElementById("certName");
const certCourse = document.getElementById("certCourse");
const certInstructor = document.getElementById("certInstructor");
const certIssued = document.getElementById("certIssued");
const certSerial = document.getElementById("certSerial");
const certSignatureImg = document.getElementById("certSignatureImg");

// DOM References (Rows for Validation)
const rowName = document.getElementById("rowName");
const rowCourse = document.getElementById("rowCourse");
const rowInstructor = document.getElementById("rowInstructor");
const rowSignature = document.getElementById("rowSignature");
const rowIssued = document.getElementById("rowIssued");
const rowSerial = document.getElementById("rowSerial");

// DOM References (Buttons and Status)
const btnPrint = document.getElementById("btnPrint");
const btnReset = document.getElementById("btnReset");
const btnFillDemo = document.getElementById("btnFillDemo");
const statusLine = document.getElementById("statusLine");
const validBadge = document.getElementById("validBadge");
const btnGenerateSerial = document.getElementById("btnGenerateSerial");

// To hold temporary object URL for signature image (to avoid memory leaks)
let signatureObjectUrl = null;

// input type date returns value in "yyyy-MM-dd" format
function formatDate(yyyyMMdd) {
  if (!yyyyMMdd) return "—";
  const [y, m, d] = yyyyMMdd.split("-");
  if (!y || !m || !d) return "—";
  return `${d} - ${m} - ${y}`;
}

// generate a serial number
function generateSerial() {
  const randomPart = Math.floor(100000 + Math.random() * 900000);
  const yearPart = new Date().getFullYear();
  return `MD-${yearPart}-${randomPart}`;
}

// validation functions for each field
function validateName(value) {
  return /^[A-Za-z\s]+$/.test(value.trim());
}

function validateCourse(value) {
  return /^[A-Za-z0-9\s-+]+$/.test(value.trim());
}

function validateInstructor(value) {
  return /^[A-Za-z\s]+$/.test(value.trim());
}

function validateIssued(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function validateSignature(fileInput) {
  return fileInput.files?.[0];
}

function setRowValid(rowEl, isValid) {
  rowEl.classList.toggle("invalid", !isValid);
}

function updateCertificate() {
  certName.textContent = elName.value.trim() || "Student Name";

  certCourse.textContent = elCourse.value.trim() || "Course Name";

  certInstructor.textContent = elInstructor.value.trim() || "Instructor Name";

  certIssued.textContent = formatDate(elIssued.value);

  certSerial.textContent = elSerial.value.trim() || "—";
}

function applySignatureFromFile() {
  const file = elSignatureFile.files?.[0];
  if (!file) return;

  if (!file.type?.startsWith("image/")) {
    return;
  }

  if (signatureObjectUrl) {
    URL.revokeObjectURL(signatureObjectUrl);
    signatureObjectUrl = null;
  }

  signatureObjectUrl = URL.createObjectURL(file);
  certSignatureImg.src = signatureObjectUrl;
}

function validateAll() {
  const okName = validateName(elName.value);
  const okCourse = validateCourse(elCourse.value);
  const okInstructor = validateInstructor(elInstructor.value);
  const okIssued = validateIssued(elIssued.value);
  const okSignature = validateSignature(elSignatureFile);

  setRowValid(rowName, okName);
  setRowValid(rowCourse, okCourse);
  setRowValid(rowInstructor, okInstructor);
  setRowValid(rowIssued, okIssued);
  setRowValid(rowSignature, okSignature);

  const allOk = okName && okCourse && okInstructor && okIssued && okSignature;

  btnPrint.disabled = !allOk;

  if (allOk) {
    statusLine.textContent = "✅ All fields are valid. Ready to print.";
    statusLine.className = "status ok";
    validBadge.textContent = "✅ Ready to print";
  } else {
    statusLine.textContent =
      "❌ Please fix the highlighted fields to enable printing.";
    statusLine.className = "status bad";
    validBadge.textContent = "❌ Not ready to print";
  }

  return allOk;
}

function onInputChange() {
  updateCertificate();
  validateAll();
}

[elName, elCourse, elInstructor, elIssued].forEach((el) => {
  el.addEventListener("input", onInputChange);
  el.addEventListener("change", onInputChange);
});

elSignatureFile.addEventListener("change", () => {
  applySignatureFromFile();
  validateAll();
});

btnGenerateSerial.addEventListener("click", () => {
  elSerial.value = generateSerial();
  onInputChange();
});

btnPrint.addEventListener("click", () => {
  if (!validateAll()) return;
  globalThis.print();
});

btnReset.addEventListener("click", () => {
  elName.value = "";
  elCourse.value = "";
  elInstructor.value = "";
  elIssued.value = "";
  elSignatureFile.value = "";

  if (signatureObjectUrl) {
    URL.revokeObjectURL(signatureObjectUrl);
    signatureObjectUrl = null;
  }
  certSignatureImg.src = "../images/DefaultSig.png";

  onInputChange();
});

btnFillDemo.addEventListener("click", () => {
  elName.value = "Ahmed Ali";
  elCourse.value = "Mastering JavaScript Programming";
  elInstructor.value = "Dr Mohamed Hadhoud";
  elIssued.value = new Date().toISOString().slice(0, 10);
  elSerial.value = generateSerial();
  certSignatureImg.src = "../images/sig1.png";
  onInputChange();
});

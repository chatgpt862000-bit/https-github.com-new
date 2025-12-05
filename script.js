/* --------------------- SHEET LINKS -------------------- */
const cowCsvUrl =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSFLGioCUdZbAR_v2KaInBD_GVts9csvUr4Mzz6s5_p1YSAcLPPRg16bnO-9s5UKjb_rqECjzMqAGgd/pub?gid=249634938&single=true&output=csv";

const expenseCsvUrl =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSFLGioCUdZbAR_v2KaInBD_GVts9csvUr4Mzz6s5_p1YSAcLPPRg16bnO-9s5UKjb_rqECjzMqAGgd/pub?gid=1547099893&single=true&output=csv";

const milkCsvUrl =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSFLGioCUdZbAR_v2KaInBD_GVts9csvUr4Mzz6s5_p1YSAcLPPRg16bnO-9s5UKjb_rqECjzMqAGgd/pub?gid=2081043536&single=true&output=csv";


/* --------------------- GLOBAL STATE -------------------- */
let cowRows = [];
let expenseRows = [];
let milkRows = [];
let charts = {};

/* --------------------- UTILITIES ----------------------- */
function cleanHeader(h) {
  return String(h).trim().replace(/^\ufeff/, "");
}

function parseDate(val) {
  if (!val) return null;
  let d = new Date(val);
  if (!isNaN(d)) return d;

  if (val.includes("/")) {
    const [dd, mm, yyyy] = val.split("/");
    return new Date(`${yyyy}-${mm}-${dd}`);
  }
  return null;
}

function fmtDate(d) {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

function addDays(d, days) {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + days);
  return nd;
}

function makeChart(id, cfg) {
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(document.getElementById(id), cfg);
}

/* --------------------- LOAD CSV ------------------------ */
function loadCSV(url) {
  return new Promise((resolve) => {
    Papa.parse(url, {
      download: true,
      header: true,
      transformHeader: cleanHeader,
      complete: (r) => resolve(r.data)
    });
  });
}

/* --------------------- INITIAL LOAD -------------------- */
loadCSV(cowCsvUrl).then((rows) => {
  cowRows = rows;
  renderCowCards();
});

/* --------------------- COW CARDS ----------------------- */
function renderCowCards() {
  const div = document.getElementById("cardContainer");
  div.innerHTML = "";

  cowRows.forEach((r) => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <h3>${r["Cow"]}</h3>
      <p><b>Breed:</b> ${r["Breed"]}</p>
      <p><b>Status:</b> ${r["Status"]}</p>

      <button class="view-btn" onclick='openCowPopup(${JSON.stringify(
        r
      )})'>View Profile</button>
    `;

    div.appendChild(card);
  });
}

/* --------------------- COW POPUP ----------------------- */
function openCowPopup(cow) {
  document.getElementById("popup").style.display = "flex";
  document.getElementById("cowName").innerText = cow["Cow"];

  buildCowBasic(cow);
  buildCowHealth(cow);
  buildCowPregnancy(cow);
  buildCowLactation(cow);
}

function closeCowPopup() {
  document.getElementById("popup").style.display = "none";
}

/* BASIC */
function buildCowBasic(r) {
  document.getElementById("cowBasicBox").innerHTML = `
    <h3>Basic Information</h3>
    <p><b>ID:</b> ${r["ID"]}</p>
    <p><b>Breed:</b> ${r["Breed"]}</p>
    <p><b>Age:</b> ${r["Age"]}</p>
    <p><b>Status:</b> ${r["Status"]}</p>
    <p><b>DOB:</b> ${r["DOB"]}</p>
  `;
}

/* HEALTH */
function buildCowHealth(r) {
  document.getElementById("cowHealthBox").innerHTML = `
    <h3>Health Records</h3>
    <p><b>Disease:</b> ${r["Disease"]}</p>
    <p><b>Rate:</b> ${r["Rate"]}</p>
  `;
}

/* PREGNANCY */
function buildCowPregnancy(r) {
  const ai = parseDate(r["AI Date"]);
  const lastHeat = parseDate(r["Heat"]);

  let html = `<h3>Pregnancy & Heat Tracking</h3>`;

  if (lastHeat) {
    html += `<p><b>Last Heat:</b> ${fmtDate(lastHeat)}</p>`;
    html += `<p><b>Next Heat:</b> ${fmtDate(addDays(lastHeat, 21))}</p>`;
  }

  if (ai) {
    const expected = addDays(ai, 280);
    const daysPreg =
      Math.floor((new Date() - ai) / 86400000);

    html += `
      <p><b>AI Date:</b> ${fmtDate(ai)}</p>
      <p><b>Pregnancy Days:</b> ${daysPreg}</p>
      <p><b>Expected Delivery:</b> ${fmtDate(expected)}</p>
    `;
  } else {
    html += `<p><b>Status:</b> Not Pregnant</p>`;
  }

  document.getElementById("cowPregBox").innerHTML = html;
}

/* LACTATION */
function buildCowLactation(r) {
  document.getElementById("cowLactBox").innerHTML = `
    <h3>Lactation & Milk</h3>
    <p><b>Lactation:</b> ${r["Lactation"]}</p>
    <p><b>Total Milk:</b> ${r["Total Milk"]}</p>
    <p><b>Max:</b> ${r["Max"]}</p>
    <p><b>Min:</b> ${r["Min"]}</p>
  `;
}

/* ------------- EXPENSE POPUP + ANALYTICS --------------- */
document.getElementById("expenseBtn").onclick = async () => {
  if (expenseRows.length === 0) expenseRows = await loadCSV(expenseCsvUrl);
  if (milkRows.length === 0) milkRows = await loadCSV(milkCsvUrl);

  const popup = document.getElementById("expensePopup");
  popup.style.display = "flex";

  prepareFilters();

  requestAnimationFrame(() => {
    updateAllAnalytics();
  });
};

function closeExpensePopup() {
  document.getElementById("expensePopup").style.display = "none";
}

/* FILTERS */
function prepareFilters() {
  const years = new Set();
  const cats = new Set();

  expenseRows.forEach((r) => {
    const d = parseDate(r["Timestamp"]);
    if (d) years.add(d.getFullYear());
    cats.add(r["Category"]);
  });

  const YF = document.getElementById("yearFrom");
  const YT = document.getElementById("yearTo");
  const CAT = document.getElementById("expCategory");

  YF.innerHTML = "";
  YT.innerHTML = "";
  CAT.innerHTML = "<option value=''>All</option>";

  [...years].sort().forEach((y) => {
    YF.innerHTML += `<option>${y}</option>`;
    YT.innerHTML += `<option>${y}</option>`;
  });

  [...cats].forEach((c) => {
    CAT.innerHTML += `<option>${c}</option>`;
  });

  const arr = [...years].sort();
  YF.value = arr[0];
  YT.value = arr[arr.length - 1];

  YF.onchange = updateAllAnalytics;
  YT.onchange = updateAllAnalytics;
  CAT.onchange = updateAllAnalytics;
}

/* MASTER UPDATE */
function updateAllAnalytics() {
  renderSummary();
  renderExpenseTable();
  drawExpenseCharts();
  drawIncomeVsExpense();
  drawMilkCharts();
}

/* SUMMARY CARDS */
function renderSummary() {
  let income = 0, expense = 0;
  const YF = +yearFrom.value;
  const YT = +yearTo.value;

  milkRows.forEach((r) => {
    const d = parseDate(r["Start Date"]);
    if (!d) return;
    if (d.getFullYear() < YF || d.getFullYear() > YT) return;
    income += parseFloat(r["Payment"] || 0);
  });

  expenseRows.forEach((r) => {
    const d = parseDate(r["Timestamp"]);
    if (!d) return;
    if (d.getFullYear() < YF || d.getFullYear() > YT) return;
    expense += parseFloat(r["Rs"] || 0);
  });

  document.getElementById("summaryCards").innerHTML = `
    <div class="summaryCard"><b>Income</b><br>Rs ${income.toFixed(2)}</div>
    <div class="summaryCard"><b>Expense</b><br>Rs ${expense.toFixed(2)}</div>
    <div class="summaryCard"><b>Profit</b><br>Rs ${(income - expense).toFixed(2)}</div>
  `;
}

/* EXPENSE TABLE */
function renderExpenseTable() {
  const YF = +yearFrom.value;
  const YT = +yearTo.value;
  const catSel = expCategory.value;

  let totals = {};
  let sum = 0;

  expenseRows.forEach((r) => {
    const d = parseDate(r["Timestamp"]);
    if (!d) return;
    if (d.getFullYear() < YF || d.getFullYear() > YT) return;

    if (catSel && catSel !== r["Category"]) return;

    const cat = r["Category"] || "Other";
    const amt = parseFloat(r["Rs"] || 0);
    totals[cat] = (totals[cat] || 0) + amt;
    sum += amt;
  });

  let html = `<table><tr><th>Category</th><th>Total (Rs)</th></tr>`;
  Object.keys(totals).forEach((c) => {
    html += `<tr><td>${c}</td><td>${totals[c].toFixed(2)}</td></tr>`;
  });
  html += `<tr><td><b>Total</b></td><td><b>${sum.toFixed(2)}</b></td></tr></table>`;

  document.getElementById("expenseData").innerHTML = html;
}

/* BAR + PIE */
function drawExpenseCharts() {
  const YF = +yearFrom.value;
  const YT = +yearTo.value;
  const catSel = expCategory.value;

  let totals = {};

  expenseRows.forEach((r) => {
    const d = parseDate(r["Timestamp"]);
    if (!d) return;
    if (d.getFullYear() < YF || d.getFullYear() > YT) return;
    if (catSel && catSel !== r["Category"]) return;

    const cat = r["Category"];
    totals[cat] = (totals[cat] || 0) + parseFloat(r["Rs"]);
  });

  const labels = Object.keys(totals);
  const data = labels.map((l) => totals[l]);

  makeChart("expenseBarChart", {
    type: "bar",
    data: { labels, datasets: [{ data, backgroundColor: "skyblue" }] }
  });

  makeChart("expensePieChart", {
    type: "pie",
    data: { labels, datasets: [{ data }] }
  });
}

/* INCOME VS EXPENSE */
function drawIncomeVsExpense() {
  let inc = {}, exp = {};

  milkRows.forEach((r) => {
    const d = parseDate(r["Start Date"]);
    if (!d) return;
    const k = d.toISOString().slice(0, 7);
    inc[k] = (inc[k] || 0) + parseFloat(r["Payment"]);
  });

  expenseRows.forEach((r) => {
    const d = parseDate(r["Timestamp"]);
    if (!d) return;
    const k = d.toISOString().slice(0, 7);
    exp[k] = (exp[k] || 0) + parseFloat(r["Rs"]);
  });

  const months = [...new Set([...Object.keys(inc), ...Object.keys(exp)])].sort();

  makeChart("incomeExpenseChart", {
    type: "line",
    data: {
      labels: months,
      datasets: [
        { label: "Income", data: months.map((m) => inc[m] || 0), borderColor: "green" },
        { label: "Expense", data: months.map((m) => exp[m] || 0), borderColor: "red" }
      ]
    }
  });
}

/* MILK CHARTS */
function drawMilkCharts() {
  let daily = [];
  milkRows.forEach((r) => {
    const d = parseDate(r["Start Date"]);
    if (!d) return;
    daily.push({ d, qty: +r["Total Milk Count"] });
  });

  daily.sort((a, b) => a.d - b.d);

  makeChart("milkLineChart", {
    type: "line",
    data: {
      labels: daily.map((x) => fmtDate(x.d)),
      datasets: [{ label: "Daily Milk", data: daily.map((x) => x.qty), borderColor: "blue" }]
    }
  });

  let monthly = {};
  daily.forEach((x) => {
    const k = x.d.toISOString().slice(0, 7);
    monthly[k] = (monthly[k] || 0) + x.qty;
  });

  makeChart("monthlyMilkChart", {
    type: "line",
    data: {
      labels: Object.keys(monthly),
      datasets: [{ label: "Monthly Milk", data: Object.values(monthly), borderColor: "purple" }]
    }
  });
}


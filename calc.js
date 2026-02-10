// gloabal state management

// track all line items by their unique ID's
let lineItems = [];
// counter to generate unique ID's for each line item (never decrements, ensures uniqueness)
let itemCounter = 0;

// ===== THEME MANAGEMENT =====
// Handles dark mode toggle and persistence

const THEME_KEY = 'produce-calc-theme';

// Detect system preference for dark mode
function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

// Get saved theme from localStorage or fall back to system preference
function getInitialTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  return saved || getSystemTheme();
}

// Apply theme to document and save to localStorage
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  updateThemeToggleButton(theme);
}

// Update toggle button appearance based on current theme
function updateThemeToggleButton(theme) {
  const toggle = document.getElementById('themeToggle');
  if (toggle) {
    toggle.setAttribute('aria-pressed', theme === 'dark');
  }
}

// Toggle between light and dark themes
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  applyTheme(next);
}

// page initialization
// wait for DOM to fully load before running any code
// this ensures all HTML elements exist before we try to manipulate them
document.addEventListener("DOMContentLoaded", () => {
  // Apply saved theme immediately (prevent flash of wrong theme)
  applyTheme(getInitialTheme());

  // Set up theme toggle button click handler
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  // Listen for system theme changes (respects user's OS preferences)
  window.matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', (e) => {
      // Only auto-switch if user hasn't manually set a preference
      if (!localStorage.getItem(THEME_KEY)) {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    });

  // automatically add one empty row when page loads so user can start entering data
  addLineItem();
});

// add line item function
// creates a new input row for entering product information
function addLineItem() {
  // increment counter first to get a new unique ID
  itemCounter++;
  const id = itemCounter;
  // add this ID to our tracking array
  lineItems.push(id);

  // get the container where we'll insert the new row
  const container = document.getElementById("lineItemsContainer");

  // create a new div element to hold the entire row
  const row = document.createElement("div");
  row.className = "input-row"; // Apply CSS grid styling
  row.id = `row-${id}`; // unique ID so we can remove it later

  // build the HTML for the row with 4 input fields and a delete button
  // Each input has a unique ID based on the row ID (e.g., name-1, cost-1, sell-1, qty-1)
  row.innerHTML = `
    <div class="input-group">
        <input type="text" id="name-${id}"
        placeholder="e.g., Organic Apples">
    </div>
    <div class="input-group">
        <input type="number" id="cost-${id}" step="0.01" min="0" placeholder="0.00">
    </div>
    <div class="input-group">
        <input type="number" id="sell-${id}" step="0.01" min="0" placeholder="0.00">
    </div>
    <div class="input-group">
        <input type="number" id="qty-${id}" min="1" value="1">
    </div>
    <button class="btn btn-danger"
    onclick="removeLineItem(${id})"
    title="Remove">×</button>
    `;
  // add the row to the container (appears at bottom of list)
  container.appendChild(row);
  // automatically focus on the product name field for better UX
  document.getElementById(`name-${id}`).focus();
}

// remove line item function
// deletes a specific row from the interface and tracking array
function removeLineItem(id) {
  // prevent user from deleting the last remaining row (need at least one)
  if (lineItems.length <= 1) {
    alert("You need at least one line item.");
    return;
  }
  // remove the ID from our tracking array using filter
  lineItems = lineItems.filter((i) => i !== id);
  // remove the actual HTML element from the page
  document.getElementById(`row-${id}`).remove();
}

// get margin type
// determines which margin calculation method the user has selected
// returns: 'gross', 'markup', or 'net'
function getMarginType() {
  // Find the radio button that's currently checked
  return document.querySelector('input[name="marginType"]:checked').value;
}

// calculate margin
// preforms the actual margin calculation based on the selected method
// Parameters:
//   - cost: unit cost of the product
//   - revenue: unit selling price
//   - profit: profit per unit (revenue - cost)
//   - type: 'gross', 'markup', or 'net'
function calculateMargin(cost, revenue, profit, type) {
  if (type === "markup") {
    // markup % = (profit /cost) * 100
    // shows profit as percentage of what you paid
    return cost > 0 ? (profit / cost) * 100 : 0;
  } else if (type === "net") {
    // net margin % = (profit / revenue) * 100
    // same as gross margin for single items
    return revenue > 0 ? (profit / revenue) * 100 : 0;
  } else {
    // gross margin % = (profit / revenue) * 100
    // shows profit as percetage of selling price
    return revenue > 0 ? (profit / revenue) * 100 : 0;
  }
}

// calculate all function
// this is the main calculation engine - processes all line items and displays results
// calledwhen user clicks "calculate quote" button
function calculateAll() {
  // step 1: get the selected margin calculation method
  const marginType = getMarginType();
  // step 2: get references to the table sections we'll populate
  const resultsBody = document.getElementById("resultsBody");
  const resultsFoot = document.getElementById("resultsFoot");
  resultsBody.innerHTML = ""; // clear any previous results
  // step 3: initialize running totals for the entire quote
  let grandTotalCost = 0;
  let grandTotalRevenue = 0;
  let grandTotalProfit = 0;
  let validItems = 0; // count how many items have actual data

  //step 4: loop through each line item and process it
  lineItems.forEach((id) => {
    // get the values from input fields (w/ fallbacks for empty fields)
    const name =
      document.getElementById(`name-${id}`).value || "Unnamed Product";
    const cost = parseFloat(document.getElementById(`cost-${id}`).value) || 0;
    const sell = parseFloat(document.getElementById(`sell-${id}`).value) || 0;
    const qty = parseFloat(document.getElementById(`qty-${id}`).value) || 1;

    // skip empty rows (where both cost and sell price are 0)
    if (cost === 0 && sell === 0) return;
    // this row has data, so count it
    validItems++;
    // calculate totals for thi line item
    const totalCost = cost * qty;
    const totalRevenue = sell * qty;
    const profit = totalRevenue - totalCost;
    // calculate margin per unit (profit/qty gives us unit profit)
    const margin = calculateMargin(cost, sell, profit / qty, marginType);
    // add to running totals
    grandTotalCost += totalCost;
    grandTotalRevenue += totalRevenue;
    grandTotalProfit += profit;

    // determine CSS class for color coding (green for profit, red for loss)
    const profitClass = profit >= 0 ? "profit-positive" : "profit-negative";
    // create a new table row for this item
    const row = document.createElement("tr");
    row.innerHTML = `
        <td data-label="Product">${escapeHtml(name)}</td>
        <td data-label="Qty" class="number">${qty}</td>
        <td data-label="Unit Cost" class="number">$${cost.toFixed(2)}</td>
        <td data-label="Unit Price" class="number">$${sell.toFixed(2)}</td>
        <td data-label="Total" class="number">$${totalRevenue.toFixed(2)}</td>
        <td data-label="Profit" class="number ${profitClass}">$${profit.toFixed(2)}</td>
        <td data-label="Margin" class="number ${profitClass}">$${margin.toFixed(1)}%</td>
    `;
    // add the row to the table body
    resultsBody.appendChild(row);
  });

  // step 5: handle case where no valid items were entered
  if (validItems === 0) {
    resultsBody.innerHTML =
      '<tr><td colspan="7" class="empty-state">No items to calculate. Add products above.</td></tr>';
    resultsFoot.innerHTML = "";
    document.getElementById("results").classList.remove("show");
    return; // exit early
  }

  // step 6: calculate overall margin across all items
  const overallMargin = calculateMargin(
    grandTotalCost,
    grandTotalRevenue,
    grandTotalProfit,
    marginType,
  );
  const profitClass =
    grandTotalProfit >= 0 ? "profit-positive" : "profit-negative";

  // step 7: create the total in the table footer
  resultsFoot.innerHTML = `
  <tr>
    <td colspan="4" data-label=""><strong>TOTALS</strong></td>
    <td data-label="Total" class="number">$${grandTotalRevenue.toFixed(2)}</td>
    <td data-label="Profit" class="number ${profitClass}">$${grandTotalProfit.toFixed(2)}</td>
    <td data-label="Margin" class="number ${profitClass}">${overallMargin.toFixed(1)}%</td>
  </tr>
  `;

  // step 8: update the summary cards with totals
  document.getElementById("totalCost").textContent =
    "$" + grandTotalCost.toFixed(2);
  document.getElementById("totalRevenue").textContent =
    "$" + grandTotalRevenue.toFixed(2);
  document.getElementById("totalProfit").textContent =
    "$" + grandTotalProfit.toFixed(2);
  document.getElementById("overallMargin").textContent =
    overallMargin.toFixed(1) + "%";

  // step 9: apply color coding to summary cards (red background for negative)
  const profitCard = document.getElementById("profitCard");
  const marginCard = document.getElementById("marginCard");
  profitCard.className =
    "summary-card" + (grandTotalProfit < 0 ? " negative" : "");
  marginCard.className =
    "summary-card highlight" + (overallMargin < 0 ? " negative" : "");

  // step 10: update the margin label to show which calculation method is being used
  const marginLabels = {
    gross: "Gross Margin",
    markup: "Markup",
    net: "Net Margin",
  };
  document.getElementById("marginLabel").textContent =
    "Overall " + marginLabels[marginType];

  // step 11: update quote date (shown when printing)
  document.getElementById("quoteDate").textContent =
    "Date: " + new Date().toLocaleDateString();

  // step 12: show the results section (was hidden by default)
  document.getElementById("results").classList.add("show");
}

// clear all function
// resets the entire form back to initial state
function clearAll() {
  // ask for confirmation to prevent accidental data loss
  if (!confirm("Clear all line items?")) return;
  // remove all line item rows from the page
  document.getElementById("lineItemsContainer").innerHTML = "";
  // reset tracking arrays and counter
  lineItems = [];
  itemCounter = 0;
  // hide the results section
  document.getElementById("results").classList.remove("show");
  // Add one empty row to start fresh
  addLineItem();
}

// print quote function
// opens the browser's print dialog
// CSS @media print rules handle hiding/showing appropriate sections
function printQuote() {
  window.print();
}

// export CSV function
// creates a downloadable CSV file with all quote data
function exportCSV() {
  const marginType = getMarginType();
  // start with CSV header row
  let csv =
    "Product, Quantity, Unit Cost, Unit Price, Total Revenue, Profit, Margin %\n";

  // loop through each line item and add to CSV
  lineItems.forEach((id) => {
    // get values from input fields
    const name =
      document.getElementById(`name-${id}`).value || "Unnamed Product";
    const cost = parseFloat(document.getElementById(`cost-${id}`).value) || 0;
    const sell = parseFloat(document.getElementById(`sell-${id}`).value) || 0;
    const qty = parseInt(document.getElementById(`qty-${id}`).value) || 1;

    // skip empty rows
    if (cost === 0 && sell === 0) return;

    // calculate values
    const totalRevenue = sell * qty;
    const profit = totalRevenue - cost * qty;
    const margin = calculateMargin(cost, sell, profit / qty, marginType);

    // add data row (quote product name to handle commas in names)
    csv += `"${name}", ${qty}, ${cost.toFixed(2)}, ${sell.toFixed(2)}, ${totalRevenue.toFixed(2)}, ${profit.toFixed(2)}, ${margin.toFixed(1)}\n`;
  });

  // create a downloadable file from the CSV string
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  // filename includes today's date
  a.download =
    "produce-quote-" + new Date().toISOString().slice(0, 10) + ".csv";
  a.click(); // trigger download
  URL.revokeObjectURL(url); // clean up memory
}

// copy to clipboard function
// creates a plain text version of the quote and copies it to clipboard
// useful for pasting into emails, messages, etc.
function copyToClipboard() {
  const marginType = getMarginType();

  // build the text output - start with header
  let text = "PRODUCE QUOTE - " + new Date().toLocaleDateString() + "\n";
  text += "=".repeat(60) + "\n\n"; // visual separtor line

  // initalize totals
  let grandTotalCost = 0;
  let grandTotalRevenue = 0;
  let grandTotalProfit = 0;

  // Loop through each line item
  lineItems.forEach((id) => {
    // get values from input fields
    const name =
      document.getElementById(`name-${id}`).value || "Unnamed Product";
    const cost = parseFloat(document.getElementById(`cost-${id}`).value) || 0;
    const sell = parseFloat(document.getElementById(`sell-${id}`).value) || 0;
    const qty = parseInt(document.getElementById(`qty-${id}`).value) || 1;

    // skip empty rows
    if (cost === 0 && sell === 0) return;

    // calculate values
    const totalCost = cost * qty;
    const totalRevenue = sell * qty;
    const profit = totalRevenue - totalCost;
    const margin = calculateMargin(cost, sell, profit / qty, marginType);

    // add to running totals
    grandTotalCost += totalCost;
    grandTotalRevenue += totalRevenue;
    grandTotalProfit += profit;

    // format line item as text (human-readable format)
    text += `${name}\n`;
    text += ` Qty: ${qty} @ $${sell.toFixed(2)} = $${totalRevenue.toFixed(2)} (Profit: $${profit.toFixed(2)}, Margin: ${margin.toFixed(1)}%)\n\n`;
  });

  // add totals section at the bottom
  const overallMargin = calculateMargin(
    grandTotalCost,
    grandTotalRevenue,
    grandTotalProfit,
    marginType,
  );
  text += "=".repeat(60) + "\n"; //separtor line
  text += `TOTAL REVENUE: $${grandTotalRevenue.toFixed(2)}\n`;
  text += `TOTAL PROFIT:  $${grandTotalProfit.toFixed(2)}\n`;
  text += `OVERALL MARGIN: ${overallMargin.toFixed(1)}%\n`;

  // use the clipboard API to copy text
  // returns a promise that resolves on success
  navigator.clipboard.writeText(text).then(() => {
    alert('Quote copied to clipboard!');
  }).catch(() => {
    alert('Failed to copy. Please try again.');
  });
}

// escape HTML function
// Security function to prevent XSS attacks when displaying user input
// Converts special characters like <, >, & to their HTML entity equivalents
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text; // Browser automatically escapes special chars
    return div.innerHTML; // Return the escaped version
}

// keyboard shortcut listener
// Adds convenience feature: pressing Enter in the last row adds a new row
// Speeds up data entry workflow
document.addEventListener('keypress', function(e) {
    // Check if Enter key was pressed
    if (e.key === 'Enter') {
        const activeEl = document.activeElement; // Get focused element
        // Only proceed if an input field is focused
        if (activeEl.tagName === 'INPUT') {
            const lastId = lineItems[lineItems.length - 1]; // Get ID of last row
            // Check if the focused input belongs to the last row
            if (activeEl.id.includes(`-${lastId}`)) {
                e.preventDefault(); // Prevent form submission
                addLineItem(); // Add new row
            }
        }
    }
});

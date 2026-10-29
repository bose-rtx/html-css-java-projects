// DOM elements
const form = document.getElementById("currency-form");
const amountInput = document.getElementById("amount-input");
const baseSelect = document.getElementById("base-currency");
const targetSelect = document.getElementById("target-currency");
const swapBtn = document.getElementById("swap-currencies-btn");
const submitBtn = document.getElementById("submit-btn");
const rateStatus = document.getElementById("rate-status");
const finalResult = document.getElementById("final-result");

// Default initial currencies
const DEFAULT_BASE = "USD";
const DEFAULT_TARGET = "EUR";

// Cache exchange rates to reduce unnecessary network requests
let cachedRates = {};
let currentBase = "";

// Common fallback currency codes in case the network fails on initial load
const FALLBACK_CURRENCIES = [
  "USD", "EUR", "GBP", "INR", "JPY", "CAD", "AUD", "CHF", "CNY", "NZD",
  "SGD", "HKD", "AED", "SEK", "KRW", "BRL", "MXN", "ZAR", "SAR", "THB"
];

// Populate a dropdown with currency codes
function populateDropdown(selectEl, currencies, defaultSelection) {
  selectEl.innerHTML = "";
  const fragment = document.createDocumentFragment();

  currencies.forEach((code) => {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = code;
    if (code === defaultSelection) {
      option.selected = true;
    }
    fragment.appendChild(option);
  });

  selectEl.appendChild(fragment);
}

// Format numbers with comma separators and specified decimal places
function formatNumber(num, maxDecimals = 2) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: maxDecimals,
  }).format(num);
}

// Initial setup: fetch currency codes and populate the selectors
async function initializeCurrencies() {
  rateStatus.textContent = "Loading live rates...";

  try {
    const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${DEFAULT_BASE}`);
    if (!res.ok) throw new Error("Could not reach exchange rate server");

    const data = await res.json();
    cachedRates = data.rates;
    currentBase = DEFAULT_BASE;

    const availableCodes = Object.keys(data.rates);
    populateDropdown(baseSelect, availableCodes, DEFAULT_BASE);
    populateDropdown(targetSelect, availableCodes, DEFAULT_TARGET);

    // Run initial conversion for the default amount
    handleConversion();
  } catch (error) {
    console.warn("Using offline fallback currencies:", error);
    populateDropdown(baseSelect, FALLBACK_CURRENCIES, DEFAULT_BASE);
    populateDropdown(targetSelect, FALLBACK_CURRENCIES, DEFAULT_TARGET);
    rateStatus.textContent = "Network error: check connection";
    finalResult.textContent = "Live rates unavailable";
  }
}

// Convert the entered amount
async function handleConversion(e) {
  if (e) e.preventDefault();

  const amount = parseFloat(amountInput.value);
  const fromCode = baseSelect.value;
  const toCode = targetSelect.value;

  // Basic validation
  if (isNaN(amount) || amount <= 0) {
    rateStatus.textContent = "Invalid amount";
    finalResult.textContent = "Please enter an amount greater than 0";
    amountInput.focus();
    return;
  }

  // Loading state
  submitBtn.disabled = true;
  submitBtn.classList.add("loading");
  submitBtn.querySelector("span").textContent = "Converting...";

  try {
    let rates = cachedRates;

    // Only fetch if base currency changed or no rates are cached yet
    if (currentBase !== fromCode || Object.keys(rates).length === 0) {
      const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${fromCode}`);
      if (!response.ok) throw new Error("Failed to fetch rates for " + fromCode);

      const data = await response.json();
      rates = data.rates;
      cachedRates = rates;
      currentBase = fromCode;
    }

    const exchangeRate = rates[toCode];
    if (!exchangeRate) {
      throw new Error(`Rate not found for ${toCode}`);
    }

    const convertedTotal = amount * exchangeRate;

    // Render results
    rateStatus.textContent = `1 ${fromCode} = ${formatNumber(exchangeRate, 4)} ${toCode}`;
    finalResult.textContent = `${formatNumber(amount)} ${fromCode} = ${formatNumber(convertedTotal)} ${toCode}`;
  } catch (err) {
    rateStatus.textContent = "Conversion failed";
    finalResult.textContent = "Unable to fetch exchange rates right now.";
  } finally {
    submitBtn.disabled = false;
    submitBtn.classList.remove("loading");
    submitBtn.querySelector("span").textContent = "Convert";
  }
}

// Quick currency swap button
function swapCurrencies() {
  const currentBaseVal = baseSelect.value;
  baseSelect.value = targetSelect.value;
  targetSelect.value = currentBaseVal;

  // Add short spin animation class
  swapBtn.classList.add("rotated");
  setTimeout(() => swapBtn.classList.remove("rotated"), 350);

  // Recalculate right away
  handleConversion();
}

// Attach event listeners
document.addEventListener("DOMContentLoaded", initializeCurrencies);
form.addEventListener("submit", handleConversion);
swapBtn.addEventListener("click", swapCurrencies);

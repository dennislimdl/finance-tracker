/**
 * Monthly tab automation for the expense sheet.
 * Lives in Extensions > Apps Script on the Sheet itself (not part of the
 * Next.js app) — see ../README.md for setup steps.
 *
 * dailyCheck() is meant to run once a day via a time-based trigger. On the
 * last day of the month it duplicates "Template" and renames the copy to
 * next month's tab, e.g. "Sep'26". Any other day it's a no-op.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatTabName(date) {
  return MONTHS[date.getMonth()] + "'" + String(date.getFullYear()).slice(-2);
}

function isLastDayOfMonth(date) {
  const tomorrow = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  return tomorrow.getMonth() !== date.getMonth();
}

function createTabForMonth(date) {
  const tabName = formatTabName(date);
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  if (ss.getSheetByName(tabName)) {
    Logger.log('Tab "' + tabName + '" already exists, skipping.');
    return;
  }

  const template = ss.getSheetByName("Template");
  if (!template) {
    throw new Error('"Template" tab not found — rename it back if it was renamed.');
  }

  const newSheet = template.copyTo(ss);
  newSheet.setName(tabName);
  ss.setActiveSheet(newSheet);
  ss.moveActiveSheet(ss.getNumSheets()); // move to the end, after all existing tabs

  Logger.log("Created tab: " + tabName);
}

/** Installed as the daily trigger's target function. */
function dailyCheck() {
  const today = new Date();
  if (!isLastDayOfMonth(today)) {
    Logger.log("Not the last day of the month, skipping.");
    return;
  }
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  createTabForMonth(nextMonth);
}

/** Manual/testing: creates next month's tab right now, regardless of date. */
function createNextMonthTabNow() {
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  createTabForMonth(nextMonth);
}

/** Run this once from the Apps Script editor to install the daily trigger (~23:59). */
function setupDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "dailyCheck") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("dailyCheck").timeBased().everyDays(1).atHour(23).nearMinute(59).create();
  Logger.log("Daily trigger installed (~23:59).");
}

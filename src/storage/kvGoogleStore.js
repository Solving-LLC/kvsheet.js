// src/storage/kvGoogleStore.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

/**
 * Parses the sheet ID if the provided string might be a full Google Sheets URL.
 * @param {string} sheetIdOrUrl
 * @returns {string}
 */
function parseSheetId(sheetIdOrUrl) {
  const regex = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
  const match = sheetIdOrUrl.match(regex);
  if (match && match[1]) {
    return match[1];
  }
  return sheetIdOrUrl;
}

/**
 * Main class for storing data and implementing load/save logic to Google Sheets.
 */
class KeyValueStore {
  /**
   * @param {object} options
   * @param {import('googleapis').Auth.JWT} options.authClient
   * @param {string} options.sheetId
   * @param {string} [options.sheetName]
   * @param {string} options.startX
   * @param {number} options.startY
   */
  constructor({ authClient, sheetId, sheetName, startX, startY }) {
    this._authClient = authClient;
    this._sheetId = sheetId;
    this._sheetName = sheetName;
    this._startX = startX;
    this._startY = startY;
    this._data = {};

    if (!sheetName) {
      console.warn(
        'No "sheetName" provided. The code will default to the first sheet in the spreadsheet.'
      );
    }
  }

  /**
   * Loads data from the Google Sheet into the internal _data object.
   * It assumes that keys are in column A and values in column B, starting at startX/startY.
   * If sheetName is omitted, it uses "A1:B" on the first sheet by default.
   */
  async load() {
    const sheetsApi = google.sheets({ version: 'v4', auth: this._authClient });
    const rangePrefix = this._sheetName ? `${this._sheetName}!` : '';
    const range = `${rangePrefix}${this._startX}${this._startY}:B`;

    const response = await sheetsApi.spreadsheets.values.get({
      spreadsheetId: this._sheetId,
      range,
    });

    const rows = response.data.values || [];
    this._data = {};
    for (const row of rows) {
      const key = row[0];
      const value = row[1] ?? '';
      this._data[key] = value;
    }
  }

  /**
   * Saves the current state of _data back to the Google Sheet.
   * It clears the relevant range and writes all key-value pairs.
   * If sheetName is omitted, it writes to "A1:B" on the first sheet.
   */
  async save() {
    const sheetsApi = google.sheets({ version: 'v4', auth: this._authClient });
    const rangePrefix = this._sheetName ? `${this._sheetName}!` : '';
    const range = `${rangePrefix}${this._startX}${this._startY}:B`;

    // Transform _data into an array of [key, value] pairs
    const rows = Object.entries(this._data);

    await sheetsApi.spreadsheets.values.clear({
      spreadsheetId: this._sheetId,
      range,
    });

    await sheetsApi.spreadsheets.values.update({
      spreadsheetId: this._sheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: { values: rows },
    });
  }
}

/**
 * A Proxy wrapper that allows accessing store keys with dot notation
 * and using methods like store.save() seamlessly.
 */
function wrapStoreInProxy(storeInstance) {
  return new Proxy(storeInstance, {
    get(target, prop, receiver) {
      if (prop in target) {
        return Reflect.get(target, prop, receiver);
      }
      return target._data[prop];
    },
    set(target, prop, value, receiver) {
      if (prop in target) {
        return Reflect.set(target, prop, value, receiver);
      }
      target._data[prop] = value;
      return true;
    },
  });
}

/**
 * Helper function to obtain service account credentials either from:
 * 1) clientEmail + privateKey, or
 * 2) a service account JSON file.
 * @param {object} options
 * @param {string} [options.clientEmail]
 * @param {string} [options.privateKey]
 * @param {string} [options.serviceAccountCredentials]
 * @returns {{ client_email: string, private_key: string }}
 */
function getServiceAccountCredentials(options) {
  const { clientEmail, privateKey, serviceAccountCredentials } = options;

  // 1) If direct credentials are provided, use them first
  if (clientEmail && privateKey) {
    return {
      client_email: clientEmail,
      private_key: privateKey,
    };
  }

  // 2) Otherwise, try to read from the JSON file
  const jsonPath = path.resolve(serviceAccountCredentials);
  if (fs.existsSync(jsonPath)) {
    const credentialsJson = fs.readFileSync(jsonPath, 'utf8');
    return JSON.parse(credentialsJson);
  }

  throw new Error(
    'Cannot find valid service account credentials. ' +
      'Provide either (clientEmail, privateKey) or a valid serviceAccountCredentials file.'
  );
}

/**
 * Creates and returns a Proxy-wrapped KeyValueStore with data loaded from Google Sheets.
 *
 * This function reads configuration from the provided options or from .env:
 * - sheetId, sheetName, startX, startY
 * - serviceAccountCredentials or clientEmail/privateKey
 *
 * Priority for authentication data:
 *  1) clientEmail + privateKey
 *  2) serviceAccountCredentials JSON file
 *
 * @param {object} [options]
 * @param {string} [options.sheetId] - ID or URL of the Google Sheet
 * @param {string} [options.sheetName] - Name of the sheet. If omitted, first sheet is used.
 * @param {string} [options.startX] - Starting column (default: "A")
 * @param {number} [options.startY] - Starting row (default: 1)
 * @param {string} [options.serviceAccountCredentials] - Path to a service account JSON file
 * @param {string} [options.clientEmail] - client_email from service account (if provided directly)
 * @param {string} [options.privateKey] - private_key from service account (if provided directly)
 *
 * @returns {Promise<KeyValueStore>} - A Proxy-wrapped instance of KeyValueStore
 */
async function createKeyValueStore(options = {}) {
  let {
    // Google Sheets options
    sheetId = process.env.SHEET_ID,
    sheetName = process.env.SHEET_NAME,
    startX = process.env.START_X || 'A',
    startY = Number(process.env.START_Y || '1'),

    // Auth options
    serviceAccountCredentials = process.env.SERVICE_ACCOUNT_CREDENTIALS || './service_account.json',
    clientEmail = process.env.GOOGLE_CLIENT_EMAIL,
    privateKey = process.env.GOOGLE_PRIVATE_KEY,
  } = options;

  if (!sheetId) {
    throw new Error('No SHEET_ID found. Provide it via options or .env.');
  }

  // If sheetId might be a URL, parse out the actual ID
  sheetId = parseSheetId(sheetId);

  // Build the credentials object (either from direct fields or from JSON)
  const creds = getServiceAccountCredentials({
    clientEmail,
    privateKey,
    serviceAccountCredentials,
  });

  // Create the JWT auth client
  const authClient = new google.auth.JWT(
    creds.client_email,
    null,
    creds.private_key,
    ['https://www.googleapis.com/auth/spreadsheets']
  );

  // Authorize it
  await authClient.authorize();

  // Initialize the store
  const store = new KeyValueStore({
    authClient,
    sheetId,
    sheetName,
    startX,
    startY,
  });

  // Load initial data
  await store.load();

  // Return a proxy that allows direct key access
  return wrapStoreInProxy(store);
}

module.exports = {
  createKeyValueStore,
};

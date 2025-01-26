# kvsheet.js

A **simple and convenient way** to use **Google Sheets** as a key-value store in **Node.js**. No more messing with heavy databases or hacky file-based storage — just put your data in a Google Sheet and enjoy the ease!

## Quick Example

```js
// index.js
const { createKeyValueStore } = require('kvsheet.js');

(async () => {
  // Create the store (reads from .env by default or use inline params)
  const store = await createKeyValueStore();

  // Set or update values as if it's a normal JS object
  store.total = 123;
  store.username = 'Alice';

  // Commit changes to Google Sheets
  await store.save();

  // Check what we have
  console.log('Now "total" is:', store.total);
  console.log('Done!');
})();
```

## Why kvsheet.js?

- **Familiar interface (Google Sheets)**
  There’s no need to spin up a separate server or manage a database. Everything lives in a familiar Google Sheet that you and your team can already access and edit.

- **Lightweight Node.js integration**
  Written in JavaScript for Node.js, it only requires a few lines of code to get a powerful key-value store up and running.

- **Minimal configuration**
  Just provide your spreadsheet ID (or URL), the path to your service account JSON, and an optional sheet name. Alternatively, configure them all via `.env` for maximum convenience!

- **Flexible authentication**
  Use direct key-value pairs (`client_email` and `private_key`) or point to a `service_account.json` file. Both methods are supported out of the box.

- **Intuitive Proxy wrapper**
  Access your data like a plain JavaScript object: `store.someKey = 123; store.otherKey = "foo"`. Once you’re ready, just run `store.save()` to commit everything to Google Sheets.

- **Automatic ID parsing**
  Pass in a full Google Sheets URL, and kvsheet.js will extract the spreadsheet ID on its own. No extra hassle for your users.

## Use Cases

- **Quick config storage** (simple app settings, environment variables, or basic config data).  
- **Easy counters and metrics** (for bots, scripts, or lightweight internal tools).  
- **Shared data** without extra infrastructure — give your teammates access to the Google Sheet, and everyone can view or edit data in real time.

## Installation

```bash
npm install kvsheet.js
```

*(Requires Node.js v12 or higher.)*

## Getting Started

1. **Create a Google Spreadsheet** or select an existing one.
2. **Enable the Google Sheets API** in Google Cloud Console and **create a Service Account**:
   - Download the JSON key (e.g., `service_account.json`).
3. **Share the spreadsheet** with your service account email.
   - The email looks like `xxx@xxx.iam.gserviceaccount.com`.
   - Grant **Editor** permission.
4. **Place `service_account.json` in your project** and ignore it in `.gitignore`.
5. **Use .env** or inline parameters to point to your JSON and spreadsheet.

### Sample .env

```bash
SHEET_ID=https://docs.google.com/spreadsheets/d/AAAABBBBCCCCDDDD/edit#gid=0
SHEET_NAME=Sheet1
SERVICE_ACCOUNT_CREDENTIALS=./service_account.json
START_X=A
START_Y=1

# Or use direct credentials instead of a JSON file:
GOOGLE_CLIENT_EMAIL=xxx@xxx.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...
```

## How It Works

- Under the hood, kvsheet.js uses [googleapis](https://www.npmjs.com/package/googleapis) for authentication and to read/write data.
- When you call `createKeyValueStore(...)`, kvsheet.js:
  1. Extracts the spreadsheet ID from a URL or uses the direct ID you provide.
  2. Loads your service account credentials (from a JSON file or environment variables).
  3. Connects to the Google Sheets API, reading data from columns `A:B` (or any range you specify).
  4. Stores everything in an internal object, `_data`.
- When you modify properties and call `store.save()`, kvsheet.js clears the range in the spreadsheet and writes your updated key-value pairs back.

## Additional Features

- **No sheet name needed**: If you leave `sheetName` empty, kvsheet.js will default to the **first sheet** in your spreadsheet.
- **Custom columns**: If you want your key and value in columns C and D, just set `startX = 'C'`.
- **Versatile data storage**: All data is stored as strings, so store numbers, text, timestamps — Google Sheets will handle it gracefully.

## FAQ

**1. Do I have to share the spreadsheet with the service account?**  
Yes. The service account needs "Editor" permission to read and write your spreadsheet.

**2. What if I don’t want a `.env` file?**  
No problem. Pass all parameters directly to `createKeyValueStore({ ... })`. Using `.env` is optional.

**3. Can I store more rows than fit on the first 1,000 lines?**  
Sure. By default, kvsheet.js reads/writes `A1:B`. As long as there are enough rows in those columns, it’ll handle them. Google Sheets typically supports up to 10 million cells per spreadsheet.

**4. Is it safe to store private keys?**  
Keep `service_account.json` or your private key in a secure location (and in `.gitignore`). Avoid committing secrets to public repos.

## License

kvsheet.js is open-sourced under the **MIT License**, so feel free to use it, modify it, or distribute it in both commercial and personal projects.

---

## Ready to Get Started?

- Install with `npm install kvsheet.js`
- Set up your service account
- Start storing key-value data in just a couple lines of code!

Join the developers who save time with **kvsheet.js**. No more over-complication — keep your configs, counters, and lightweight data in a convenient Google Sheet!

> **Why complicate it?** Put your data in Google Sheets and manage it with ease!

We’d love your feedback — star us on GitHub, open an issue, or submit a PR.  
**Happy coding and enjoy your new spreadsheet-based data store!**

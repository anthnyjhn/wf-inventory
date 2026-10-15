# WF Inventory

A small internal stock tracker for vinyl rolls and sheet materials. It's built with Next.js and TypeScript, and stores everything in a single SQLite file.

- **Dashboard**: every material with its stock level and status (OK, Low, Out of stock, Over max). The warehouse manager can view it without a PIN.
- **Rolls (e.g. vinyl in metres)**: each box gets its own tag (`2572-001`, `ID5-004`, …). You can see how many sealed boxes are on the shelf, how many rolls are open, and how many metres are left on each one.
- **Quantity items (e.g. corflute, ACM, metal sheets)**: tracked as a simple count, with add, use and stock-take actions.
- **Min / max stock** per material. Anything below the minimum shows as Low. The **Reorder** page works out how much to order to get back to the maximum and has "copy" buttons for pasting a reorder list or a full stock count into an email.
- **Printable tags** with a QR code that opens the roll's page on a phone, plus a Code 128 barcode for handheld scanners (use the **Scan** page).
- **Roll page** (the page a scanned tag opens): asks for the PIN, then lets you subtract what you used, set the amount left, or tap **✓ Done – roll finished**. If "Done" was tapped by mistake, the roll can be reopened.
- **Custom measuring units**: add units in Settings. Pick _Per roll_ for things tracked per container and _Quantity_ for simple counts.
- Activity history for every change.

## Running it

Requires Node.js 20 or newer.

```bash
npm install
npm run build
npm start            # http://localhost:3000
```

For development, use `npm run dev`.

### Settings (environment variables)

| Variable        | Default              | Purpose                                                                                              |
| --------------- | -------------------- | ---------------------------------------------------------------------------------------------------- |
| `ADMIN_PIN`     | `1234`               | PIN used **on first start only**. Change it later in Settings.                                        |
| `APP_URL`       | (from the request)   | Address printed into QR codes, e.g. `http://192.168.1.50:3000`. **Set this** so phones can reach it. |
| `DATABASE_PATH` | `./data/inventory.db` | Where the SQLite file lives.                                                                         |
| `SESSION_HOURS` | `12`                 | How long a device stays unlocked after entering the PIN.                                             |
| `PORT`          | `3000`               | Port for `npm start`.                                                                                |

Example (Linux/macOS):

```bash
APP_URL=http://192.168.1.50:3000 ADMIN_PIN=4821 npm start
```

Windows (PowerShell):

```powershell
$env:APP_URL="http://192.168.1.50:3000"; $env:ADMIN_PIN="4821"; npm start
```

### Hosting on your local computer

1. Give the computer a fixed IP address on your network (a DHCP reservation in the router is easiest).
2. Allow port 3000 through the computer's firewall.
3. Start the app with `APP_URL` set to that address. Phones on the same Wi-Fi can then open `http://<ip>:3000`, and printed QR codes will work.
4. To keep it running after reboots, use [pm2](https://pm2.keymetrics.io/) (`npm i -g pm2`, `pm2 start npm --name wf-inventory -- start`, `pm2 save`), or a Windows scheduled task / Linux systemd service.

### Backups

All data lives in `data/inventory.db`. Copy that file (plus the `-wal`/`-shm` files next to it, if present) to back it up. To get a clean copy while the app is running, run `sqlite3 data/inventory.db ".backup backup.db"`.

## How stock is counted

- **Roll materials**: _Boxes on shelf_ is the number of sealed boxes, and min/max are measured in boxes. A material is **Out of stock** only when there are no sealed boxes _and_ no open rolls. Receiving boxes creates one tag per box. Opening a box (from its tag or with "Open next box") moves it to _Open rolls_.
- **Quantity materials**: min/max are measured in that unit (e.g. sheets).
- **Low** means below the minimum. **Reorder qty** = max − current (or min − current if no max is set).

## Typical workflow

1. **Add material**: enter the code (e.g. `2572`), name, unit, full roll length (e.g. 50 m), min/max, and how many boxes are on the shelf now.
2. **Print tags** from the material page and stick one on each box.
3. When a box is opened, scan its tag, enter the PIN, and tap **Open this box**.
4. After a job, scan the roll and enter what was used, or tap **Done** when it's empty.
5. Check the **Dashboard** or **Reorder** page, or send the warehouse manager the link.

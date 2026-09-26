# Fabry Tracker

Fabry Tracker helps people living with Fabry disease keep their lab results, treatments and symptoms in one place,
see how they change over time, and bring that picture to every visit with their care team.

Developed by Eric Wallace, MD (UAB Medicine), and Andrew Wallace.

## What's in this repository

| File | What it is |
| --- | --- |
| `index.html` | The whole app in one file. This is what GitHub Pages serves. |
| `manifest.webmanifest`, `icons/` | Let patients install the app on their phone's home screen. |
| `docs/terms-of-use.md` | The terms of use as a document, for legal review. |
| `sw.js` | Offline support: keeps a copy of the app on the phone. Rebuilt with every build. |
| `src/App.jsx` | The app's source code. |
| `src/main.jsx`, `src/storage.js` | Starts the app and saves data in the browser. |
| `build.mjs` | Rebuilds `index.html` from the source. |

## Publish it with GitHub Pages

1. Create a new repository on github.com, for example `fabry-tracker`.
2. Choose **Add file → Upload files**, drag in every file and folder from this package, and choose **Commit changes**.
3. Open **Settings → Pages**. Under **Build and deployment**, set **Source** to **Deploy from a branch**, the branch to
   **main**, and the folder to **/ (root)**. Choose **Save**.
4. After a minute or two the page shows your link, for example `https://your-username.github.io/fabry-tracker/`.

Upload `index.html`, `sw.js`, `manifest.webmanifest` and the `icons` folder together: the app runs from `index.html`
alone, but installing to the home screen and working offline need the other three. The remaining files let you or a
developer change the app later.

To share a link that opens in European units for new patients, add `?region=eu`, for example
`https://your-username.github.io/fabry-tracker/?region=eu`.

## After publishing, check the live sections

The Learn tab loads trials straight from ClinicalTrials.gov and articles from PubMed. Open the Learn tab on the
published site and confirm both lists appear. If either one shows "couldn't be loaded right now", the links under
it still take patients to the full list on ClinicalTrials.gov or PubMed, and everything else in the app works normally.

## Where patient data is kept

Everything a patient enters is saved only in their own browser on their own device. Nothing is sent to you, to
GitHub or to anyone else. The Learn tab sends only the chosen topic when it searches.

- Clearing the browser's data erases the record, so patients should use **Profile → Export backup** now and then.
- A different browser or device starts empty. Patients can move their record with **Export backup** and **Restore from a backup**.
- The page includes a content security policy that only allows it to contact ClinicalTrials.gov, PubMed and
  Google Fonts.

## Changing the app

The developers, app name and version are in the `APP_INFO` block near the top of `src/App.jsx`. After
editing any file in `src/`, rebuild `index.html`:

```bash
npm install
npm run build
```

Then upload the new `index.html`.

## On a phone

Fabry Tracker is laid out as a phone app: a bottom tab bar within thumb reach, a top bar that stays in place, and
room for notches and home indicators. Patients can install it from **Settings → Add to your home screen**:

- **Android (Chrome):** an **Install Fabry Tracker** button appears in Settings.
- **iPhone (Safari):** Share → **Add to Home Screen**. On iPhone, the installed app keeps its own copy of the record,
  separate from Safari, so patients should export a backup in Safari first and restore it in the installed app.
  Installing is worth it: Safari can clear data from websites that haven't been opened for a while, but it doesn't
  do that to installed apps.

After the first visit the app opens without an internet connection. Only the Learn tab's live lists need one.

## Terms of use

The first time anyone opens the app, before setup, they must read the terms of use, tick "I have read and agree",
and tap **Agree and continue**. The app records the version and the date and time of acceptance. Existing users see
it once on their next visit. Patients can reread the terms from **Settings** or the **Learn** tab.

The terms are a **draft for legal review**. The full text is in `docs/terms-of-use.md` and lives in the `TERMS` block of
`src/App.jsx`. After any change, raise `version` so every user is asked to accept the new terms.

## App tour

A 10-step guided tour runs once, the first time a patient reaches the main screen (new and existing patients alike).
It highlights the quick log, the charts, the treatment lines, each tab and Settings, and ends with an offer to explore
sample data. Patients can skip it at any time and replay it from **Settings → Show the tour**. The steps are
`TOUR_STEPS` in `src/App.jsx`.

## Region and units

Settings has a **United States / Europe** choice. The first guess comes from the phone's language setting (or a
`?region=` link), and patients confirm it on the setup screen. Results are always saved in U.S. units and converted
for display, entry and CSV export, so switching back and forth never changes saved data, and backups work in either region.

| Test | United States | Europe | Conversion |
| --- | --- | --- | --- |
| Creatinine | mg/dL | µmol/L | × 88.4 |
| UACR | mg/g (threshold 30) | mg/mmol (threshold 3) | ÷ 8.84 |
| UPCR | mg/g (threshold 150) | mg/mmol (threshold 15) | ÷ 8.84 |
| LDL cholesterol | mg/dL | mmol/L | ÷ 38.67 |
| Vitamin D | ng/mL (threshold 30) | nmol/L (threshold 75) | × 2.496 |
| Vitamin B12 | pg/mL (threshold 200) | pmol/L (threshold 148) | × 0.7378 |

Lyso-Gb3 (nmol/L), plasma Gb3 (µg/mL), troponin (ng/L), LV mass index (g/m²), septum (mm) and eGFR
(mL/min/1.73m²) use the same units in both regions. In Europe the Learn tab shows the Fabry International Network
instead of the U.S. organizations.

## Appearance

The gear at the top right opens Settings, where patients choose Light, Dark or Match device. Match device follows
the phone or computer's own setting. The choice is remembered.

## Medicines recognized by name

Typing a statin or SGLT2 inhibitor by generic or brand name files it under its class, with the dose kept, wherever
it's entered: as an "Other medicine," in the dose box of any non-Fabry class, or in records saved earlier.

- **Statins:** atorvastatin (Lipitor, Atorvaliq), rosuvastatin (Crestor, Ezallor), simvastatin (Zocor, FloLipid),
  pravastatin (Pravachol), lovastatin (Mevacor, Altoprev), fluvastatin (Lescol), pitavastatin (Livalo, Zypitamag),
  and the combinations Vytorin, Caduet and Roszet. They show on the LDL graph.
- **SGLT2 inhibitors:** dapagliflozin (Farxiga) and empagliflozin (Jardiance), and the combinations Xigduo, Qtern,
  Synjardy, Glyxambi and Trijardy. They show on the eGFR, UACR and UPCR graphs.

The list is `KNOWN_DRUGS` in `src/App.jsx`. Fabry therapies and clinical trial drugs are never reclassified.

## Medical calculations

- **eGFR, 18 and older:** CKD-EPI 2021, race-free.
- **eGFR, under 18:** bedside Schwartz, 0.413 × height (cm) ÷ creatinine (mg/dL). Height is required.
- Creatinine in µmol/L is converted at 88.4 µmol/L per mg/dL.
- The yearly eGFR change is a least-squares slope, shown once there are 3 or more results spanning at least a year.

Fabry Tracker helps patients keep track of their health. It does not give medical advice and is not a substitute
for care from their medical team.

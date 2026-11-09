# My Rare Disease Tracker

My Rare Disease Tracker (formerly Fabry Tracker) helps people living with a rare condition keep their lab results,
treatments and symptoms in one place, see how they change over time, and bring that picture to every visit with their care team.

Developed by Eric Wallace, MD (UAB Medicine), and Andrew Wallace.

## What's in this repository

| File | What it is |
| --- | --- |
| `index.html` | The whole app in one file. This is what GitHub Pages serves. |
| `manifest.webmanifest`, `icon-*.png`, `apple-touch-icon.png` | Let patients install the app on their phone's home screen. |
| `docs/terms-of-use.md` | The terms of use as a document, for legal review. |
| `terms.html` | The terms of use as a web page, for the Terms and Conditions URL on fhir.epic.com. Rebuilt with every build. |
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

Upload `index.html`, `sw.js`, `manifest.webmanifest` and the four icon images together: the app runs from `index.html`
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

## New name and logo (3.26)

The app is now **My Rare Disease Tracker**, in every language. The sign-in, setup and launch screens use the logo's
ribbon and colors (blue to teal on near-black), dark mode uses the logo's navy-black, and the phone icons are made from
the logo. Each condition's pages keep their own color. Saved records are untouched: the storage names didn't change.

## Clinical trial alerts (new in 3.25)

Each person can add a country (and, if they like, a city and state or their phone's location) under **Profile →
Clinical trial alerts**, or on the first setup screen. Every two weeks, the next time the app is opened, it downloads the
list of trials that are enrolling for that person's condition from ClinicalTrials.gov. Only the condition is sent. The
phone itself keeps the trials with a site in the person's country, finds the closest site, and shows new trials in a
banner on Trends and in **Learn → Trials enrolling near you**, with the trial's name, its ClinicalTrials.gov link and the
site's (or study's) contact. Alerts can be silenced in Profile or on the Learn tab. No country means no alerts. The
country, city and location are saved in the encrypted record, are included in backups, and are left out of copies shared
with family.

The web app can only check while it's open. A future App Store version could check in the background.

## Thoughts, Journal, Imagination (new in 3.25)

A journal tab (between Learn and Profile), also opened from the launch screen and from a button under the quick log.
Each entry is saved with its date and time and can hold text and up to six pictures (shrunk on the phone to save
space). The first time it opens it explains what it's for. Entries live in the person's encrypted record, are included in
backups and are left out of copies shared with family. Phones keep about 5 MB per site, so the app stops adding pictures
before the record gets too large.

The new screens are in English only for now: their text isn't in `lang/*.json` yet.

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

## Connecting a patient's Epic MyChart

Patients open **Settings → Connect your health record** (also on the Profile tab). A walkthrough explains what
connecting means, lets them choose their health system, tells them what to expect on the MyChart page, then signs
them in. After MyChart, they come back to a review screen and choose whether to add what was found.

How it works (SMART on FHIR, standalone patient launch):

- Sign-in uses PKCE and a random state check. The patient signs in on their health system's own page.
- The app asks for read-only access to the patient's details and lab results, downloads them straight to the phone,
  and never saves the access token. Each connection ends when the patient finishes.
- Labs are matched by LOINC code (lyso-Gb3 and Gb3 by name) and converted to the app's units. Results that aren't
  final or use unknown units are left out. Connecting again never adds the same result twice.
- Imported results are marked "From your health record" in the results list and the CSV export.
- It's offered in the United States only. The Europe setting hides it.

**To switch it on:** put the client ID from fhir.epic.com in `EPIC.clientId` near the connection code in `App.jsx`,
rebuild, and upload `index.html` and `sw.js`. Until then patients can read the steps, but the sign-in button explains
that the connection isn't switched on yet. For testing without rebuilding, a developer can set the browser's
localStorage key `fabry-tracker-dev-client-id` to the client ID.

**Health systems:** the picker lists `HEALTH_SYSTEMS` in `App.jsx`. It starts with Epic's test system. Add production
systems from Epic's published list of patient-access FHIR endpoints; the build automatically allows the page to
contact each one.

**Register with Epic using the app's exact address** (for example `https://yourname.github.io/fabry-tracker/`) as
both the redirect URI and the endpoint URI.

## Account, login, recovery code and Face ID (versions 3.4 to 3.6)

- Each phone has one account, kept only on that phone. The first time, the order is: create a username and password,
  save the recovery code, accept the terms of use, create the profile, then the tour. After that, users just log in.
- The health records (`fabry-tracker-v1`, `fabry-tracker-people`, `fabry-tracker-person-*`) are encrypted with AES-GCM
  using a random record key. That key is stored twice, each copy locked with a key made (PBKDF2-SHA256, 310,000 rounds)
  from the password or from the recovery code. Neither the password nor the code is stored. Settings such as appearance
  and region stay unencrypted. The code is in `src/vault.js` and `src/storage.js`.
- **I forgot my password:** the user enters their recovery code and chooses a new password; the record is unchanged.
  The code is shown once at sign-up with **Email it to myself** (opens the user's own email app with the code filled
  in; nothing goes through a server) and **Copy code**. Settings has **New recovery code** (needs the password; the old
  code stops working). If both are lost, **Erase and start over** is the last resort; a backup file can then be restored.
- Accounts made by version 3.4 are upgraded at their next login and shown their first recovery code.
- **Face ID / fingerprint (3.6):** Settings → **Turn on Face ID** (Android: "fingerprint or face unlock"). It makes a
  passkey on the phone (WebAuthn) and uses its PRF extension: after Face ID, the phone returns a secret that locks a third
  copy of the record key, so the record stays encrypted and nothing is sent anywhere. The login screen then shows
  **Log in with Face ID**; the password always works too. Needs iOS 18 or newer on iPhone, or a recent Chrome on
  Android. Phones that can't do it aren't offered it, or are told so. Changing the password doesn't turn it off.
- The app asks for the password every time it opens and locks itself after 10 minutes in the background
  (`AUTO_LOCK_MINUTES`). Five wrong passwords or recovery codes in a row mean a 30-second wait. Settings has
  **Log out**, **Change password** and **New recovery code**.
- Terms of use version 6 explains the account, password, recovery code and Face ID.

## Security additions (version 3.7)

- **Password rules** (`src/passwords.js`): at least 8 characters; refuses numbers only (like dates), simple patterns,
  the username, and common passwords or guessable words with numbers added (including "Fabry2026" and the condition
  names). A strength meter shows under every new password: account, change password, reset, backups and shared copies.
- **Locked backups:** Export backup asks for a backup password by default (AES-GCM, the same format as locked shared
  copies). Unlocking is optional, with a warning. Spreadsheets (CSV) can't be locked, so a warning comes first. Profile
  shows the last backup date (`fabry-tracker-last-backup`, dates only).
- **Backup reminder:** a "Keep your record safe" card on Trends once a record has 5 or more items and no backup in 60
  days; "Not now" puts it off for 30 days. On iPhone (not installed) it also suggests adding the app to the home screen.
- **Keep the data:** after login the app asks the browser to store the record persistently (`navigator.storage.persist`).
- **security.txt:** `build.mjs` writes `.well-known/security.txt` with the Contact us address and a one-year expiry.
  Rebuild at least once a year so it doesn't expire.
- **Dependencies:** `package-lock.json` pins the exact versions. Turn on Dependabot alerts in the repository's
  Settings, under Advanced Security, so GitHub warns about known problems in React, esbuild or Tailwind.

The Profile tab's family testing list is replaced by a short explanation of how the condition is inherited.

## Security review (version 3.24)

A review of the 3.23 beta (static reading of the code and live attack tests, `test_pentest.py`) found no way to read a
patient's record from outside the device. These hardening fixes were made:
- The app refuses to show inside another site's frame (clickjacking), since GitHub Pages can't send a
  `X-Frame-Options` header.
- CSV export neutralizes text that a spreadsheet would run as a formula (cells starting with `=`, `+`, `@`, a tab or a
  return; negative numbers are left alone).
- Backup and shared files: ids must be plain letters and digits, text fields are capped, files over 25 MB or with more
  than 20,000 results are refused, so a damaged or hostile file can't fill the phone's storage.
- A damaged language file (non-strings in the array) no longer breaks the page; such items are ignored.
- Recovery codes draw each character evenly (rejection sampling), removing a slight bias.

Already in place and verified: AES-GCM with a random record key wrapped by PBKDF2-SHA256 (310,000 rounds) from the
password and from the recovery code; nothing health-related in clear storage; CSP with script hashes only; no external
scripts; `no-referrer`; `noopener` on every outbound link; PKCE and `state` on the MyChart sign-in, with the token
never following a link to another server; weakened key-derivation settings in storage simply fail to open the record.
Known limits: the login try limit is on the device only (the real protection is the key derivation); the app locks
after 10 minutes in the background, not while it stays on screen.

## Fabry additions (versions 3.3 and 3.5)

- **Antibodies (3.9):** under "Fabry specific", an anti-drug antibody (ADA) titer chart and a neutralizing antibodies
  Yes/No chart. Titers are typed like 1/100 (1:100 or 100 also work), saved as the number after "1/", and charted on a
  log scale. Fabry therapies (enzyme replacement) are marked on both charts.
- **Palpitations (3.5):** a button in the daily quick log (one entry per day), charted as "Days with palpitations"
  under Heart.
- **Swelling (edema):** Mild / Moderate / Severe buttons in the quick log, one entry per day (a new tap replaces
  today's), with a "Swelling (edema) days" chart by month.
- **Linzess (linaclotide)** under "Stomach and bowel" treatments, marked on the stomach episode chart.
- **Heart:** Cardiac MRI T1 mapping (native T1, ms) and late gadolinium enhancement (Yes/No by scan date, shown as
  dots on a No/Yes axis). Fabry therapies are marked on both.

## App reviews

**Settings → Rate the app** (and **Rate the app** at the bottom of Learn) lets people give 1 to 5 stars and an optional
comment. Reviews are anonymous; only the stars, the comment and the app version are sent.

They go to a Google Form owned by rarediseasetracker@gmail.com, which collects them in a Google Sheet with a summary
(average stars, a bar chart and every comment). To connect it, put the form's ID and the three question numbers in
`APP_INFO.reviews` in `src/App.jsx`, taken from the form's pre-filled link:
`https://docs.google.com/forms/d/e/<formId>/viewform?usp=pp_url&entry.<rating>=5&entry.<comment>=x&entry.<version>=x`.
Until then, **Send review** opens an email to customerservice@myrarediseasetracker.com with the review filled in.

The app asks "Tell us what you think of the My Rare Disease Tracker." a week after first use, then every 6 weeks
(after a review or "Not now"), never during the terms, setup, tour or Epic sign-in. "Don't ask again" stops it.
The timings are `REVIEW_FIRST_DAYS` and `REVIEW_EVERY_DAYS` in `src/App.jsx`.

## Correcting and deleting (version 3.2)

- Every trend chart has **View table**: a list of date and value, newest first. The pencil corrects a value (or its
  date) and the trash can deletes it. Deleting asks "Are you sure you would like to delete this result?"; **No** goes back
  to the table. Deleting one value leaves the other results from that visit alone, and a new date moves only that value.
- The eGFR table lists creatinine (and height), so correcting the creatinine recalculates eGFR.
- Treatments and dose changes have **Edit**. Every delete in the app asks first and can be undone for a few seconds.
- **Remove sample data** (on Trends while the sample shows, and in Profile) removes only the sample and puts back the
  record from before it was loaded, plus anything entered while it was showing.
- A new profile starts empty (3.20): no results, treatments or symptoms. **Load sample data** adds sample results and
  treatments; **Remove sample data** removes all of them, including sample data saved by older versions.

## Alport hearing (versions 3.9 and 3.10)

A "Hearing (audiology)" group for Alport syndrome, focused on high frequencies, where Alport hearing loss usually
starts. The Add tab has a left/right grid for 4000 and 8000 Hz in dB HL (fields `hlL4000`, `hlL8000`, `hlR4000`,
`hlR8000`). Three charts, drawn like an audiogram with 0 dB at the top and a dashed line at 25 dB: the high-frequency
average (mean of 4000 and 8000 Hz) for each ear, and one chart per ear for 4000 and 8000 Hz. Left ear is blue and right
ear red, as on audiograms. One "Hearing tests" table corrects or deletes a whole test. The CSV includes each frequency
and the average.

Pain and fatigue (the quick-log scores and the "How you feel" chart) are left out for Alport syndrome and ADTKD (3.10).
A condition with nothing to quick-log has no quick log box, and the tour skips that step.

## Pompe additions (version 3.11)

- **Quick log:** shortness of breath from 1 to 10 (`scores` in the condition, saved as `sob`) and a daily morning
  headache Yes/No (event group `headache`, one answer per day).
- **Pompe specific:** anti-rhGAA antibody titer, typed like 1/100 and charted on a log scale.
- **Breathing:** FEV1 (% predicted), shortness of breath and morning headaches added next to FVC.
- **Heart (cardiac):** septum thickness (IVS) and LV mass index.
- Pompe enzyme replacement is marked on the antibody, breathing and heart charts; breathing support (like BiPAP) on the
  breathing charts.

## Alport and Gaucher additions (version 3.12)

- **Alport, Learn:** About Alport syndrome explains the X-linked, autosomal recessive and autosomal dominant forms.
- **Alport, Profile:** the inheritance card asks which type the diagnosis is before showing any inheritance pattern
  (`askTypeForInheritance`); the choice is saved as the profile's type and can be changed. The gene line matches the
  type (`geneByMode`).
- **Gaucher specific:** TRAP, ACE and CCL18 added next to lyso-Gb1 and chitotriosidase.
- **Hematology** (was "Blood counts"): PT, PTT and INR added to hemoglobin and platelets.
- **Bones:** DEXA lowest T-score (line at −2.5) and lowest Z-score (line at −2.0); negative values are allowed
  (metric `min`).

## Alström additions (version 3.13)

- **Liver:** AST and GGT next to ALT. **Heart:** LVEDD (mm) and LV mass index next to ejection fraction.
- **Hearing (audiology):** the same 4000 and 8000 Hz hearing section as Alport.
- **Breathing:** FVC and FEV1. **Thyroid:** TSH, free T4 and free T3 (free T3 in pg/mL, pmol/L in Europe).
- **Blood sugar and weight:** height and BMI. BMI is calculated from each weight with the height from the same date
  or the closest earlier one (`bmiPoints`); its table corrects the weight and height.

## Cystinosis additions (version 3.14)

- **Quick log:** light sensitivity (photophobia) Yes/No, one answer per day; tooth pain and bleeding gums, each once
  per day (event group option `perTypeDaily`).
- **Liver:** ALT, AST, GGT and alkaline phosphatase.
- **Vision:** ophthalmology appointment Yes/No (`eyeVisit`) with free-text recommendations (`eyeNotes`, metric kind
  `text`, up to 2000 characters), shown as a list of visits; plus the photophobia chart. Eye drops are marked on it.
- **Mouth and teeth:** monthly chart of tooth pain and bleeding gums.

## Primary hyperoxaluria additions (version 3.15)

- **Oxalate:** 24-hour urine volume (mL/day).
- **Kidney stones:** a procedures log (PCNL, ureteroscopy, shock wave lithotripsy, stent, nephrostomy, surgery, other),
  with the side and free-text notes (metric kinds `choice` and `text`), shown under the stone chart.
- Fix: restoring a backup or opening a shared copy now keeps free-text and choice fields (such as eye visit
  recommendations); 3.14 dropped them on import.

## Conditions (version 3)

Each profile tracks one condition, chosen on the first setup page (or when adding a family member) and changeable in
Profile. The condition decides the chart groups, the Add tab, the treatments list, the quick-log event buttons, the
Learn tab (about, trials, research, support organizations), the family testing notes, the sample data and the page color.

| Condition | Page color | Inheritance notes |
| --- | --- | --- |
| Fabry disease | Teal | X-linked |
| Cystinosis | Green (Cystinosis Research Network ribbon) | Autosomal recessive |
| X-linked hypophosphatemia (XLH) | Amber | X-linked |
| Alport syndrome | Indigo | By type: X-linked, recessive or dominant |
| Bardet-Biedl syndrome | Magenta | Autosomal recessive |
| HNF1B-related disease (MODY5, 17q12) | Olive | Autosomal dominant |
| Primary hyperoxaluria | Brown | Autosomal recessive |
| ADTKD (MUC1, UMOD, REN) | Red | Autosomal dominant |
| Alström syndrome | Orange | Autosomal recessive |
| Gaucher disease | Slate | Autosomal recessive |
| Pompe disease | Ocean blue | Autosomal recessive |
| Mucopolysaccharidosis (MPS) | Purple (MPS Awareness Day) | Recessive; MPS II X-linked recessive |

Every condition has its own color (`palette` in `src/conditions.js`, colors in `PALETTES`, each checked for readable text
in light and dark mode). The first setup page is blue and changes color as soon as a condition is picked.

Cystinosis also tracks TSH and free T4 (marked with levothyroxine), free carnitine (levocarnitine) and copper (copper tablets).

**Adding a condition:** everything about a condition lives in `src/conditions.js`. Add any new tests to
`METRICS_EXTRA` (with U.S. units, decimals and the Europe conversion), new medicines to `MEDS_EXTRA` and their chart
groups to `MED_GROUPS_EXTRA`, then add an entry to `CONDITIONS`. New tests can be mapped for Epic import in `LAB_MAP`
in `App.jsx`. The clinical content is a draft for review by the clinical team.

Records saved before version 3 have no condition and open as Fabry. Storage keys still start with `fabry-tracker-`
so existing records carry over.

## Family (version 2)

Everything stays on the phone. There are no accounts and no server.

- **Several people on one phone:** Profile → Family → **Add a family member**. Each person has a separate record
  (the first person keeps the original `fabry-tracker-v1` storage key; others use `fabry-tracker-person-<id>`).
  With two or more people, a switcher appears in the top bar. Health record imports go to whoever is open.
- **Share with a family member:** **Make a copy to share** creates a file the patient sends themselves (Share sheet,
  message, email or AirDrop). It can be locked with a password (AES-GCM, key from PBKDF2-SHA256, 310,000 rounds).
  The recipient uses **Open a shared record**. Each record has an ID, so a newer copy of a record already on the phone
  offers to update it instead of adding a duplicate. Copies don't sync by themselves.
- **Family testing:** a list of relatives grouped like a family tree, with pedigree-style symbols, test status,
  X-linked inheritance notes and a summary count. **Start a record for** turns a relative into a person on the phone,
  with sex and GLA variant filled in.
- Backups include the family list, and **Restore from a backup** also opens password-locked files.

Terms of use version 2 (September 29, 2026) adds section 4, "Sharing a copy with family", so every user is asked to
accept the terms again.

## Terms of use

The first time anyone opens the app, before setup, they must read the terms of use, tick "I have read and agree",
and tap **Agree and continue**. The app records the version and the date and time of acceptance. Existing users see
it once on their next visit. Patients can reread the terms from **Settings** or the **Learn** tab.

The terms are a **draft for legal review**. The full text is in `docs/terms-of-use.md` and lives in the `TERMS` block of
`src/App.jsx`. After any change, raise `version` so every user is asked to accept the new terms.

## App tour

An 18-step guided tour (3.18 added "Type results in any unit" on the Add page and "Choose your language and units" in Settings) runs once, the first time a patient reaches the main screen (new and existing patients alike).
It highlights the quick log, the charts, the treatment lines, the Add and Treatments tabs, then opens the Learn page
(about the condition, patient support, clinical trials, research) and the Profile page (details, adding a family
member, sharing a copy, backups and export), then Settings, and ends with an offer to explore sample data. Steps with a
`tab` open that page first; closing the tour returns to Trends. Patients can skip it at any time and replay it from **Settings → Show the tour**. The steps are
`TOUR_STEPS` in `src/App.jsx`.

## Region and units (updated in 3.16)

Settings has a **United States / Other countries** choice (saved as `us` / `eu`). The first guess comes from the
phone's language setting (U.S. and U.S. territories get U.S. units, every other country metric and SI units), or a
`?region=` link, and patients confirm it on the setup screen.

- **United States:** pounds, inches and U.S. lab units (mg/dL, mg/g, ng/mL).
- **Other countries:** kilograms, centimeters and SI lab units (µmol/L, mmol/L, mg/mmol, pmol/L).

Every result on the Add tab that has more than one common unit has a unit menu next to it, set to the region's unit.
A value typed in another unit is converted to the chart's unit when it's saved, and the box shows what it will be
saved as ("Saved as 101 mg/dL on your charts"). Results are stored in one base unit per test (height in cm, everything
else mostly U.S. units), so switching regions never changes saved data and backups work in either region.

The units are defined in `src/App.jsx`: `EU_UNITS` (other countries' defaults, with their own threshold lines),
`US_UNITS` (U.S. defaults that differ from the base unit, like inches) and `ALT_UNITS` (other units a result can be
typed in, such as µkat/L for liver enzymes, g/g for urine protein, ng/mL for troponin, or cystine instead of
half-cystine for white cell cystine). Thresholds without a set value for a unit are converted from the base unit.

## Languages (versions 3.17 and 3.18)

The app can be used in English, Spanish, French, German (3.18), Italian (3.23), Portuguese (Brazil), Simplified Chinese and Arabic. The language menu
is on the account screens (top right), at the top of the terms page before the terms (3.21), on the Create Profile page
(3.21) and in Settings. The Face ID section in Settings and the Face ID login button are translated too (3.22), and the phone's language is used the first time when it's one
of these. Arabic turns the page right to left; charts, numbers and dates inside them stay left to right.

How it works (`src/i18n.js`):
- The app is written in English. With another language on, every text on screen (and aria-labels, placeholders and
  titles) is looked up in `lang/xx.json` and swapped in place. Missing strings stay in English.
- `lang/keys.json` holds the English strings; each language file is an array of translations in the same order. The
  files load from the app's own site (CSP `connect-src 'self'`) and the service worker keeps a copy for offline use.
  Nothing goes to a translation service.
- Text with numbers, dates, people's names or condition names is matched as a template ("Pain {0}/{1} logged for
  today"). Dates are formatted for the language and, like names, marked with invisible U+2068/U+2069 characters so they
  become placeholders. Elements marked `data-no-translate` (typed notes, recovery codes, organization names) are left
  alone.
- The terms of use show a note that the English version is the official one.
- If the language files end up directly in the app's folder instead of `lang/` (easy to do with GitHub's upload page), the app finds them there too (3.19).

Adding or changing text: new English text simply shows in English until it's added to the files. To refresh them,
collect the strings (the crawl scripts used are described in the 3.17 release notes), add the new English keys to
`lang/keys.json` and their translations at the same positions in each language file. Translations were made with AI
and should be checked by native speakers, ideally with medical knowledge, before wide release.

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

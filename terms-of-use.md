# Fabry Tracker: Terms of use (draft for legal review)

Version 1, effective September 25, 2026

## In short

- Fabry Tracker is a personal record-keeping tool. It does not give medical advice, and it does not diagnose or treat any condition.
- You choose what to enter or import, and you are responsible for checking it. Charts and calculations, such as eGFR and unit conversions, can contain errors.
- Your record stays on your device. The developers do not receive, store or see it.
- If you connect a patient portal, you are asking your health system to send your results to this device.
- Always talk with your care team before making health decisions. In an emergency, call your local emergency number.
- You use the app at your own risk, and the developers' liability is limited as far as the law allows.

## 1. About these terms

These terms apply to your use of Fabry Tracker (the "app"). "We" and "us" mean the developers of the app, Eric Wallace, MD, and Andrew Wallace. By tapping "Agree and continue" or using the app, you agree to these terms. If you do not agree, do not use the app.

You must be 18 or older to accept these terms. A parent or legal guardian may use the app to keep a record for a child and accepts these terms on the child's behalf.

## 2. Not medical advice

The app is for personal record-keeping and general information only. It is not a substitute for professional medical advice, diagnosis or treatment. It has not been approved, cleared or certified as a medical device by any regulator.

Using the app does not create a doctor-patient relationship with us, including with any developer who is a physician. Do not start, stop or change any treatment based on the app. Do not delay seeking care because of anything you see in it.

Reference lines on charts are general guides and may not apply to you. Clinical trial listings and articles come from third parties, are written for many audiences, and are not recommendations or endorsements.

## 3. Your data and your responsibility

You decide what information to enter or import, and you are responsible for its accuracy. Check results against your original lab and imaging reports.

The app performs automated calculations, including kidney function (eGFR) estimates, unit conversions, medicine grouping and dose tracking. These can be wrong, incomplete or unsuitable for your situation.

Your record is stored only in the browser on your device. We do not collect, receive or store it. You are responsible for keeping your device secure and for making backups. Your record can be lost if you clear your browser's data, remove the app, or lose or change your device. Once you export or share a file, you are responsible for where it goes.

## 4. Connecting your patient portal

If the app offers a connection to your health system's patient portal (for example, one that uses Epic's FHIR interface), using it is your choice. You sign in directly with your health system, and you authorize it to send copies of your lab results and basic details to the app on your device. The connection only reads information. It does not change your medical record, and the information is not sent to us.

Your health system, Epic and other technology vendors are independent third parties. We do not control their systems, their availability or the accuracy of the information they send. Imported results may be incomplete, delayed or matched to the wrong test or unit, so review them before importing.

You can stop the connection at any time by removing the app's access in your patient portal's settings, and you can delete imported results from the app. Connecting does not make us part of your care team or a party to any agreement between you and your health system.

## 5. Other services

The app links to and retrieves information from other services, such as ClinicalTrials.gov, PubMed and patient organizations. When it searches these services it sends only the topic you choose, not your health information. Their own terms and privacy policies apply, and we are not responsible for their content or availability.

## 6. No warranties

The app is provided "as is" and "as available", without warranties of any kind, whether express or implied, including warranties of accuracy, reliability, fitness for a particular purpose, merchantability, non-infringement, or uninterrupted or error-free operation.

## 7. Limitation of liability

To the fullest extent permitted by law, we, and any institution we are affiliated with, will not be liable for any direct, indirect, incidental, special, consequential or punitive damages, or for any loss of data, health outcome, or decision made, arising out of or related to: your use of, or inability to use, the app; information you enter, import or export; any patient portal connection; or any third-party service or content. This applies even if we have been told such damages are possible.

Where liability cannot be excluded, it is limited to the amount you paid to use the app. The app is free.

## 8. Rights the law protects

Nothing in these terms excludes or limits liability that cannot be excluded or limited by law, such as liability for death or personal injury caused by negligence, or for fraud. Nothing in these terms affects rights you have as a consumer under the laws of your country, including in the European Union and the United Kingdom.

## 9. Changes

We may update the app, or stop offering it, at any time. If these terms change, the app will ask you to read and accept the new version before you continue.

---

This text is shown in the app exactly as above. It lives in the `TERMS` block of `src/App.jsx`. After any change, raise `version` so every user is asked to accept the new terms.

# Chrome Web Store privacy disclosure draft

Fill the Developer Dashboard privacy questionnaire using these answers.
Based on **actual v1.1.0 implementation**.

## Does your extension collect user data?

**Yes — limited and mostly local.** Optional remote anonymous Paper observations
only after explicit Global Learning consent.

## Data categories

| Category                     | Collected? | Where                   | Notes                                              |
| ---------------------------- | ---------- | ----------------------- | -------------------------------------------------- |
| Personally identifiable info | No         | —                       | No email/name/account identity                     |
| Health                       | No         | —                       |                                                    |
| Financial / payment          | No         | —                       | No real balances/holdings uploaded                 |
| Authentication               | No         | —                       | No passwords/OTP/cookies/tokens                    |
| Personal communications      | No         | —                       |                                                    |
| Location                     | No         | —                       |                                                    |
| Web history                  | No         | —                       | Only active supported trading page context         |
| User activity                | Limited    | Local + optional remote | Paper simulation activity; remote only if opted in |
| Website content              | Limited    | Local processing        | Public trading UI landmarks / market features      |

## Locally stored data

- preferences (locale, brain mode, risk, consent)
- Paper positions / trades / cycles
- performance aggregates derived from Paper
- contribution queue (opt-in only)

Storage: `chrome.storage` + IndexedDB.

## Remotely transmitted data (optional)

Only when consent = contribute:

- anonymous Paper observation schema (brainMode, presetVersion, brokerCategory,
  marketFeatures, brain drives, paper action/return, holding-duration bucket)
- optional random install ID for rate-limit only (not linked to broker accounts)

Destination: project Supabase (`sfimnzdjndmipmtlnniq`) via Edge Function.

Also optional: fetch published Global Calibration preset metadata.

## Purpose of data use

- operate Paper trading simulation and Fly overlay
- remember user settings/consent
- optional shared Global Calibration research (manual publish pipeline)

## User consent

First-run onboarding forces explicit choice:

- Share anonymous Paper results, **or**
- Keep Paper learning data on this device

No preselection. Continue disabled until the user chooses.
Consent can be changed later in settings.

## Selling / sharing

- **Not sold**
- **Not used for advertising**
- Not shared with data brokers
- Aggregated anonymous observations may be used offline to build candidate
  Global Calibration presets that are manually reviewed before publish

## Remote code / encryption

Use Chrome Web Store standard answers:

- no remote code execution of unreviewed scripts in the extension package
- HTTPS to Supabase when Global Learning is enabled

## Certification checklist (typical)

- [x] I do not sell or transfer user data to third parties outside approved use cases
- [x] I do not use or transfer user data for purposes unrelated to the item’s single purpose
- [x] I do not use or transfer user data to determine creditworthiness or for lending

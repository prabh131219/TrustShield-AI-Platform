# TrustShield AI

> **Verify identity before money is lost.**

TrustShield AI is a hackathon fraud-prevention prototype that analyses payment-related risk signals before a user completes an action.

Instead of only displaying a fraud warning, the platform can pause a suspicious action, initiate verification through a previously trusted identity, and generate a tamper-evident record of the final decision.

---

## Overview

Digital-payment scams often succeed because users act under urgency, fear, pressure, or misplaced trust.

Common examples include:

* Fake UPI or QR-code payments
* Phishing links
* Unknown receiver requests
* Family-emergency impersonation scams
* Fake vendor emails
* Vendor bank-detail-change fraud
* Urgent invoice and payment requests

TrustShield AI combines multiple risk signals and produces one clear outcome:

| Decision   | Meaning                           |
| ---------- | --------------------------------- |
| **TRUST**  | The action appears low-risk       |
| **VERIFY** | Identity confirmation is required |
| **STOP**   | High-risk signals were detected   |

---

## Core Idea

TrustShield AI follows a three-layer approach:

### 1. Detect

Analyse available signals such as:

* QR or UPI details
* Receiver identity
* Payment amount
* Suspicious messages
* Urgency or pressure language
* Suspicious URLs
* Recently changed payment details
* Trust Graph verification status

### 2. Challenge

When the result is **VERIFY** or **STOP**, the prototype activates the **Hold → Challenge** flow.

The system:

1. Pauses the simulated payment action
2. Ignores contact information from the suspicious message
3. Uses a previously verified identity from the Trust Graph
4. Starts a simulated callback or OTP challenge
5. Recalculates the final decision after verification

### 3. Prove

After the analysis, the system creates a **Decision Passport** containing:

* Original risk signals
* Risk score
* Original verdict
* Verification method
* Challenge result
* Final verdict
* SHA-256 hash
* Prototype ECDSA digital signature

The passport can be checked for tampering through the built-in integrity-verification feature.

---

## Key Features

### Fusion Risk Engine

A transparent rule-based engine combines multiple weak signals into one final decision.

Example risk contributions:

| Signal                            | Score |
| --------------------------------- | ----: |
| Unknown receiver                  |   +25 |
| Recently changed payment details  |   +30 |
| Urgency or pressure language      |   +20 |
| Money-related scam request        |   +10 |
| Suspicious URL                    |   +25 |
| Receiver missing from Trust Graph |   +25 |
| High payment amount               |   +10 |
| Verified trusted receiver         |   −30 |
| Successful previous verification  |   −20 |

Decision thresholds:

* **0–29:** TRUST
* **30–59:** VERIFY
* **60+:** STOP

The current prototype uses a transparent ruleset. It does not claim to be a trained fraud-detection AI model.

---

### Trust Graph

The Trust Graph stores previously verified relationships and payment identities, including:

* Family members
* Vendors and suppliers
* Companies
* Phone numbers
* Official email addresses
* UPI IDs
* Approved account references
* Verification history

Users can:

* Add trusted identities
* Select identity type
* Mark verification method
* View verified or unverified status
* Deactivate identities
* View relationships through a graph interface

The Trust Graph represents the project’s long-term moat: competitors may copy the interface, but they begin with zero verified identities and zero trusted relationships.

---

### QR and UPI Analysis

The prototype supports:

* Camera-based QR scanning
* QR image upload
* Manual UPI-ID entry
* Local UPI deep-link parsing

It can extract available information such as:

* UPI ID
* Receiver name
* Amount
* Payment note
* Raw QR payload

No real UPI payment is initiated.

---

### Message and URL Risk Analysis

Users can paste a suspicious payment message or URL.

The system checks for signals such as:

* Urgency
* Immediate payment pressure
* Processing-fee requests
* Gift-card requests
* Pay-now language
* Suspicious domains
* Unknown recipients
* Recently changed payment details

---

### Hold → Challenge

When verification is required, the prototype can:

* Pause the simulated action
* Select a stored trusted identity
* Generate a six-digit challenge code
* Simulate callback or OTP verification
* Record success, failure, or cancellation
* Recalculate the risk decision

A successful challenge may reduce the risk score.

A failed challenge forces the final decision to **STOP**.

---

### Decision Passport

Every completed analysis can generate a Decision Passport containing:

* Unique decision ID
* Date and time
* Receiver reference
* Payment amount
* Detected risk signals
* Original score
* Original decision
* Challenge result
* Final decision
* SHA-256 hash
* Prototype ECDSA P-256 signature

The application includes:

* Passport integrity verification
* Simulated tampering test
* JSON download
* Browser print or PDF export

The signature is a working prototype security mechanism, but it is not legally certified evidence.

---

### Dashboard

The dashboard displays real stored application data, including:

* Total scans
* TRUST decisions
* VERIFY decisions
* STOP decisions
* Recent decisions
* Verified identities
* Unverified identities
* Trust Graph summary

---

## Primary Demo Scenario

### Suspicious Vendor Bank-Detail Change

A known vendor sends an urgent request asking for payment to new account details.

The system detects:

* Recently changed payment details: **+30**
* Urgency or pressure language: **+20**

Initial result:

```text
Risk Score: 50
Decision: VERIFY
```

The system then runs the Hold → Challenge flow:

```text
VERIFY
   ↓
Simulated Payment Hold
   ↓
Trusted Callback Challenge
   ↓
Successful Verification
   ↓
Risk Recalculation
   ↓
TRUST
   ↓
Signed Decision Passport
```

After simulated passport tampering, the integrity check fails.

---

## Demo Scenarios

The project contains three one-click scenarios:

### Suspicious Vendor Change

Known vendor, urgent request, and recently changed payment details.

**Expected result:** VERIFY

### Safe Payment

Verified receiver, approved UPI ID, and no suspicious signals.

**Expected result:** TRUST

### High-Risk Scam

Unknown receiver, urgent money request, and suspicious URL.

**Expected result:** STOP

---

## Technology Stack

### Frontend

* React
* TypeScript
* Tailwind CSS
* Responsive mobile-first interface

### Database and Authentication

* Bolt Database
* Email and password authentication
* Owner-scoped database access
* Row-Level Security

### Security and Analysis

* Web Crypto API
* SHA-256 hashing
* ECDSA P-256 prototype signatures
* Transparent rule-based Fusion Engine

### Visualisation and QR Processing

* `jsQR`
* `react-force-graph-2d`

---

## Database Structure

The prototype uses four primary entities.

### TrustedIdentity

Stores verified people, vendors, companies, UPI IDs, contact details, and account references.

### SafetyScan

Stores payment inputs, detected signals, risk scores, and decisions.

### VerificationChallenge

Stores callback or OTP challenge details and results.

### DecisionPassport

Stores passport data, hashes, signatures, and integrity status.

---

## Real Prototype Components

The following components genuinely run inside the prototype:

* Authentication
* Database persistence
* QR image parsing
* Camera QR scanning
* UPI payload extraction
* Manual UPI input
* Message-risk analysis
* Basic URL-risk analysis
* Fusion Risk Engine
* TRUST, VERIFY, and STOP decisions
* Trust Graph CRUD operations
* Challenge generation
* Decision recalculation
* SHA-256 hashing
* Prototype ECDSA signing
* Passport integrity verification
* Tampering demonstration
* JSON download
* Browser print/PDF support

---

## Simulated Components

The following features are simulated for hackathon demonstration:

* Real payment blocking
* Actual UPI transactions
* Bank integration
* NPCI integration
* Real SMS delivery
* Real telephone callback
* eKYC integration
* Legally certified digital evidence

> **Hackathon prototype — no real payment, bank, SMS, call, or NPCI processing.**

---

## Getting Started

### Prerequisites

Install:

* Node.js 18 or later
* npm
* Git

### Link
https://trustshield-ai-fraud-1yuf.bolt.host
```

### Install Dependencies

```bash
npm install
```

### Configure the Database

Configure the required Bolt Database credentials and environment variables according to your project setup.

Do not upload private API keys, database secrets, or environment files to GitHub.

Add sensitive files to `.gitignore`, including:

```gitignore
.env
.env.local
.env.production
node_modules
dist
```

### Start Development Server

```bash
npm run dev
```

Open the local URL shown in the terminal.

### Run Type Checking

```bash
npm run typecheck
```

### Create Production Build

```bash
npm run build
```

---

## Recommended Demo Setup

Before presenting:

1. Create a demo account
2. Open the Trust Graph
3. Select **Seed Demo**
4. Confirm that sample identities are visible
5. Open **Scan & Analyse**
6. Select **Suspicious Vendor Change**
7. Run the Fusion Analysis
8. Start Hold → Challenge
9. Select Callback
10. Complete the displayed challenge
11. Generate the Decision Passport
12. Verify passport integrity
13. Simulate tampering
14. Verify integrity again

---

## Project Structure

```text
trustshield-ai/
├── src/
│   ├── components/
│   ├── contexts/
│   ├── lib/
│   ├── pages/
│   ├── types/
│   ├── App.tsx
│   └── main.tsx
├── public/
├── docs/
│   └── screenshots/
├── package.json
├── tsconfig.json
└── README.md
```

The exact structure may differ depending on the current project version.

---

## Future Roadmap

Potential future development includes:

* Bank-registered contact verification
* Real out-of-band callback infrastructure
* Enterprise vendor-verification workflows
* Organisation approval roles
* Bank and fintech API integrations
* Account Aggregator integrations through authorised partners
* eKYC-based identity verification
* Advanced phishing intelligence
* Behaviour-based fraud detection
* Enterprise audit dashboards
* Insurer and compliance integrations
* Institution-managed cryptographic signing keys

---

## Business Model

TrustShield AI follows a consumer-adoption and enterprise-revenue approach.

Potential revenue channels include:

* Business subscriptions
* Enterprise API licensing
* Per-verification pricing
* Bank and fintech partnerships
* Vendor-verification services
* Insurance partnerships
* Procurement and accounting integrations

The primary business opportunity is preventing vendor and bank-detail-change fraud for small and medium-sized organisations.

---

## Competitive Position

TrustShield AI does not claim that fraud-detection competitors do not exist.

Its core differentiation is:

> Most fraud tools stop after warning the user. TrustShield AI adds an active verification step before a risky action continues.

The project combines:

```text
Detection
   +
Trusted Identity Challenge
   +
Tamper-Evident Decision Proof
```

---

## Privacy and Security

* QR parsing is performed locally where possible
* No real banking credentials should be collected
* No UPI PIN should ever be requested
* Secrets must not be committed to GitHub
* Demo data should not contain real personal financial information
* Database access is restricted by user ownership
* Production deployment would require additional security audits and compliance review

---

## Limitations

* The Fusion Engine is rule-based, not machine learning
* Risk rules cannot detect every fraud pattern
* Callback and OTP delivery are simulated
* Digital-signature keys are generated in the browser
* The signature is not legally certified
* Camera scanning requires HTTPS or localhost
* Real financial integrations require authorised partnerships and compliance work

---

## Responsible Use

This project is intended for:

* Hackathon demonstration
* Education
* Research
* Fraud-prevention prototyping

It must not be represented as:

* A licensed bank
* A payment processor
* An NPCI-authorised UPI application
* A certified fraud-verification system
* A replacement for professional financial-security controls

---

## Contributors

* **Prabhjot Singh** — Project Concept, Product Design and Development
* Gunpreet Singh, Sejalpreet Kaur

---

## Acknowledgements

Built as a hackathon prototype using modern web technologies, transparent security logic, and trusted-identity verification concepts.

---

## License

This repository is currently shared for hackathon demonstration and portfolio purposes.

Unless a separate `LICENSE` file states otherwise, no permission is granted to copy, modify, distribute, or commercially reuse the project.

---

## Final Vision

> **TrustShield AI does not just detect fraud. It pauses risky actions, verifies identity through a trusted channel, and creates tamper-evident proof of the final decision.**

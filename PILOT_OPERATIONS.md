# CashJama Pilot Operations Guide

> **Version:** 1.0 (Pilot)  
> **Last Updated:** December 2024  
> **Status:** Dry Run / Testing Phase

---

## Table of Contents
1. [Overview](#overview)
2. [Roles in the System](#roles-in-the-system)
3. [How to Create a BC Agent Account](#how-to-create-a-bc-agent-account)
4. [How BC Agent Logs In](#how-bc-agent-logs-in)
5. [How Jobs Work](#how-jobs-work)
6. [OTP Codes for Pilot](#otp-codes-for-pilot)
7. [What is Real vs Mocked](#what-is-real-vs-mocked)
8. [What NOT to Do in Pilot](#what-not-to-do-in-pilot)
9. [Troubleshooting](#troubleshooting)

---

## Overview

CashJama is a doorstep cash deposit service. Users request cash pickup, and BC (Business Correspondent) Agents visit them to collect cash and deposit it into the user's bank account.

**This pilot is for testing the app flow only. No real money is involved.**

---

## Roles in the System

| Role | Who | What They Do |
|------|-----|--------------|
| **User** | Customer | Requests cash deposit, pays service fee |
| **BC Agent** | Field agent | Accepts jobs, visits customer, collects cash, deposits to bank |
| **Admin** | You (operator) | Creates BC accounts, monitors operations |

---

## How to Create a BC Agent Account

### Who Can Do This?
Only the Admin (you) can create BC Agent accounts.

### When to Do This?
Before a BC Agent needs to use the app for the first time.

### Steps:

**Step 1:** Open your computer terminal or any API tool (Postman, Insomnia, or browser)

**Step 2:** Run this command (replace with actual BC details):

```
curl -X POST "https://cash2bank.preview.emergentagent.com/api/admin/create-bc-agent?mobile=MOBILE_NUMBER&name=AGENT_NAME"
```

**Example:**
```
curl -X POST "https://cash2bank.preview.emergentagent.com/api/admin/create-bc-agent?mobile=9876543210&name=Ramesh%20Kumar"
```

> **Note:** Replace spaces in names with `%20` (e.g., "Ramesh Kumar" becomes "Ramesh%20Kumar")

**Step 3:** You will see a success message:
```json
{
  "success": true,
  "message": "BC agent created",
  "user_id": "some-id-here"
}
```

**Step 4:** Share these details with the BC Agent:
- Mobile number: (the one you used)
- Login OTP: **123456** (pilot bypass code)

---

## How BC Agent Logs In

### What BC Agent Needs:
- A smartphone with Expo Go app installed (download from Play Store/App Store)
- The QR code for the CashJama app (you provide this)
- Their registered mobile number
- OTP code: **123456**

### Steps for BC Agent:

1. **Open Expo Go app** on phone
2. **Scan the CashJama QR code** (provided by Admin)
3. App opens to login screen
4. **Enter mobile number** (the one Admin registered)
5. **Tap "Get OTP"**
6. **Enter OTP: 123456** (this is the pilot bypass code)
7. **Tap "Verify & Continue"**
8. BC Agent lands on their **Jobs Dashboard**

### What BC Agent Sees After Login:
- **Jobs tab:** Available jobs to accept, and their assigned jobs
- **Earnings tab:** Today's earnings and total earnings
- **Profile tab:** Their info and logout button

---

## How Jobs Work

### The Complete Job Flow:

```
USER creates deposit request
        ↓
Job appears in BC's "Available" list
        ↓
BC taps "Accept Job"
        ↓
BC receives a 4-digit Job OTP
        ↓
BC travels to customer location
        ↓
BC asks customer for OTP (shown on customer's app)
        ↓
BC enters OTP in their app (use 1234 for pilot)
        ↓
Job status changes to "In Progress"
        ↓
BC collects cash and deposits to bank
        ↓
BC taps "Complete Job"
        ↓
Earnings credited to BC
```

### For BC Agent - Accepting a Job:

1. Open **Jobs** tab
2. Look at **Available** section
3. See job card with:
   - Deposit amount (e.g., ₹2,500)
   - Service fee / BC earnings (e.g., ₹70)
   - Customer location
4. Tap **"Accept Job"**
5. A popup shows the **Job OTP** (e.g., 3953)
6. Job moves to **"My Jobs"** section

### For BC Agent - Completing a Job:

1. Travel to customer location (use Navigate button for directions)
2. Meet customer
3. Ask customer for their 4-digit OTP
4. In the app, enter OTP (or use **1234** for pilot testing)
5. Tap **"Verify"**
6. Collect cash from customer
7. Deposit cash to customer's bank (using BC banking device)
8. Return to app, tap **"Complete Job"**
9. Done! Earnings are recorded.

---

## OTP Codes for Pilot

### Login OTP (for all users):
| Purpose | OTP Code |
|---------|----------|
| User login | **123456** |
| BC Agent login | **123456** |

### Job Verification OTP:
| Purpose | OTP Code |
|---------|----------|
| BC verifying customer | **1234** |

> **Important:** These are pilot bypass codes. In production, real OTPs will be sent via SMS.

---

## What is Real vs Mocked

### ✅ REAL in Pilot:
| Feature | Status |
|---------|--------|
| User registration | Real (saved to database) |
| BC Agent registration | Real (saved to database) |
| Job creation | Real (saved to database) |
| Job assignment | Real |
| Job completion | Real |
| Earnings calculation | Real |
| Role-based app access | Real |

### ⚠️ MOCKED in Pilot:
| Feature | What Happens | Production Plan |
|---------|--------------|-----------------|
| SMS OTP | Uses bypass code 123456 | Will use MSG91 |
| Job OTP verification | Uses bypass code 1234 | Will use real OTP |
| GPS/Maps | Basic location only | Will use Google Maps |
| Live BC tracking | Not active | Will track BC location |
| Payment processing | Not connected | Bank integration |

---

## What NOT to Do in Pilot

### ❌ DO NOT:

1. **Use real money**
   - This is a test environment
   - No actual cash transactions

2. **Share bypass OTPs publicly**
   - 123456 and 1234 are for internal testing only
   - Do not share outside pilot team

3. **Create accounts for real customers**
   - Only use test accounts
   - Use test mobile numbers

4. **Expect SMS messages**
   - OTPs are not sent via SMS in pilot
   - Use the bypass codes

5. **Try to deploy to app stores**
   - This is a development build
   - Use Expo Go for testing

6. **Modify the backend URL**
   - App is configured for pilot server
   - Do not change .env files

7. **Give BC role to regular users**
   - BC accounts must be created by Admin only
   - Users cannot self-register as BC

---

## Troubleshooting

### BC Agent can't log in:
1. Verify mobile number was registered by Admin
2. Ensure using OTP: **123456**
3. Check internet connection

### Job OTP verification fails:
1. Use bypass OTP: **1234** for pilot
2. Ensure job is in "Assigned" status (not already completed)

### No jobs showing for BC:
1. Pull down to refresh the jobs list
2. Check if any users have created deposit requests
3. Jobs only appear when a user creates a request

### BC sees "Job not found":
1. The job may have been cancelled by user
2. Another BC may have already accepted it
3. Refresh the job list

### App shows blank screen:
1. Close and reopen Expo Go
2. Re-scan the QR code
3. Clear Expo Go app cache

---

## Quick Reference Card

```
┌─────────────────────────────────────────┐
│         PILOT QUICK REFERENCE           │
├─────────────────────────────────────────┤
│  LOGIN OTP (everyone):     123456       │
│  JOB VERIFY OTP:           1234         │
├─────────────────────────────────────────┤
│  Create BC Agent:                       │
│  curl -X POST "...api/admin/            │
│    create-bc-agent?mobile=XXX&name=YYY" │
├─────────────────────────────────────────┤
│  BC Login Steps:                        │
│  1. Open Expo Go                        │
│  2. Scan QR code                        │
│  3. Enter mobile → Get OTP              │
│  4. Enter 123456 → Verify               │
├─────────────────────────────────────────┤
│  Job Flow:                              │
│  Accept → Enter OTP 1234 → Complete     │
└─────────────────────────────────────────┘
```

---

## Contact & Support

For pilot issues, contact the development team.

**This document is for internal pilot use only.**

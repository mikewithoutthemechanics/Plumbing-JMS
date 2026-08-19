# STEVE-REVISION-18-08-26 – Notifications & Mobile Permissions Plan

## Current Branch
STEVE-REVISION-18-08-26 created from fix/security-and-schema-consistency

## Problems Identified

### 1. No notification system exists
Resend API key defined but never used. No email templates. No job-assigned triggers. punctualplumbers@agentmail.to not configured.

### 2. Mobile view only issue
Technician RLS allows updates but canAdvanceState restricts to owner. UI may hide actions on mobile.

### 3. Email sender
No from address set.

Proposed fixes: add Resend wrapper, Supabase trigger, fix permission helper.

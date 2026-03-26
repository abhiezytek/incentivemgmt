# Wave 4 Export & Payout Parity

## Export Eligibility
- Status = APPROVED
- persistency_gate_passed = TRUE
- Not held (no un-released HOLD adjustment)
- Matches Node.js exactly

## Oracle AP Export (POST /api/integration/export/oracle-financials)

| Column | Source | Format |
|---|---|---|
| OPERATING_UNIT | Hardcoded 'OU_INSURANCE' | String |
| SUPPLIER_NUMBER | agent_code | String |
| SUPPLIER_NAME | agent_name | String |
| INVOICE_NUMBER | INC-{programId}-{YYYYMM}-{agentCode} | String |
| INVOICE_DATE | Current date | DD-MON-YYYY |
| INVOICE_AMOUNT | total_incentive | Decimal |
| INVOICE_CURRENCY | 'MYR' | String |
| PAYMENT_TERMS | 'IMMEDIATE' | String |
| DESCRIPTION | Program name + period label | String |
| LINE_TYPE | 'ITEM' | String |
| LINE_AMOUNT | total_incentive | Decimal |
| ACCOUNT_CODE | '6100' | String |
| COST_CENTER | channel_name | String |

## SAP FICO Export (POST /api/integration/export/sap-fico)

| Column | Source | Format |
|---|---|---|
| VENDOR_CODE | agent_code | String |
| VENDOR_NAME | agent_name | String |
| PAYMENT_DATE | Current date | DD.MM.YYYY |
| INVOICE_AMOUNT | total_incentive | Decimal |
| COST_CENTER | channel_name | String |
| GL_ACCOUNT | '6100100' | String |
| PROFIT_CENTER | region_code | String |
| REFERENCE_DOC | INC-{programId}-{MMYYYY} | String |
| PAYMENT_METHOD | 'T' | String |
| CURRENCY | 'MYR' | String |
| COMPANY_CODE | '1000' | String |
| NARRATION | Program name + period | String |

## Status Transitions
- Export: APPROVED → INITIATED (via UPDATE after file generation)
- Initiate Payment: APPROVED → INITIATED + disbursement log entry
- Mark Paid: INITIATED → PAID (by ids or programId+periodStart)

## Disbursement Logging
- payout_disbursement_log entry created on initiate-payment
- Records: result_id, amount, initiated_by, initiated_at

## File Logging
- outbound_file_log entry created per export
- Records: filename, target_system, record_count, total_amount, generated_by

# Wave 4 Transaction Safety

## Critical Operations with Transaction Boundaries

### 1. Upload Batch Writes
- **Pattern**: BEGIN → bulk INSERT → COMMIT (or ROLLBACK on error)
- **Tables**: ins_policy_transactions, ins_agents, ins_persistency_data, ins_products, ins_incentive_rates, ins_performance
- **Behavior**: Entire batch rolls back on any row failure (matches Node.js)

### 2. Calculation Result Generation
- **Pattern**: UPSERT (INSERT ... ON CONFLICT DO UPDATE)
- **Table**: ins_incentive_results
- **Safety**: Single-row atomic operation per agent; no cross-agent transaction needed

### 3. Bulk Approve
- **Pattern**: UPDATE ... WHERE status = 'DRAFT' AND persistency_gate_passed = TRUE AND id = ANY(@ids)
- **Table**: ins_incentive_results (status field only)
- **Safety**: WHERE clause prevents double-approval; held results pre-filtered

### 4. Initiate Payment
- **Pattern**: UPDATE status → INSERT disbursement log (same connection)
- **Tables**: ins_incentive_results, payout_disbursement_log
- **Safety**: WHERE status = 'APPROVED' prevents re-initiation

### 5. Mark Paid
- **Pattern**: UPDATE ... WHERE status = 'INITIATED'
- **Table**: ins_incentive_results
- **Safety**: WHERE clause prevents marking non-initiated records

### 6. Export Generation
- **Pattern**: SELECT eligible → generate CSV → INSERT file log → UPDATE status
- **Tables**: ins_incentive_results, outbound_file_log
- **Safety**: Status transition only after successful file generation

### 7. Audit Writes
- **Pattern**: INSERT-only (append-only audit tables)
- **Tables**: incentive_review_actions, integration_audit_log, file_processing_log
- **Safety**: Never modified after creation

## Error Handling
- All repositories use try/catch with proper connection disposal
- ApiException thrown for business rule violations (matches Node.js error codes)
- Unhandled exceptions caught by ExceptionHandlerMiddleware → 500 with GEN_001

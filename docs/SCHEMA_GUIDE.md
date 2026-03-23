# Schema Quick-Reference Guide

> Use this file as a quick lookup for table structures when writing queries.
> All tables use `SERIAL PRIMARY KEY` for the `id` column.

---

## Core Tables (001_master_schema.sql)

### channels
| Column    | Type         | Notes                          |
| --------- | ------------ | ------------------------------ |
| id        | SERIAL PK    |                                |
| name      | VARCHAR(100) | NOT NULL                       |
| code      | VARCHAR(30)  | UNIQUE NOT NULL — AGENCY, BANCA, DIRECT |
| is_active | BOOLEAN      | DEFAULT TRUE                   |

### incentive_programs
| Column        | Type         | Notes                          |
| ------------- | ------------ | ------------------------------ |
| id            | SERIAL PK    |                                |
| name          | VARCHAR(150) | NOT NULL                       |
| description   | TEXT         |                                |
| channel_id    | INT          | FK → channels(id)              |
| plan_type     | VARCHAR(50)  |                                |
| start_date    | DATE         | NOT NULL                       |
| end_date      | DATE         | NOT NULL                       |
| calc_day_rule | VARCHAR(30)  | DEFAULT 'LAST_DAY_OF_MONTH'    |
| status        | VARCHAR(20)  | DEFAULT 'DRAFT'                |
| banner_url    | TEXT         |                                |
| created_by    | INT          |                                |
| created_at    | TIMESTAMP    | DEFAULT NOW()                  |

### user_groups
| Column     | Type         | Notes                         |
| ---------- | ------------ | ----------------------------- |
| id         | SERIAL PK    |                               |
| program_id | INT          | FK → incentive_programs(id)   |
| group_name | VARCHAR(100) |                               |
| group_type | VARCHAR(30)  | SINGLE, TEAM, CHANNEL         |

### group_members
| Column             | Type        | Notes                       |
| ------------------ | ----------- | --------------------------- |
| id                 | SERIAL PK   |                             |
| group_id           | INT         | FK → user_groups(id)        |
| user_id            | INT         | NOT NULL                    |
| role               | VARCHAR(20) | SELF, MANAGER, MEMBER       |
| reports_to_user_id | INT         | hierarchy linkage           |

### kpi_definitions
| Column           | Type         | Notes                         |
| ---------------- | ------------ | ----------------------------- |
| id               | SERIAL PK    |                               |
| program_id       | INT          | FK → incentive_programs(id)   |
| kpi_name         | VARCHAR(100) | NOT NULL                      |
| frequency        | VARCHAR(20)  | DEFAULT 'MONTHLY'             |
| is_positive      | BOOLEAN      | DEFAULT TRUE                  |
| breakdown_rule   | VARCHAR(50)  | DEFAULT 'FULL_MONTH'          |
| target_structure | VARCHAR(50)  | DEFAULT 'MONTHLY_TARGET'      |
| measurement_type | VARCHAR(30)  | DEFAULT 'PERCENTAGE'          |
| tracking_method  | VARCHAR(30)  | DEFAULT 'TARGET_BASED'        |
| output_display   | VARCHAR(30)  | DEFAULT 'NUMBER'              |
| sort_order       | INT          | DEFAULT 0                     |

### kpi_milestones
| Column             | Type         | Notes                         |
| ------------------ | ------------ | ----------------------------- |
| id                 | SERIAL PK    |                               |
| kpi_id             | INT          | FK → kpi_definitions(id)      |
| milestone_label    | VARCHAR(10)  | NOT NULL — M-1, M-2, M-3     |
| performance_driver | VARCHAR(100) |                               |
| function_type      | VARCHAR(50)  | LEFT_INCLUSIVE_BETWEEN, GTE   |
| range_from         | NUMERIC      |                               |
| range_to           | NUMERIC      |                               |
| sort_order         | INT          | DEFAULT 0                     |

### payout_rules
| Column               | Type         | Notes                         |
| -------------------- | ------------ | ----------------------------- |
| id                   | SERIAL PK    |                               |
| program_id           | INT          | FK → incentive_programs(id)   |
| rule_name            | VARCHAR(100) | NOT NULL                      |
| calc_type            | VARCHAR(30)  | VARIABLE, FIXED, PERCENTAGE   |
| variable_name        | VARCHAR(100) |                               |
| has_qualifying_rules | BOOLEAN      | DEFAULT FALSE                 |
| has_incentive_table  | BOOLEAN      | DEFAULT FALSE                 |
| is_active            | BOOLEAN      | DEFAULT TRUE                  |
| team_override_pct    | NUMERIC      | DEFAULT 0 (added by 002b)     |

### payout_slabs
| Column             | Type         | Notes                          |
| ------------------ | ------------ | ------------------------------ |
| id                 | SERIAL PK    |                                |
| payout_rule_id     | INT          | FK → payout_rules(id)          |
| slab_label         | VARCHAR(20)  |                                |
| kpi_id             | INT          | FK → kpi_definitions(id)       |
| milestone_label    | VARCHAR(10)  |                                |
| operator           | VARCHAR(20)  | GTE, LTE, BETWEEN, EQ          |
| value1             | NUMERIC      |                                |
| value2             | NUMERIC      |                                |
| incentive_operator | VARCHAR(30)  | MULTIPLY, FLAT, PERCENTAGE_OF  |
| tag_type           | VARCHAR(50)  |                                |
| parameter_name     | VARCHAR(100) |                                |
| weight_pct         | NUMERIC      | DEFAULT 100                    |
| payout_calc_type   | VARCHAR(50)  | HIGHEST_AMOUNT, PROPORTIONAL   |
| max_cap            | NUMERIC      |                                |
| sort_order         | INT          | DEFAULT 0                      |

### payout_qualifying_rules
| Column          | Type        | Notes                       |
| --------------- | ----------- | --------------------------- |
| id              | SERIAL PK   |                             |
| payout_rule_id  | INT         | FK → payout_rules(id)       |
| kpi_id          | INT         | FK → kpi_definitions(id)    |
| operator        | VARCHAR(20) |                             |
| threshold_value | NUMERIC     |                             |
| condition_join  | VARCHAR(5)  | DEFAULT 'AND' — AND, OR     |

### derived_variables
| Column     | Type         | Notes                                       |
| ---------- | ------------ | ------------------------------------------- |
| id         | SERIAL PK    |                                             |
| var_name   | VARCHAR(100) | NOT NULL UNIQUE                             |
| formula    | TEXT         | NOT NULL — e.g. '(collected / billed) * 100'|
| base_fields| JSONB        | e.g. ["collected","billed"]                 |
| status     | VARCHAR(20)  | DEFAULT 'IN_USE'                            |
| created_by | INT          |                                             |
| created_at | TIMESTAMP    | DEFAULT NOW()                               |

### performance_data
| Column         | Type        | Notes                          |
| -------------- | ----------- | ------------------------------ |
| id             | SERIAL PK   |                                |
| user_id        | INT         | NOT NULL                       |
| program_id     | INT         | FK → incentive_programs(id)    |
| kpi_id         | INT         | FK → kpi_definitions(id)       |
| period_start   | DATE        | NOT NULL                       |
| period_end     | DATE        | NOT NULL                       |
| target_value   | NUMERIC     | DEFAULT 0                      |
| achieved_value | NUMERIC     | DEFAULT 0                      |
| source         | VARCHAR(30) | DEFAULT 'UPLOAD'               |
| uploaded_at    | TIMESTAMP   | DEFAULT NOW()                  |

### incentive_results
| Column          | Type        | Notes                        |
| --------------- | ----------- | ---------------------------- |
| id              | SERIAL PK   |                              |
| user_id         | INT         | NOT NULL                     |
| program_id      | INT         | FK → incentive_programs(id)  |
| period_start    | DATE        |                              |
| period_end      | DATE        |                              |
| self_incentive  | NUMERIC     | DEFAULT 0                    |
| team_incentive  | NUMERIC     | DEFAULT 0                    |
| total_incentive | NUMERIC     | DEFAULT 0                    |
| calc_breakdown  | JSONB       | slab hit details             |
| status          | VARCHAR(30) | DEFAULT 'CALCULATED'         |
| calculated_at   | TIMESTAMP   | DEFAULT NOW()                |

### users
| Column        | Type         | Notes                         |
| ------------- | ------------ | ----------------------------- |
| id            | SERIAL PK    |                               |
| name          | VARCHAR(100) |                               |
| email         | VARCHAR(150) | UNIQUE NOT NULL               |
| password_hash | TEXT         | NOT NULL                      |
| role          | VARCHAR(30)  | DEFAULT 'AGENT'               |
| channel_id    | INT          | FK → channels(id)             |
| is_active     | BOOLEAN      | DEFAULT TRUE                  |

### user_sessions
| Column     | Type      | Notes                    |
| ---------- | --------- | ------------------------ |
| id         | SERIAL PK |                          |
| user_id    | INT       | FK → users(id)           |
| token      | TEXT      | NOT NULL (indexed)       |
| expires_at | TIMESTAMP | NOT NULL                 |
| created_at | TIMESTAMP | DEFAULT NOW()            |

---

## Insurance Tables (002_insurance_schema.sql)

### ins_products
| Column           | Type         | Notes                                      |
| ---------------- | ------------ | ------------------------------------------ |
| id               | SERIAL PK    |                                            |
| product_code     | VARCHAR(30)  | UNIQUE NOT NULL                            |
| product_name     | VARCHAR(150) | NOT NULL                                   |
| product_category | VARCHAR(50)  | ULIP, TERM, TRAD, ENDOWMENT, HEALTH, ANNUITY |
| product_type     | VARCHAR(30)  | LINKED, NON_LINKED, PROTECTION             |
| min_premium      | NUMERIC      | DEFAULT 0                                  |
| min_sum_assured  | NUMERIC      | DEFAULT 0                                  |
| min_policy_term  | INT          | DEFAULT 1 (years)                          |
| is_active        | BOOLEAN      | DEFAULT TRUE                               |

### ins_agents
| Column          | Type         | Notes                                |
| --------------- | ------------ | ------------------------------------ |
| id              | SERIAL PK    |                                      |
| user_id         | INT          | FK → users(id)                       |
| agent_code      | VARCHAR(30)  | UNIQUE NOT NULL                      |
| agent_name      | VARCHAR(150) |                                      |
| channel_id      | INT          | FK → channels(id)                    |
| region_id       | INT          |                                      |
| branch_code     | VARCHAR(20)  |                                      |
| license_number  | VARCHAR(50)  |                                      |
| license_expiry  | DATE         |                                      |
| activation_date | DATE         |                                      |
| status          | VARCHAR(20)  | DEFAULT 'ACTIVE'                     |
| parent_agent_id | INT          | FK → ins_agents(id) — MLM upline     |
| hierarchy_path  | TEXT         | materialized path e.g. '1.5.12.47'  |
| hierarchy_level | INT          | DEFAULT 1                            |
| created_at      | TIMESTAMP    | DEFAULT NOW()                        |

### ins_regions
| Column      | Type         | Notes                       |
| ----------- | ------------ | --------------------------- |
| id          | SERIAL PK    |                             |
| region_name | VARCHAR(100) | NOT NULL                    |
| region_code | VARCHAR(20)  | UNIQUE NOT NULL             |
| zone        | VARCHAR(50)  | NORTH, SOUTH, EAST, WEST    |

### ins_policy_transactions
| Column             | Type        | Notes                                     |
| ------------------ | ----------- | ----------------------------------------- |
| id                 | SERIAL PK   |                                           |
| policy_number      | VARCHAR(50) | NOT NULL                                  |
| agent_code         | VARCHAR(30) | FK → ins_agents(agent_code)               |
| product_code       | VARCHAR(30) | FK → ins_products(product_code)           |
| channel_id         | INT         | FK → channels(id)                         |
| region_id          | INT         | FK → ins_regions(id)                      |
| transaction_type   | VARCHAR(30) | NEW_BUSINESS, RENEWAL, LAPSE, REVIVAL, SURRENDER |
| policy_year        | INT         | 1=first year, 2+=renewal                  |
| premium_amount     | NUMERIC     | NOT NULL                                  |
| sum_assured        | NUMERIC     |                                           |
| annualized_premium | NUMERIC     | APE                                       |
| issue_date         | DATE        |                                           |
| due_date           | DATE        |                                           |
| paid_date          | DATE        |                                           |
| payment_mode       | VARCHAR(20) | ANNUAL, HALF_YEARLY, QUARTERLY, MONTHLY   |
| policy_status      | VARCHAR(20) | DEFAULT 'ACTIVE'                          |
| source_system      | VARCHAR(30) | POLICY_ADMIN, MANUAL                      |
| uploaded_at        | TIMESTAMP   | DEFAULT NOW()                             |

### ins_incentive_rates
| Column           | Type        | Notes                                     |
| ---------------- | ----------- | ----------------------------------------- |
| id               | SERIAL PK   |                                           |
| program_id       | INT         | FK → incentive_programs(id)               |
| product_code     | VARCHAR(30) | FK → ins_products(product_code)           |
| channel_id       | INT         | FK → channels(id)                         |
| policy_year      | INT         | DEFAULT 1 — 1=FYP, 2+=renewal            |
| transaction_type | VARCHAR(30) | NEW_BUSINESS, RENEWAL                     |
| rate_type        | VARCHAR(30) | PERCENTAGE_OF_PREMIUM, FLAT_PER_POLICY, PERCENTAGE_OF_APE |
| incentive_rate   | NUMERIC     | NOT NULL — e.g. 15 means 15%             |
| min_premium_slab | NUMERIC     | DEFAULT 0                                 |
| max_premium_slab | NUMERIC     | DEFAULT 999999999                         |
| min_policy_term  | INT         | DEFAULT 0                                 |
| max_policy_term  | INT         | DEFAULT 99                                |
| effective_from   | DATE        | NOT NULL                                  |
| effective_to     | DATE        |                                           |
| is_active        | BOOLEAN     | DEFAULT TRUE                              |

### ins_persistency_data
| Column            | Type        | Notes                              |
| ----------------- | ----------- | ---------------------------------- |
| id                | SERIAL PK   |                                    |
| agent_code        | VARCHAR(30) | FK → ins_agents(agent_code)        |
| program_id        | INT         | FK → incentive_programs(id)        |
| persistency_month | INT         | 13, 25, 37, 49, 61                |
| period_start      | DATE        |                                    |
| period_end        | DATE        |                                    |
| policies_due      | INT         | DEFAULT 0                          |
| policies_renewed  | INT         | DEFAULT 0                          |
| persistency_pct   | NUMERIC     | GENERATED ALWAYS AS (renewed/due)*100 STORED |
| calculated_at     | TIMESTAMP   | DEFAULT NOW()                      |

### ins_persistency_gates
| Column            | Type        | Notes                                 |
| ----------------- | ----------- | ------------------------------------- |
| id                | SERIAL PK   |                                       |
| program_id        | INT         | FK → incentive_programs(id)           |
| persistency_month | INT         | 13, 25, 37                            |
| channel_id        | INT         | FK → channels(id)                     |
| gate_type         | VARCHAR(30) | QUALIFYING_MINIMUM, BONUS_THRESHOLD, CLAWBACK_TRIGGER |
| threshold_pct     | NUMERIC     | e.g. 50 means >= 50%                 |
| consequence       | VARCHAR(50) | BLOCK_INCENTIVE, REDUCE_BY_PCT, CLAWBACK_PCT |
| consequence_value | NUMERIC     | reduction/clawback percentage         |

### ins_mlm_override_rates
| Column          | Type        | Notes                                     |
| --------------- | ----------- | ----------------------------------------- |
| id              | SERIAL PK   |                                           |
| program_id      | INT         | FK → incentive_programs(id)               |
| channel_id      | INT         | FK → channels(id)                         |
| hierarchy_level | INT         | NOT NULL — 1=direct, 2=upline's upline    |
| product_code    | VARCHAR(30) | NULL = all products                       |
| override_type   | VARCHAR(30) | PERCENTAGE_OF_DOWNLINE_INCENTIVE, FLAT_PER_POLICY |
| override_rate   | NUMERIC     | NOT NULL                                  |
| max_cap_amount  | NUMERIC     |                                           |
| effective_from  | DATE        |                                           |
| effective_to    | DATE        |                                           |
| is_active       | BOOLEAN     | DEFAULT TRUE                              |

### ins_agent_kpi_summary
| Column                    | Type        | Notes                               |
| ------------------------- | ----------- | ----------------------------------- |
| id                        | SERIAL PK   |                                     |
| agent_code                | VARCHAR(30) | FK → ins_agents(agent_code)         |
| program_id                | INT         | FK → incentive_programs(id)         |
| period_start              | DATE        |                                     |
| period_end                | DATE        |                                     |
| nb_policy_count           | INT         | DEFAULT 0                           |
| nb_total_premium          | NUMERIC     | DEFAULT 0                           |
| nb_total_ape              | NUMERIC     | DEFAULT 0                           |
| nb_sum_assured            | NUMERIC     | DEFAULT 0                           |
| nb_target_premium         | NUMERIC     | DEFAULT 0                           |
| nb_achievement_pct        | NUMERIC     | DEFAULT 0                           |
| nb_by_product             | JSONB       | {"ULIP":{"count":5,"premium":200000}} |
| renewal_premium_collected | NUMERIC     | DEFAULT 0                           |
| renewal_policies_due      | INT         | DEFAULT 0                           |
| collection_pct            | NUMERIC     | DEFAULT 0                           |
| persistency_13m           | NUMERIC     | DEFAULT 0                           |
| persistency_25m           | NUMERIC     | DEFAULT 0                           |
| persistency_37m           | NUMERIC     | DEFAULT 0                           |
| ulip_premium              | NUMERIC     | DEFAULT 0                           |
| trad_premium              | NUMERIC     | DEFAULT 0                           |
| term_premium              | NUMERIC     | DEFAULT 0                           |
| team_nb_premium           | NUMERIC     | DEFAULT 0                           |
| team_policy_count         | INT         | DEFAULT 0                           |
| team_achievement_pct      | NUMERIC     | DEFAULT 0                           |
| nb_score                  | NUMERIC     | DEFAULT 0                           |
| persistency_score         | NUMERIC     | DEFAULT 0                           |
| total_score               | NUMERIC     | DEFAULT 0                           |
| is_computed               | BOOLEAN     | DEFAULT FALSE                       |
| computed_at               | TIMESTAMP   |                                     |

**Unique constraint:** `(agent_code, program_id, period_start)`

### ins_incentive_results
| Column                  | Type        | Notes                            |
| ----------------------- | ----------- | -------------------------------- |
| id                      | SERIAL PK   |                                  |
| agent_code              | VARCHAR(30) | FK → ins_agents(agent_code)      |
| program_id              | INT         | FK → incentive_programs(id)      |
| period_start            | DATE        |                                  |
| period_end              | DATE        |                                  |
| nb_incentive            | NUMERIC     | DEFAULT 0 — new business         |
| renewal_incentive       | NUMERIC     | DEFAULT 0                        |
| product_bonus           | NUMERIC     | DEFAULT 0                        |
| persistency_bonus       | NUMERIC     | DEFAULT 0                        |
| clawback_amount         | NUMERIC     | DEFAULT 0 — negative adjustment  |
| net_self_incentive      | NUMERIC     | DEFAULT 0 — nb+renewal+bonus-clawback |
| l1_override             | NUMERIC     | DEFAULT 0 — from direct reportees |
| l2_override             | NUMERIC     | DEFAULT 0                        |
| l3_override             | NUMERIC     | DEFAULT 0                        |
| total_override          | NUMERIC     | DEFAULT 0                        |
| total_incentive         | NUMERIC     | DEFAULT 0 — net_self + total_override |
| persistency_gate_passed | BOOLEAN     | DEFAULT TRUE                     |
| qualifying_rules_passed | BOOLEAN     | DEFAULT TRUE                     |
| disqualification_reason | TEXT        |                                  |
| calc_breakdown          | JSONB       | full detailed breakdown          |
| status                  | VARCHAR(30) | DEFAULT 'DRAFT' — DRAFT/APPROVED/PAID |
| calculated_at           | TIMESTAMP   | DEFAULT NOW()                    |
| approved_by             | INT         |                                  |
| approved_at             | TIMESTAMP   |                                  |

**Unique constraint:** `(agent_code, program_id, period_start)`

---

## Audit Table (003_payout_disbursement_log.sql)

### payout_disbursement_log
| Column            | Type         | Notes                              |
| ----------------- | ------------ | ---------------------------------- |
| id                | SERIAL PK    |                                    |
| result_id         | INT          | NOT NULL FK → ins_incentive_results(id) |
| paid_at           | TIMESTAMP    | NOT NULL DEFAULT NOW()             |
| paid_by           | INT          |                                    |
| payment_reference | VARCHAR(100) |                                    |
| remarks           | TEXT         |                                    |

**Index:** `idx_disbursement_log_result` on `result_id`

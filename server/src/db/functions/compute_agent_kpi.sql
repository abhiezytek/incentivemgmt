CREATE OR REPLACE FUNCTION compute_agent_kpi(
  p_agent_code  VARCHAR,
  p_program_id  INT,
  p_start       DATE,
  p_end         DATE
) RETURNS VOID AS $$
BEGIN
  INSERT INTO ins_agent_kpi_summary (
    agent_code, program_id, period_start, period_end,
    nb_policy_count, nb_total_premium, nb_total_ape,
    nb_by_product, renewal_premium_collected, renewal_policies_due,
    collection_pct, ulip_premium, trad_premium, term_premium,
    is_computed, computed_at
  )
  SELECT
    p_agent_code, p_program_id, p_start, p_end,

    -- New Business counts
    COUNT(*) FILTER (WHERE transaction_type = 'NEW_BUSINESS'),
    SUM(premium_amount) FILTER (WHERE transaction_type = 'NEW_BUSINESS'),
    SUM(annualized_premium) FILTER (WHERE transaction_type = 'NEW_BUSINESS'),

    -- Product-wise NB breakdown as JSONB
    jsonb_object_agg(
      p.product_code,
      jsonb_build_object(
        'count', COUNT(*) FILTER (WHERE t.transaction_type='NEW_BUSINESS'),
        'premium', SUM(t.premium_amount) FILTER (WHERE t.transaction_type='NEW_BUSINESS'),
        'ape', SUM(t.annualized_premium) FILTER (WHERE t.transaction_type='NEW_BUSINESS')
      )
    ) FILTER (WHERE transaction_type = 'NEW_BUSINESS'),

    -- Renewal
    SUM(premium_amount) FILTER (WHERE transaction_type = 'RENEWAL'),
    COUNT(*) FILTER (WHERE transaction_type = 'RENEWAL'
                     AND due_date BETWEEN p_start AND p_end),

    -- Collection %
    CASE WHEN COUNT(*) FILTER (WHERE transaction_type='RENEWAL'
                                AND due_date BETWEEN p_start AND p_end) > 0
         THEN (COUNT(*) FILTER (WHERE transaction_type='RENEWAL' AND paid_date IS NOT NULL)
               ::NUMERIC /
               COUNT(*) FILTER (WHERE transaction_type='RENEWAL'
                                 AND due_date BETWEEN p_start AND p_end)) * 100
         ELSE 0 END,

    -- Product-type splits
    SUM(premium_amount) FILTER (WHERE transaction_type='NEW_BUSINESS'
                                 AND p.product_category = 'ULIP'),
    SUM(premium_amount) FILTER (WHERE transaction_type='NEW_BUSINESS'
                                 AND p.product_category = 'TRAD'),
    SUM(premium_amount) FILTER (WHERE transaction_type='NEW_BUSINESS'
                                 AND p.product_category = 'TERM'),
    TRUE, NOW()

  FROM ins_policy_transactions t
  JOIN ins_products p ON p.product_code = t.product_code
  WHERE t.agent_code = p_agent_code
    AND t.paid_date BETWEEN p_start AND p_end

  ON CONFLICT (agent_code, program_id, period_start)
  DO UPDATE SET
    nb_policy_count = EXCLUDED.nb_policy_count,
    nb_total_premium = EXCLUDED.nb_total_premium,
    nb_total_ape = EXCLUDED.nb_total_ape,
    nb_by_product = EXCLUDED.nb_by_product,
    renewal_premium_collected = EXCLUDED.renewal_premium_collected,
    collection_pct = EXCLUDED.collection_pct,
    ulip_premium = EXCLUDED.ulip_premium,
    trad_premium = EXCLUDED.trad_premium,
    term_premium = EXCLUDED.term_premium,
    computed_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────
-- MASTER SEED DATA
-- Realistic insurance dummy data for end-to-end testing
-- ─────────────────────────────────────────────

-- CHANNELS
INSERT INTO channels (name, code, is_active) VALUES
('Agency',         'AGENCY', true),
('Bancassurance',  'BANCA',  true),
('Direct',         'DIRECT', true),
('Broker',         'BROKER', true);

-- REGIONS
INSERT INTO ins_regions (region_name, region_code, zone) VALUES
('Mumbai West',    'MUM-W',  'WEST'),
('Mumbai East',    'MUM-E',  'WEST'),
('Pune',           'PUNE',   'WEST'),
('Delhi NCR',      'DEL-NCR','NORTH'),
('Chandigarh',     'CHD',    'NORTH'),
('Bangalore',      'BLR',    'SOUTH'),
('Chennai',        'CHN',    'SOUTH'),
('Hyderabad',      'HYD',    'SOUTH'),
('Kolkata',        'KOL',    'EAST'),
('Bhubaneswar',    'BHU',    'EAST');

-- PRODUCTS
INSERT INTO ins_products
(product_code, product_name, product_category, product_type,
 min_premium, min_sum_assured, min_policy_term, is_active) VALUES
('ULIP-GROW',   'ULIP Growth Fund',           'ULIP',       'LINKED',     10000,  100000,  5,  true),
('ULIP-PROT',   'ULIP Protector Plan',        'ULIP',       'LINKED',     15000,  150000,  10, true),
('TERM-PURE',   'Pure Term Plan',             'TERM',       'PROTECTION', 5000,   500000,  10, true),
('TERM-RET',    'Term with Return Premium',   'TERM',       'PROTECTION', 8000,   500000,  15, true),
('TRAD-ENDT',   'Traditional Endowment',      'TRAD',       'NON_LINKED', 12000,  150000,  12, true),
('TRAD-MONEYB', 'Money Back Plan',            'TRAD',       'NON_LINKED', 15000,  200000,  20, true),
('HEALTH-IND',  'Individual Health Plan',     'HEALTH',     'NON_LINKED', 8000,   300000,  1,  true),
('HEALTH-FAM',  'Family Floater Health Plan', 'HEALTH',     'NON_LINKED', 12000,  500000,  1,  true),
('ANNUITY-IM',  'Immediate Annuity Plan',     'ANNUITY',    'NON_LINKED', 100000, 0,       1,  true),
('PENSION-DEF', 'Deferred Pension Plan',      'PENSION',    'LINKED',     24000,  0,       10, true);

-- USERS (admin + finance + operations)
INSERT INTO users
(name, email, password_hash, role, is_active) VALUES
('Rajesh Kumar',    'rajesh@insure.com',    '$2b$10$hashedpw1', 'ADMIN',    true),
('Priya Nair',      'priya@insure.com',     '$2b$10$hashedpw2', 'ADMIN',    true),
('Suresh Finance',  'suresh@insure.com',    '$2b$10$hashedpw3', 'FINANCE',  true),
('Meena Ops',       'meena@insure.com',     '$2b$10$hashedpw4', 'OPS',      true),
('Arjun Manager',   'arjun@insure.com',     '$2b$10$hashedpw5', 'MANAGER',  true);

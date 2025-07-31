-- Setup default supplier for order creation
-- This ensures there's always a supplier with ID 1 for manual entries

-- Insert a default supplier if it doesn't exist
INSERT IGNORE INTO supplier (id, user_id, name, product, category, price, contact, email, returnPolicy, status, comments)
VALUES (
    1,
    1, -- Assuming user ID 1 exists, adjust as needed
    'Manual Entry',
    'Various',
    'General',
    0.00,
    '0000000000',
    'manual@example.com',
    'Standard',
    'active',
    'Default supplier for manual order entries'
);

-- Ensure the supplier table has an ID 1 entry
-- If you need to check existing suppliers:
-- SELECT * FROM supplier LIMIT 5;

-- Also ensure the value column exists in orders table
-- If you need to add the value column to orders table, uncomment below:
-- ALTER TABLE orders ADD COLUMN value DECIMAL(10,2) DEFAULT 0.00;

-- If you need to make supplier_id nullable, uncomment below:
-- ALTER TABLE orders MODIFY COLUMN supplier_id INT NULL;

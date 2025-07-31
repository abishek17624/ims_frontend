-- billing.model.sql
-- Creates the billing table for storing sales transactions

CREATE TABLE IF NOT EXISTS billing (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id VARCHAR(50) NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(15),
    created_date DATE NOT NULL,
    order_no VARCHAR(20) NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    product_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    unit VARCHAR(20) NOT NULL DEFAULT 'Units',
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0.00,
    total DECIMAL(10,2) NOT NULL,
    total_qty INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_customer_name (customer_name),
    INDEX idx_created_date (created_date),
    INDEX idx_product_id (product_id)
);

-- Sample data insertion (optional - remove in production)
-- INSERT INTO billing (transaction_id, customer_name, created_date, order_no, product_id, product_name, category, unit, quantity, price, discount, total, total_qty, total_amount) 
-- VALUES ('TRX-001', 'John Doe', '2024-01-15', 'ORD001', 'PROD001', 'Sample Product', 'Electronics', 'Units', 2, 100.00, 10.00, 190.00, 2, 190.00);

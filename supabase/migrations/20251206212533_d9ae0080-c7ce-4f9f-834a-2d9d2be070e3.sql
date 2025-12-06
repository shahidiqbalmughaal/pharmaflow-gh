-- Create validation function for medicines table
CREATE OR REPLACE FUNCTION validate_medicine_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate prices are positive
  IF NEW.purchase_price <= 0 THEN
    RAISE EXCEPTION 'Purchase price must be positive';
  END IF;
  
  IF NEW.selling_price <= 0 THEN
    RAISE EXCEPTION 'Selling price must be positive';
  END IF;
  
  -- Validate quantity is non-negative
  IF NEW.quantity < 0 THEN
    RAISE EXCEPTION 'Quantity cannot be negative';
  END IF;
  
  -- Validate string lengths
  IF LENGTH(NEW.medicine_name) > 500 THEN
    RAISE EXCEPTION 'Medicine name too long (max 500 characters)';
  END IF;
  
  IF LENGTH(NEW.batch_no) > 100 THEN
    RAISE EXCEPTION 'Batch number too long (max 100 characters)';
  END IF;
  
  -- Validate dates
  IF NEW.manufacturing_date > NEW.expiry_date THEN
    RAISE EXCEPTION 'Manufacturing date must be before expiry date';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for medicines
DROP TRIGGER IF EXISTS validate_medicine_before_insert ON medicines;
CREATE TRIGGER validate_medicine_before_insert
  BEFORE INSERT OR UPDATE ON medicines
  FOR EACH ROW
  EXECUTE FUNCTION validate_medicine_data();

-- Create validation function for cosmetics table
CREATE OR REPLACE FUNCTION validate_cosmetic_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate prices are positive
  IF NEW.purchase_price <= 0 THEN
    RAISE EXCEPTION 'Purchase price must be positive';
  END IF;
  
  IF NEW.selling_price <= 0 THEN
    RAISE EXCEPTION 'Selling price must be positive';
  END IF;
  
  -- Validate quantity is non-negative
  IF NEW.quantity < 0 THEN
    RAISE EXCEPTION 'Quantity cannot be negative';
  END IF;
  
  -- Validate string lengths
  IF LENGTH(NEW.product_name) > 500 THEN
    RAISE EXCEPTION 'Product name too long (max 500 characters)';
  END IF;
  
  IF LENGTH(NEW.batch_no) > 100 THEN
    RAISE EXCEPTION 'Batch number too long (max 100 characters)';
  END IF;
  
  -- Validate dates
  IF NEW.manufacturing_date > NEW.expiry_date THEN
    RAISE EXCEPTION 'Manufacturing date must be before expiry date';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for cosmetics
DROP TRIGGER IF EXISTS validate_cosmetic_before_insert ON cosmetics;
CREATE TRIGGER validate_cosmetic_before_insert
  BEFORE INSERT OR UPDATE ON cosmetics
  FOR EACH ROW
  EXECUTE FUNCTION validate_cosmetic_data();

-- Create validation function for expenses table
CREATE OR REPLACE FUNCTION validate_expense_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate amount is positive
  IF NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Expense amount must be positive';
  END IF;
  
  -- Validate notes length if provided
  IF NEW.notes IS NOT NULL AND LENGTH(NEW.notes) > 1000 THEN
    RAISE EXCEPTION 'Notes too long (max 1000 characters)';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for expenses
DROP TRIGGER IF EXISTS validate_expense_before_insert ON expenses;
CREATE TRIGGER validate_expense_before_insert
  BEFORE INSERT OR UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION validate_expense_data();

-- Create validation function for customers table
CREATE OR REPLACE FUNCTION validate_customer_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate name length
  IF LENGTH(NEW.name) > 200 THEN
    RAISE EXCEPTION 'Customer name too long (max 200 characters)';
  END IF;
  
  -- Validate phone length
  IF LENGTH(NEW.phone) > 20 THEN
    RAISE EXCEPTION 'Phone number too long (max 20 characters)';
  END IF;
  
  -- Validate email format if provided
  IF NEW.email IS NOT NULL AND NEW.email != '' THEN
    IF NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
      RAISE EXCEPTION 'Invalid email format';
    END IF;
  END IF;
  
  -- Validate loyalty points are non-negative
  IF NEW.loyalty_points < 0 THEN
    RAISE EXCEPTION 'Loyalty points cannot be negative';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for customers
DROP TRIGGER IF EXISTS validate_customer_before_insert ON customers;
CREATE TRIGGER validate_customer_before_insert
  BEFORE INSERT OR UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION validate_customer_data();

-- Create validation function for sale_items table
CREATE OR REPLACE FUNCTION validate_sale_item_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate quantity is positive
  IF NEW.quantity <= 0 THEN
    RAISE EXCEPTION 'Sale quantity must be positive';
  END IF;
  
  -- Validate prices are non-negative
  IF NEW.unit_price < 0 THEN
    RAISE EXCEPTION 'Unit price cannot be negative';
  END IF;
  
  IF NEW.total_price < 0 THEN
    RAISE EXCEPTION 'Total price cannot be negative';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for sale_items
DROP TRIGGER IF EXISTS validate_sale_item_before_insert ON sale_items;
CREATE TRIGGER validate_sale_item_before_insert
  BEFORE INSERT OR UPDATE ON sale_items
  FOR EACH ROW
  EXECUTE FUNCTION validate_sale_item_data();
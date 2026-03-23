# import_all_data.py
import pandas as pd
from supabase import create_client, Client
import os
from dotenv import load_dotenv
from datetime import datetime

# ─────────────────────────────────────────────────────────────
# LOAD ENVIRONMENT VARIABLES
# ─────────────────────────────────────────────────────────────
load_dotenv('.env.local')

SUPABASE_URL = os.getenv('VITE_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('VITE_SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: Missing Supabase credentials in .env.local")
    exit(1)

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
print(f"✅ Connected to Supabase: {SUPABASE_URL[:50]}...")

# ─────────────────────────────────────────────────────────────
# HELPER: UPSERT DATA (INSERT OR UPDATE)
# ─────────────────────────────────────────────────────────────
def upsert_data(table_name, data, conflict_column='id'):
    """
    Insert new records or update existing ones based on conflict_column.
    Returns (success_count, error_count)
    """
    if not data:
        return 0, 0
    
    success_count = 0
    error_count = 0
    
    for record in data:
        try:
            # Upsert: Insert if not exists, Update if exists
            result = supabase.table(table_name).upsert(record, on_conflict=conflict_column).execute()
            success_count += 1
        except Exception as e:
            error_count += 1
            print(f"  ❌ Error inserting {table_name} record: {str(e)}")
    
    return success_count, error_count

# ─────────────────────────────────────────────────────────────
# 1. IMPORT PRODUCTS
# ─────────────────────────────────────────────────────────────
def import_products():
    print("\n📦 Importing Products...")
    
    try:
        df = pd.read_csv('Product_export.csv')
        print(f"  📊 Loaded {len(df)} products from CSV")
        
        products = []
        for _, row in df.iterrows():
            # Determine category from name
            name_lower = str(row['name']).lower()
            size_lower = str(row['size_description']).lower() if pd.notna(row['size_description']) else ''
            
            if 'bottle' in name_lower or 'ml' in size_lower or 'litre' in size_lower or 'l' in size_lower:
                category = 'Bottle'
            else:
                category = 'Accessory'
            
            # Use carton price, fallback to bag price
            try:
                price_carton = float(row['unit_price_carton']) if pd.notna(row['unit_price_carton']) else 0
                price_bag = float(row['unit_price_bag']) if pd.notna(row['unit_price_bag']) else 0
                default_price = price_carton if price_carton > 0 else price_bag
            except:
                default_price = 0
            
            # Invert is_sample for active (sample=false means active=true)
            try:
                is_sample = str(row['is_sample']).lower() == 'true'
                active = not is_sample
            except:
                active = True
            
            products.append({
                'id': row['id'],
                'name': row['name'],
                'size': str(row['size_description']) if pd.notna(row['size_description']) else '',
                'category': category,
                'default_price': default_price,
                'active': active,
                'created_at': row['created_date']
            })
        
        success, errors = upsert_data('products', products, 'id')
        print(f"  ✅ Products: {success} imported/updated, {errors} errors")
        
    except FileNotFoundError:
        print("  ⚠️  Product_export.csv not found, skipping...")
    except Exception as e:
        print(f"  ❌ Error importing products: {str(e)}")

# ─────────────────────────────────────────────────────────────
# 2. IMPORT CUSTOMERS
# ─────────────────────────────────────────────────────────────
def import_customers():
    print("\n👥 Importing Customers...")
    
    try:
        df = pd.read_csv('Customer_export.csv')
        print(f"  📊 Loaded {len(df)} customers from CSV")
        
        customers = []
        for _, row in df.iterrows():
            customers.append({
                'id': row.get('id', None),
                'name': row.get('name', ''),
                'payment_name': row.get('payment_name', row.get('name', '')),
                'contact': row.get('contact', row.get('phone', '')),
                'created_at': row.get('created_date', datetime.now().isoformat())
            })
        
        success, errors = upsert_data('customers', customers, 'id')
        print(f"  ✅ Customers: {success} imported/updated, {errors} errors")
        
    except FileNotFoundError:
        print("  ⚠️  Customer_export.csv not found, skipping...")
    except Exception as e:
        print(f"  ❌ Error importing customers: {str(e)}")

# ─────────────────────────────────────────────────────────────
# 3. IMPORT TRANSACTIONS
# ─────────────────────────────────────────────────────────────
def import_transactions():
    print("\n💳 Importing Transactions...")
    
    try:
        df = pd.read_csv('Transaction_export.csv')
        print(f"  📊 Loaded {len(df)} transactions from CSV")
        
        transactions = []
        for _, row in df.iterrows():
            transactions.append({
                'id': row.get('id', None),
                'customer_id': row.get('customer_id', None),
                'customer_name': row.get('customer_name', ''),
                'transaction_date': row.get('transaction_date', row.get('date', datetime.now().strftime('%Y-%m-%d'))),
                'transaction_type': row.get('transaction_type', 'Credit'),
                'amount': float(row.get('amount', 0)),
                'notes': row.get('notes', ''),
                'created_at': row.get('created_date', datetime.now().isoformat())
            })
        
        success, errors = upsert_data('transactions', transactions, 'id')
        print(f"  ✅ Transactions: {success} imported/updated, {errors} errors")
        
    except FileNotFoundError:
        print("  ⚠️  Transaction_export.csv not found, skipping...")
    except Exception as e:
        print(f"  ❌ Error importing transactions: {str(e)}")

# ─────────────────────────────────────────────────────────────
# 4. IMPORT BROKERS
# ─────────────────────────────────────────────────────────────
def import_brokers():
    print("\n🤝 Importing Brokers...")
    
    try:
        df = pd.read_csv('Broker_export.csv')
        print(f"  📊 Loaded {len(df)} brokers from CSV")
        
        brokers = []
        for _, row in df.iterrows():
            brokers.append({
                'id': row.get('id', None),
                'name': row.get('name', ''),
                'phone': row.get('phone', ''),
                'area': row.get('area', ''),
                'opening_balance': float(row.get('opening_balance', 0)),
                'created_at': row.get('created_date', datetime.now().isoformat())
            })
        
        success, errors = upsert_data('brokers', brokers, 'id')
        print(f"  ✅ Brokers: {success} imported/updated, {errors} errors")
        
    except FileNotFoundError:
        print("  ⚠️  Broker_export.csv not found, skipping...")
    except Exception as e:
        print(f"  ❌ Error importing brokers: {str(e)}")

# ─────────────────────────────────────────────────────────────
# 5. IMPORT BROKER_LEDGER
# ─────────────────────────────────────────────────────────────
def import_broker_ledger():
    print("\n📋 Importing Broker Ledger...")
    
    try:
        df = pd.read_csv('BrokerLedger_export.csv')
        print(f"  📊 Loaded {len(df)} broker ledger entries from CSV")
        
        ledger = []
        for _, row in df.iterrows():
            ledger.append({
                'id': row.get('id', None),
                'broker_id': row.get('broker_id', None),
                'broker_name': row.get('broker_name', ''),
                'date': row.get('date', datetime.now().strftime('%Y-%m-%d')),
                'day': row.get('day', ''),
                'bottles_taken': int(row.get('bottles_taken', 0)),
                'amount': float(row.get('amount', 0)),
                'amount_paid': float(row.get('amount_paid', 0)),
                'balance': float(row.get('balance', 0)),
                'created_at': row.get('created_date', datetime.now().isoformat())
            })
        
        success, errors = upsert_data('broker_ledger', ledger, 'id')
        print(f"  ✅ Broker Ledger: {success} imported/updated, {errors} errors")
        
    except FileNotFoundError:
        print("  ⚠️  BrokerLedger_export.csv not found, skipping...")
    except Exception as e:
        print(f"  ❌ Error importing broker ledger: {str(e)}")

# ─────────────────────────────────────────────────────────────
# 6. IMPORT PURCHASES
# ─────────────────────────────────────────────────────────────
def import_purchases():
    print("\n🛒 Importing Purchases...")
    
    try:
        df = pd.read_csv('Purchase_export.csv')
        print(f"  📊 Loaded {len(df)} purchases from CSV")
        
        purchases = []
        for _, row in df.iterrows():
            purchases.append({
                'id': row.get('id', None),
                'date': row.get('date', datetime.now().strftime('%Y-%m-%d')),
                'purchasing_agent': row.get('purchasing_agent', ''),
                'company_name': row.get('company_name', ''),
                'transport': float(row.get('transport', 0)),
                'items': row.get('items', '[]'),  # JSON string
                'products_total': float(row.get('products_total', 0)),
                'total_expenditure': float(row.get('total_expenditure', 0)),
                'created_at': row.get('created_date', datetime.now().isoformat())
            })
        
        success, errors = upsert_data('purchases', purchases, 'id')
        print(f"  ✅ Purchases: {success} imported/updated, {errors} errors")
        
    except FileNotFoundError:
        print("  ⚠️  Purchase_export.csv not found, skipping...")
    except Exception as e:
        print(f"  ❌ Error importing purchases: {str(e)}")

# ─────────────────────────────────────────────────────────────
# MAIN: RUN ALL IMPORTS IN ORDER
# ─────────────────────────────────────────────────────────────
if __name__ == '__main__':
    print("=" * 60)
    print("🚀 Starting Data Import from Base44 to Supabase")
    print("=" * 60)
    print("⚠️  This script will:")
    print("   • Check existing records by ID")
    print("   • UPDATE records that already exist")
    print("   • INSERT new records that don't exist")
    print("   • Skip tables where CSV files are missing")
    print("=" * 60)
    
    start_time = datetime.now()
    
    # Import in order (respecting foreign keys)
    import_products()        # No dependencies
    import_customers()       # Referenced by transactions
    import_brokers()         # Referenced by broker_ledger
    import_transactions()    # References customers
    import_broker_ledger()   # References brokers
    import_purchases()       # No critical dependencies
    
    end_time = datetime.now()
    duration = end_time - start_time
    
    print("\n" + "=" * 60)
    print(f"✅ Import Complete! Duration: {duration}")
    print("=" * 60)
    print("\n📊 Next Steps:")
    print("   1. Verify data in Supabase Dashboard → Table Editor")
    print("   2. Run this script again anytime to sync new data")
    print("   3. Existing records will be updated, not duplicated")
    print("=" * 60)
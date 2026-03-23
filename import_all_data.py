# import_all_data.py
import pandas as pd
from supabase import create_client, Client
import os
import json
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
    """Insert new records or update existing ones based on conflict_column."""
    if not data:
        return 0, 0
    
    success_count = 0
    error_count = 0
    
    for record in data:
        try:
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
            name_lower = str(row['name']).lower() if pd.notna(row['name']) else ''
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
            
            products.append({
                'id': row['id'],
                'name': row['name'] if pd.notna(row['name']) else 'Unknown',
                'size': str(row['size_description']) if pd.notna(row['size_description']) else '',
                'category': category,
                'default_price': default_price,
                'active': str(row['is_sample']).lower() != 'true' if pd.notna(row['is_sample']) else True,
                'created_at': row['created_date'] if pd.notna(row['created_date']) else datetime.now().isoformat()
            })
        
        success, errors = upsert_data('products', products, 'id')
        print(f"  ✅ Products: {success} imported/updated, {errors} errors")
        
    except FileNotFoundError:
        print("  ⚠️  Product_export.csv not found, skipping...")
    except Exception as e:
        print(f"  ❌ Error importing products: {str(e)}")

# ─────────────────────────────────────────────────────────────
# 2. IMPORT BROKERS
# ─────────────────────────────────────────────────────────────
def import_brokers():
    print("\n🤝 Importing Brokers...")
    
    try:
        df = pd.read_csv('Broker_export.csv')
        print(f"  📊 Loaded {len(df)} brokers from CSV")
        
        brokers = []
        for _, row in df.iterrows():
            brokers.append({
                'id': row['id'],
                'name': row['name'] if pd.notna(row['name']) else 'Unknown',
                'phone': str(row['phone']) if pd.notna(row['phone']) else '',
                'area': str(row['area']) if pd.notna(row['area']) else '',
                'opening_balance': float(row['opening_balance']) if pd.notna(row['opening_balance']) else 0,
                'created_at': row['created_date'] if pd.notna(row['created_date']) else datetime.now().isoformat()
            })
        
        success, errors = upsert_data('brokers', brokers, 'id')
        print(f"  ✅ Brokers: {success} imported/updated, {errors} errors")
        
    except FileNotFoundError:
        print("  ⚠️  Broker_export.csv not found, skipping...")
    except Exception as e:
        print(f"  ❌ Error importing brokers: {str(e)}")

# ─────────────────────────────────────────────────────────────
# 3. IMPORT BROKER LEDGER
# ─────────────────────────────────────────────────────────────
def import_broker_ledger():
    print("\n📋 Importing Broker Ledger...")
    
    try:
        df = pd.read_csv('BrokerLedger_export.csv')
        print(f"  📊 Loaded {len(df)} broker ledger entries from CSV")
        
        ledger = []
        for _, row in df.iterrows():
            ledger.append({
                'id': row['id'],
                'broker_id': row['broker_id'] if pd.notna(row['broker_id']) else None,
                'broker_name': row['broker_name'] if pd.notna(row['broker_name']) else '',
                'date': row['date'] if pd.notna(row['date']) else datetime.now().strftime('%Y-%m-%d'),
                'day': row['day'] if pd.notna(row['day']) else '',
                'bottles_taken': int(float(row['bottles_taken'])) if pd.notna(row['bottles_taken']) else 0,
                'amount': float(row['amount']) if pd.notna(row['amount']) else 0,
                'amount_paid': float(row['amount_paid']) if pd.notna(row['amount_paid']) else 0,
                'balance': float(row['balance']) if pd.notna(row['balance']) else 0,
                'created_at': row['created_date'] if pd.notna(row['created_date']) else datetime.now().isoformat()
            })
        
        success, errors = upsert_data('broker_ledger', ledger, 'id')
        print(f"  ✅ Broker Ledger: {success} imported/updated, {errors} errors")
        
    except FileNotFoundError:
        print("  ⚠️  BrokerLedger_export.csv not found, skipping...")
    except Exception as e:
        print(f"  ❌ Error importing broker ledger: {str(e)}")

# ─────────────────────────────────────────────────────────────
# 4. IMPORT PURCHASES
# ─────────────────────────────────────────────────────────────
def import_purchases():
    print("\n🛒 Importing Purchases...")
    
    try:
        df = pd.read_csv('Purchase_export.csv')
        print(f"  📊 Loaded {len(df)} purchases from CSV")
        
        purchases = []
        for _, row in df.iterrows():
            # Parse items JSON string
            items_json = row['items'] if pd.notna(row['items']) else '[]'
            try:
                items = json.loads(items_json) if isinstance(items_json, str) else items_json
            except:
                items = []
            
            purchases.append({
                'id': row['id'],
                'date': row['date'] if pd.notna(row['date']) else datetime.now().strftime('%Y-%m-%d'),
                'purchasing_agent': row['purchasing_agent'] if pd.notna(row['purchasing_agent']) else '',
                'company_name': row['company_name'] if pd.notna(row['company_name']) else '',
                'transport': float(row['transport']) if pd.notna(row['transport']) else 0,
                'items': items,
                'products_total': float(row['products_total']) if pd.notna(row['products_total']) else 0,
                'total_expenditure': float(row['total_expenditure']) if pd.notna(row['total_expenditure']) else 0,
                'created_at': row['created_date'] if pd.notna(row['created_date']) else datetime.now().isoformat()
            })
        
        success, errors = upsert_data('purchases', purchases, 'id')
        print(f"  ✅ Purchases: {success} imported/updated, {errors} errors")
        
    except FileNotFoundError:
        print("  ⚠️  Purchase_export.csv not found, skipping...")
    except Exception as e:
        print(f"  ❌ Error importing purchases: {str(e)}")

# ─────────────────────────────────────────────────────────────
# 5. IMPORT CUSTOMERS
# ─────────────────────────────────────────────────────────────
def import_customers():
    print("\n👥 Importing Customers...")
    
    try:
        df = pd.read_csv('Customer_export.csv')
        print(f"  📊 Loaded {len(df)} customers from CSV")
        
        customers = []
        for _, row in df.iterrows():
            customers.append({
                'id': row['id'],
                'name': row['name'] if pd.notna(row['name']) else 'Unknown',
                'payment_name': row['payment_name'] if pd.notna(row['payment_name']) else row['name'],
                'contact': row['contact'] if pd.notna(row['contact']) else '',
                'created_at': row['created_date'] if pd.notna(row['created_date']) else datetime.now().isoformat()
            })
        
        success, errors = upsert_data('customers', customers, 'id')
        print(f"  ✅ Customers: {success} imported/updated, {errors} errors")
        
    except FileNotFoundError:
        print("  ⚠️  Customer_export.csv not found, skipping...")
    except Exception as e:
        print(f"  ❌ Error importing customers: {str(e)}")

# ─────────────────────────────────────────────────────────────
# 6. IMPORT TRANSACTIONS
# ─────────────────────────────────────────────────────────────
def import_transactions():
    print("\n💳 Importing Transactions...")
    
    try:
        df = pd.read_csv('Transaction_export.csv')
        print(f"  📊 Loaded {len(df)} transactions from CSV")
        
        transactions = []
        for _, row in df.iterrows():
            transactions.append({
                'id': row['id'],
                'customer_id': row['customer_id'] if pd.notna(row['customer_id']) else None,
                'customer_name': row['customer_name'] if pd.notna(row['customer_name']) else '',
                'transaction_date': row['transaction_date'] if pd.notna(row['transaction_date']) else datetime.now().strftime('%Y-%m-%d'),
                'transaction_type': row['transaction_type'] if pd.notna(row['transaction_type']) else 'Credit',
                'amount': float(row['amount']) if pd.notna(row['amount']) else 0,
                'notes': row['notes'] if pd.notna(row['notes']) else '',
                'created_at': row['created_date'] if pd.notna(row['created_date']) else datetime.now().isoformat()
            })
        
        success, errors = upsert_data('transactions', transactions, 'id')
        print(f"  ✅ Transactions: {success} imported/updated, {errors} errors")
        
    except FileNotFoundError:
        print("  ⚠️  Transaction_export.csv not found, skipping...")
    except Exception as e:
        print(f"  ❌ Error importing transactions: {str(e)}")

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
    import_brokers()         # Referenced by broker_ledger
    import_customers()       # Referenced by transactions
    import_broker_ledger()   # References brokers
    import_purchases()       # No critical dependencies
    import_transactions()    # References customers
    
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
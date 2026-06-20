"""
Run this from D:\crm\backend with the venv activated:
  python diagnose_url.py
"""
import os
from dotenv import load_dotenv
import pathlib

cwd = pathlib.Path('.')
print("=== .env files found ===")
for p in ['.env', '.env.local', '.env.production']:
    f = cwd / p
    print(f"  {p}: {'EXISTS' if f.exists() else 'NOT FOUND'}")

print()
load_dotenv(override=True)

url = os.environ.get("DATABASE_URL", "NOT SET")
print(f"=== DATABASE_URL after load_dotenv ===")
print(f"  {url}")

if '6543' in url:
    print("  Port 6543 found — .env is correct")
elif '5432' in url:
    print("  Port 5432 found — OS env var is overriding .env")
else:
    print("  Port not recognized")
"""
backend/check_role.py — TEMPORARY DIAGNOSTIC SCRIPT
Run with: python check_role.py
Delete after use.

Checks:
1. Every user row and their actual role value in the database
2. Whether the UserResponse schema would correctly serialize it
"""
from app.core.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    print("--- All users and their role values ---")
    result = conn.execute(text(
        "SELECT id, email, full_name, role, created_at FROM users ORDER BY created_at ASC"
    ))
    rows = list(result)
    if not rows:
        print("  (no users found)")
    for row in rows:
        print(f"  id={row[0]} | email={row[1]} | full_name={row[2]} | role={row[3]!r} | created_at={row[4]}")

print()
print("--- Schema check ---")
try:
    from app.schemas.auth import UserResponse
    print("UserResponse fields:", UserResponse.model_fields.keys())
except Exception as e:
    print("Error importing UserResponse:", e)
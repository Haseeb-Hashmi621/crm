"""
backend/fix_users.py — TEMPORARY ONE-OFF SCRIPT
Run with: python fix_users.py
Delete after use.

Does two things:
1. Promotes test3@example.com to role='admin'
2. Resets test@example.com's password to a known value
"""
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User

db = SessionLocal()

try:
    # 1. Promote test3@example.com
    test3 = db.query(User).filter(User.email == "test3@example.com").first()
    if test3:
        test3.role = "admin"
        print(f"Promoted {test3.email} to admin")
    else:
        print("test3@example.com not found")

    # 2. Reset test@example.com's password
    NEW_PASSWORD = "test123456"  # change this if you want a different temp password

    test1 = db.query(User).filter(User.email == "test@example.com").first()
    if test1:
        test1.hashed_password = get_password_hash(NEW_PASSWORD)
        print(f"Reset password for {test1.email} to: {NEW_PASSWORD}")
    else:
        print("test@example.com not found")

    db.commit()
    print()
    print("Done. Verify below:")

    for u in db.query(User).order_by(User.created_at.asc()).all():
        print(f"  {u.email} | role={u.role}")

finally:
    db.close()
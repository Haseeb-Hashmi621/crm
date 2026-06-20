"""
backend/check_schema.py — TEMPORARY DIAGNOSTIC SCRIPT
Run with: python check_schema.py
Delete after use.
"""
from app.core.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    print("--- Columns on 'users' table ---")
    result = conn.execute(text(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY column_name"
    ))
    cols = [row[0] for row in result]
    for c in cols:
        print(" -", c)

    print()
    print("--- alembic_version table (what alembic thinks is current) ---")
    try:
        result2 = conn.execute(text("SELECT version_num FROM alembic_version"))
        for row in result2:
            print(" -", row[0])
    except Exception as e:
        print(" (error reading alembic_version):", e)

    print()
    print("--- Current database name and host (from this connection) ---")
    result3 = conn.execute(text("SELECT current_database(), inet_server_addr(), inet_server_port()"))
    for row in result3:
        print(" - db:", row[0], "| host:", row[1], "| port:", row[2])

    print()
    print("role column present:", "role" in cols)
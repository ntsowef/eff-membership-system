#!/usr/bin/env python3
import psycopg2
from datetime import datetime, timedelta

conn = psycopg2.connect(
    host='localhost',
    user='eff_admin',
    password='Frames!123',
    database='eff_membership_database',
    port=5432
)
cur = conn.cursor()

cutoff = datetime.now() - timedelta(minutes=10)
cur.execute("DELETE FROM members_consolidated WHERE updated_at > %s", (cutoff,))
deleted = cur.rowcount
conn.commit()

print(f'Deleted {deleted} recent test records')
conn.close()


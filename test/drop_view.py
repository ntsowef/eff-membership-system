import psycopg2

c = psycopg2.connect(host='localhost', user='eff_admin', password='Frames!123', database='eff_membership_database')
r = c.cursor()

print("Dropping view...")
r.execute("DROP VIEW IF EXISTS vw_member_details_optimized CASCADE")
c.commit()
print("✅ View dropped")

c.close()


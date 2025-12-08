#!/usr/bin/env python3
"""
Recreate Provincial and Municipal Administrator user accounts for South Africa

This script creates:
1. Provincial Administrator users for all 9 provinces
2. Municipal Administrator users for all 266 municipalities

Each user is linked to their geographic area and has appropriate permissions.

Usage:
    python test/recreate_municipal_users.py              # Dry run (preview only)
    python test/recreate_municipal_users.py --execute    # Actually create users
"""

import psycopg2
import bcrypt
import sys
import re
from datetime import datetime

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'eff_admin',
    'password': 'Frames!123',
    'database': 'eff_membership_database',
    'port': 5432
}

# User configuration
PROVINCIAL_ROLE_ID = 3  # Provincial Administrator
MUNICIPAL_ROLE_ID = 5   # Municipal Administrator
DEFAULT_PASSWORD = 'EFF@2024'  # Will be hashed with bcrypt
EMAIL_DOMAIN = '@eff.org.za'

def sanitize_municipality_name(name):
    """
    Convert municipality name to email-friendly format
    Example: "City of Johannesburg Metropolitan Municipality" -> "city-of-johannesburg-metropolitan-municipality"
    """
    # Convert to lowercase
    name = name.lower()
    # Replace spaces and special characters with hyphens
    name = re.sub(r'[^a-z0-9]+', '-', name)
    # Remove leading/trailing hyphens
    name = name.strip('-')
    # Replace multiple consecutive hyphens with single hyphen
    name = re.sub(r'-+', '-', name)
    return name

def generate_email(municipality_name):
    """Generate email address from municipality name"""
    sanitized = sanitize_municipality_name(municipality_name)
    return f"{sanitized}.admin{EMAIL_DOMAIN}"

def generate_user_name(municipality_name):
    """Generate user display name"""
    return f"{municipality_name} Municipal Admin"

def hash_password(password):
    """Generate bcrypt hash for password"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def preview_users(conn):
    """Preview what users would be created (dry run)"""
    cur = conn.cursor()

    print("=" * 120)
    print("🔍 DRY RUN - PREVIEW OF PROVINCIAL AND MUNICIPAL USERS TO BE CREATED")
    print("=" * 120)

    # ========== PROVINCIAL ADMINISTRATORS ==========
    print("\n" + "=" * 120)
    print("PART 1: PROVINCIAL ADMINISTRATORS")
    print("=" * 120)

    # Get all provinces
    cur.execute("""
        SELECT province_code, province_name
        FROM provinces
        WHERE is_active = true
        ORDER BY province_name
    """)

    provinces = cur.fetchall()
    total_provinces = len(provinces)

    print(f"\nTotal provinces found: {total_provinces}")
    print("\n" + "-" * 120)
    print(f"{'#':<5} {'Province Name':<50} {'Email':<50} {'Code':<10}")
    print("-" * 120)

    # Check which provincial users already exist
    existing_provincial_emails = set()
    cur.execute("SELECT email FROM users WHERE admin_level = 'provincial'")
    for row in cur.fetchall():
        existing_provincial_emails.add(row[0])

    provincial_would_create = 0
    provincial_would_skip = 0

    for idx, (prov_code, prov_name) in enumerate(provinces, 1):
        email = generate_email(prov_name)

        if email in existing_provincial_emails:
            provincial_would_skip += 1
            marker = "○"
        else:
            provincial_would_create += 1
            marker = "✓"

        print(f"{marker} {idx:<3} {prov_name:<50} {email:<50} {prov_code:<10}")

    print("-" * 120)
    print(f"\nProvincial Summary:")
    print(f"  Total provinces: {total_provinces}")
    print(f"  Would create: {provincial_would_create}")
    print(f"  Would skip (already exist): {provincial_would_skip}")

    # ========== MUNICIPAL ADMINISTRATORS ==========
    print("\n" + "=" * 120)
    print("PART 2: MUNICIPAL ADMINISTRATORS")
    print("=" * 120)

    # Get all municipalities
    cur.execute("""
        SELECT municipality_code, municipality_name, district_code
        FROM municipalities
        WHERE is_active = true
        ORDER BY municipality_name
    """)

    municipalities = cur.fetchall()
    total_municipalities = len(municipalities)

    print(f"\nTotal municipalities found: {total_municipalities}")
    print("\n" + "-" * 120)
    print(f"{'#':<5} {'Municipality Name':<50} {'Email':<50} {'Code':<10}")
    print("-" * 120)

    # Check which municipal users already exist
    existing_municipal_emails = set()
    cur.execute("SELECT email FROM users WHERE admin_level = 'municipal'")
    for row in cur.fetchall():
        existing_municipal_emails.add(row[0])

    municipal_would_create = 0
    municipal_would_skip = 0

    for idx, (muni_code, muni_name, district_code) in enumerate(municipalities, 1):
        email = generate_email(muni_name)

        if email in existing_municipal_emails:
            municipal_would_skip += 1
            marker = "○"
        else:
            municipal_would_create += 1
            marker = "✓"

        print(f"{marker} {idx:<3} {muni_name:<50} {email:<50} {muni_code:<10}")

    print("-" * 120)
    print(f"\nMunicipal Summary:")
    print(f"  Total municipalities: {total_municipalities}")
    print(f"  Would create: {municipal_would_create}")
    print(f"  Would skip (already exist): {municipal_would_skip}")

    # ========== OVERALL SUMMARY ==========
    print("\n" + "=" * 120)
    print("OVERALL SUMMARY")
    print("=" * 120)
    print(f"\nProvincial Administrators:")
    print(f"  Total: {total_provinces}")
    print(f"  Would create: {provincial_would_create}")
    print(f"  Would skip: {provincial_would_skip}")
    print(f"  Role: Provincial Administrator (role_id={PROVINCIAL_ROLE_ID})")

    print(f"\nMunicipal Administrators:")
    print(f"  Total: {total_municipalities}")
    print(f"  Would create: {municipal_would_create}")
    print(f"  Would skip: {municipal_would_skip}")
    print(f"  Role: Municipal Administrator (role_id={MUNICIPAL_ROLE_ID})")

    total_would_create = provincial_would_create + municipal_would_create
    total_would_skip = provincial_would_skip + municipal_would_skip

    print(f"\nGrand Total:")
    print(f"  Total users: {total_provinces + total_municipalities}")
    print(f"  Would create: {total_would_create}")
    print(f"  Would skip: {total_would_skip}")

    print(f"\nDefault password for all new users: {DEFAULT_PASSWORD}")
    print("\n" + "=" * 120)
    print("To actually create these users, run: python test/recreate_municipal_users.py --execute")
    print("=" * 120)

    cur.close()

def create_users(conn):
    """Actually create the provincial and municipal users"""
    cur = conn.cursor()

    print("=" * 120)
    print("🚀 CREATING PROVINCIAL AND MUNICIPAL ADMINISTRATOR USERS")
    print("=" * 120)

    try:
        # Generate password hash once (reuse for all users)
        print(f"\nGenerating password hash...")
        password_hash = hash_password(DEFAULT_PASSWORD)
        print(f"Password hash generated ✓")

        total_created = 0
        total_skipped = 0
        total_errors = []

        # ========== PART 1: CREATE PROVINCIAL ADMINISTRATORS ==========
        print("\n" + "=" * 120)
        print("PART 1: CREATING PROVINCIAL ADMINISTRATORS")
        print("=" * 120)

        # Get all provinces
        cur.execute("""
            SELECT province_code, province_name
            FROM provinces
            WHERE is_active = true
            ORDER BY province_name
        """)

        provinces = cur.fetchall()
        total_provinces = len(provinces)

        print(f"\nTotal provinces found: {total_provinces}")

        # Get existing provincial users
        cur.execute("SELECT email FROM users WHERE admin_level = 'provincial'")
        existing_provincial_emails = {row[0] for row in cur.fetchall()}

        print(f"Existing provincial users: {len(existing_provincial_emails)}")
        print("\n" + "-" * 120)

        provincial_created = 0
        provincial_skipped = 0

        for idx, (prov_code, prov_name) in enumerate(provinces, 1):
            email = generate_email(prov_name)
            user_name = f"{prov_name} Provincial Admin"

            # Check if user already exists
            if email in existing_provincial_emails:
                print(f"○ [{idx}/{total_provinces}] SKIPPED: {user_name} (already exists)")
                provincial_skipped += 1
                continue

            try:
                # Insert new provincial user
                cur.execute("""
                    INSERT INTO users (
                        name,
                        email,
                        password,
                        role_id,
                        admin_level,
                        province_code,
                        is_active,
                        account_locked,
                        failed_login_attempts,
                        mfa_enabled,
                        created_at,
                        updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    )
                """, (
                    user_name,
                    email,
                    password_hash,
                    PROVINCIAL_ROLE_ID,
                    'provincial',
                    prov_code,
                    True,  # is_active
                    False,  # account_locked
                    0,  # failed_login_attempts
                    False,  # mfa_enabled
                    datetime.now(),
                    datetime.now()
                ))

                provincial_created += 1
                print(f"✓ [{idx}/{total_provinces}] CREATED: {user_name}")

            except Exception as e:
                error_msg = f"Error creating provincial user for {prov_name}: {str(e)}"
                total_errors.append(error_msg)
                print(f"✗ [{idx}/{total_provinces}] ERROR: {user_name} - {str(e)}")

        print(f"\nProvincial users created: {provincial_created}")
        print(f"Provincial users skipped: {provincial_skipped}")

        # ========== PART 2: CREATE MUNICIPAL ADMINISTRATORS ==========
        print("\n" + "=" * 120)
        print("PART 2: CREATING MUNICIPAL ADMINISTRATORS")
        print("=" * 120)

        # Get all municipalities
        cur.execute("""
            SELECT municipality_code, municipality_name, district_code
            FROM municipalities
            WHERE is_active = true
            ORDER BY municipality_name
        """)

        municipalities = cur.fetchall()
        total_municipalities = len(municipalities)

        print(f"\nTotal municipalities found: {total_municipalities}")
        print(f"Generating password hash...")

        # Generate password hash once (reuse for all users)
        password_hash = hash_password(DEFAULT_PASSWORD)
        print(f"Password hash generated ✓")

        # Get existing users
        cur.execute("SELECT email FROM users WHERE admin_level = 'municipal'")
        existing_emails = {row[0] for row in cur.fetchall()}

        print(f"\nExisting municipal users: {len(existing_emails)}")
        print("\n" + "-" * 120)

        created_count = 0
        skipped_count = 0
        errors = []

        for idx, (muni_code, muni_name, district_code) in enumerate(municipalities, 1):
            email = generate_email(muni_name)
            user_name = generate_user_name(muni_name)

            # Check if user already exists
            if email in existing_emails:
                print(f"○ [{idx}/{total_municipalities}] SKIPPED: {user_name} (already exists)")
                skipped_count += 1
                continue

            try:
                # Insert new user
                cur.execute("""
                    INSERT INTO users (
                        name,
                        email,
                        password,
                        role_id,
                        admin_level,
                        municipal_code,
                        district_code,
                        is_active,
                        account_locked,
                        failed_login_attempts,
                        mfa_enabled,
                        created_at,
                        updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    )
                """, (
                    user_name,
                    email,
                    password_hash,
                    ROLE_ID,
                    ADMIN_LEVEL,
                    muni_code,
                    district_code,
                    True,  # is_active
                    False,  # account_locked
                    0,  # failed_login_attempts
                    False,  # mfa_enabled
                    datetime.now(),
                    datetime.now()
                ))

                created_count += 1
                print(f"✓ [{idx}/{total_municipalities}] CREATED: {user_name}")

            except Exception as e:
                error_msg = f"Error creating user for {muni_name}: {str(e)}"
                errors.append(error_msg)
                print(f"✗ [{idx}/{total_municipalities}] ERROR: {user_name} - {str(e)}")

        # Commit transaction
        if errors:
            print("\n" + "=" * 120)
            print("⚠️  ERRORS ENCOUNTERED - ROLLING BACK TRANSACTION")
            print("=" * 120)
            for error in errors:
                print(f"  - {error}")
            conn.rollback()
            print("\nTransaction rolled back. No users were created.")
        else:
            conn.commit()
            print("\n" + "-" * 120)
            print("✅ TRANSACTION COMMITTED SUCCESSFULLY")
            print("-" * 120)

        # Summary
        print("\n" + "=" * 120)
        print("SUMMARY")
        print("=" * 120)
        print(f"  Total municipalities: {total_municipalities}")
        print(f"  Users created: {created_count}")
        print(f"  Users skipped (already exist): {skipped_count}")
        print(f"  Errors: {len(errors)}")

        if created_count > 0:
            print(f"\n  Default password for all new users: {DEFAULT_PASSWORD}")
            print(f"  ⚠️  Users should change their password on first login!")

        print("\n" + "=" * 120)

        # Verify final count
        cur.execute("SELECT COUNT(*) FROM users WHERE admin_level = 'municipal'")
        final_count = cur.fetchone()[0]
        print(f"\nFinal verification: {final_count} municipal users in database")
        print("=" * 120)

    except Exception as e:
        conn.rollback()
        print("\n" + "=" * 120)
        print("❌ CRITICAL ERROR - TRANSACTION ROLLED BACK")
        print("=" * 120)
        print(f"\nError: {str(e)}")
        print("\nNo users were created. Database is unchanged.")
        raise

    finally:
        cur.close()

def main():
    """Main function"""
    # Check command line arguments
    execute_mode = '--execute' in sys.argv

    if not execute_mode:
        print("\n⚠️  Running in DRY RUN mode (preview only)")
        print("To actually create users, run: python test/recreate_municipal_users.py --execute\n")

    # Connect to database
    try:
        conn = psycopg2.connect(**DB_CONFIG)

        if execute_mode:
            # Confirm before proceeding
            print("\n" + "=" * 120)
            print("⚠️  WARNING: YOU ARE ABOUT TO CREATE MUNICIPAL ADMINISTRATOR USERS")
            print("=" * 120)
            response = input("\nType 'CREATE USERS' to proceed (or anything else to cancel): ")

            if response != 'CREATE USERS':
                print("\n❌ Operation cancelled by user.")
                conn.close()
                return

            create_users(conn)
        else:
            preview_users(conn)

        conn.close()

    except psycopg2.Error as e:
        print(f"\n❌ Database connection error: {str(e)}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {str(e)}")
        sys.exit(1)

if __name__ == '__main__':
    main()


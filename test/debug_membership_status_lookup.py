#!/usr/bin/env python3
import sys
sys.path.insert(0, '.')

from flexible_membership_ingestionV2 import FlexibleMembershipIngestion

db_config = {
    'host': 'localhost',
    'port': 5432,
    'user': 'eff_admin',
    'password': 'Frames!123',
    'database': 'eff_membership_database'
}

print("Creating ingestion instance...")
ingestion = FlexibleMembershipIngestion(
    docs_directory='uploads',
    db_config=db_config,
    use_optimized=True,
    archive_enabled=False
)

print("\n" + "=" * 80)
print("MEMBERSHIP_STATUSES LOOKUP CACHE")
print("=" * 80)

cache = ingestion.lookup_cache.get('membership_statuses', {})
print(f"\nTotal entries in cache: {len(cache)}")
print("\nCache contents:")
for key, value in sorted(cache.items()):
    print(f"  '{key}' -> {value}")

print("\n" + "=" * 80)
print("TESTING NORMALIZATION AND LOOKUP")
print("=" * 80)

test_value = "Invalid"
print(f"\nInput: '{test_value}'")

normalized = ingestion.normalize_membership_status(test_value)
print(f"After normalization: '{normalized}'")

lookup_result = ingestion.lookup_id('membership_statuses', normalized)
print(f"Lookup result: {lookup_result}")

# Try direct lookup
normalized_lower = normalized.lower() if normalized else None
print(f"Normalized lowercase: '{normalized_lower}'")
print(f"Direct cache lookup: {cache.get(normalized_lower)}")

# Check if 'inactive' is in cache
print(f"\n'inactive' in cache: {'inactive' in cache}")
print(f"'Inactive' in cache: {'Inactive' in cache}")

# Show all keys that contain 'inact'
print("\nKeys containing 'inact':")
for key in cache.keys():
    if 'inact' in key.lower():
        print(f"  '{key}' -> {cache[key]}")


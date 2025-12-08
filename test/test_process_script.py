"""
Test if the process_self_data_management_file.py script can be imported and run
"""
import sys
import os

# Change to repository root (same as what Node.js will do)
repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(repo_root)
print(f"Working directory: {os.getcwd()}")

# Now try to run the script
script_path = os.path.join(repo_root, 'backend', 'python', 'process_self_data_management_file.py')

try:
    # Import the script as a module
    import importlib.util
    spec = importlib.util.spec_from_file_location("process_script", script_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    
    print("✅ Successfully imported process_self_data_management_file.py")
    print(f"   process_file function: {module.process_file}")
except Exception as e:
    print(f"❌ Failed to import: {e}")
    import traceback
    traceback.print_exc()


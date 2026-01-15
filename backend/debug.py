import sys
import traceback

try:
    from app import app
    print("Import successful")
except:
    traceback.print_exc()

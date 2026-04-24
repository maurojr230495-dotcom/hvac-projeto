"""
Creates initial test users. Run once after migrations.
Usage: cd backend && .venv/bin/python scripts/seed.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.database import SessionLocal
from app.models.user import User, UserRole, AuthProvider
from app.services.auth import hash_password

USERS = [
    {"name": "Admin User",       "email": "admin@fieldops.com.au",      "password": "Admin1234!",  "role": UserRole.ADMIN},
    {"name": "Sarah Manager",    "email": "manager@fieldops.com.au",    "password": "Manager123!", "role": UserRole.MANAGER},
    {"name": "Tom Dispatcher",   "email": "dispatcher@fieldops.com.au", "password": "Dispatch12!", "role": UserRole.DISPATCHER},
    {"name": "Jake Technician",  "email": "tech@fieldops.com.au",       "password": "Tech1234!",   "role": UserRole.TECHNICIAN},
]

def seed():
    db = SessionLocal()
    try:
        for u in USERS:
            exists = db.query(User).filter(User.email == u["email"]).first()
            if exists:
                print(f"  skip  {u['email']} (already exists)")
                continue
            user = User(
                name=u["name"],
                email=u["email"],
                hashed_password=hash_password(u["password"]),
                role=u["role"],
                auth_provider=AuthProvider.LOCAL,
                is_active=True,
            )
            db.add(user)
            print(f"  created  {u['email']}  [{u['role'].value}]")
        db.commit()
        print("\nDone.")
    finally:
        db.close()

if __name__ == "__main__":
    seed()

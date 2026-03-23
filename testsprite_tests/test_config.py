"""Shared test configuration for all E2E tests."""

BASE_URL = "http://localhost:4173"

# Club owner credentials
CLUB_LOGIN_URL = f"{BASE_URL}/club-login"
CLUB_EMAIL = "test@test.com"
CLUB_PASSWORD = "Test123?"

# Volunteer credentials
VOLUNTEER_LOGIN_URL = f"{BASE_URL}/login"
VOLUNTEER_EMAIL = "vaneeckhoutmathis4@gmail.com"
VOLUNTEER_PASSWORD = "Mathis123?"

# Timeouts
DEFAULT_TIMEOUT = 10000
NAV_SLEEP = 3
LOGIN_SLEEP = 5

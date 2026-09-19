"""
Helper script to generate GMAIL_REFRESH_TOKEN for Moxie Backend.
Run locally:
python scratch/generate_gmail_refresh_token.py
"""
import os
import sys
from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ['https://www.googleapis.com/auth/gmail.send']


def main():
    print("=" * 60)
    print("MOXIE GMAIL API REFRESH TOKEN GENERATOR")
    print("=" * 60)

    client_id = os.environ.get('GMAIL_CLIENT_ID') or input("Enter GMAIL_CLIENT_ID: ").strip()
    client_secret = os.environ.get('GMAIL_CLIENT_SECRET') or input("Enter GMAIL_CLIENT_SECRET: ").strip()

    if not client_id or not client_secret:
        print("Error: Both Client ID and Client Secret are required.")
        sys.exit(1)

    client_config = {
        "installed": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": ["http://localhost:8080/", "urn:ietf:wg:oauth:2.0:oob"]
        }
    }

    flow = InstalledAppFlow.from_client_config(client_config, scopes=SCOPES)
    creds = flow.run_local_server(port=8080, access_type='offline', prompt='consent')

    print("\n" + "=" * 60)
    print("AUTHORIZATION SUCCESSFUL!")
    print("=" * 60)
    print(f"GMAIL_REFRESH_TOKEN:\n{creds.refresh_token}\n")
    print("Copy this refresh token and add it to your Render environment variables:")
    print("EMAIL_PROVIDER=gmail_api")
    print(f"GMAIL_CLIENT_ID={client_id}")
    print(f"GMAIL_CLIENT_SECRET={client_secret}")
    print(f"GMAIL_REFRESH_TOKEN={creds.refresh_token}")
    print("GMAIL_SENDER_EMAIL=<your sender gmail address>")
    print("=" * 60)


if __name__ == '__main__':
    main()

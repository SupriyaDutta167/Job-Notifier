import httpx

for slug in ["leverdemo", "netflix", "yelp", "auth0", "atlassian"]:
    try:
        resp = httpx.get(f"https://api.lever.co/v0/postings/{slug}?mode=json")
        if resp.status_code == 200:
            print(f"Success for {slug}")
            print(str(resp.json())[:500])
            break
        else:
            print(f"{slug} returned {resp.status_code}")
    except Exception as e:
        print(f"Error for {slug}: {e}")

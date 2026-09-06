import httpx
import json

resp = httpx.get("https://api.lever.co/v0/postings/leverdemo?mode=json")
with open("scratch/leverdemo.json", "w") as f:
    json.dump(resp.json(), f, indent=2)

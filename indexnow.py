"""
Tell Bing and other IndexNow search engines about new or changed pages.

Run this AFTER the site is deployed (the key file must already be live at
https://vintayz.com/<key>.txt):

    python indexnow.py              every page in the sitemap
    python indexnow.py 2026-10-11   only pages changed on or after that date

It sends the page addresses (nothing else) to api.indexnow.org, which shares them with the search
engines that use IndexNow, such as Bing. Google doesn't use IndexNow: for Google, submit the
sitemap in Search Console.
"""
import json
import re
import sys
import urllib.request

from build import DOMAIN, INDEXNOW_KEY, OUT


def main():
    since = sys.argv[1] if len(sys.argv) > 1 else ""
    with open(f"{OUT}/sitemap.xml", encoding="utf-8") as f:
        sitemap = f.read()
    urls = [loc for loc, mod in re.findall(r"<loc>(.*?)</loc>\s*<lastmod>(.*?)</lastmod>", sitemap) if mod >= since]
    if not urls:
        print("No pages changed since", since)
        return
    host = DOMAIN.split("//", 1)[1]
    body = json.dumps({"host": host, "key": INDEXNOW_KEY, "keyLocation": f"{DOMAIN}/{INDEXNOW_KEY}.txt",
                       "urlList": urls[:10000]}).encode("utf-8")
    req = urllib.request.Request("https://api.indexnow.org/indexnow", data=body,
                                 headers={"Content-Type": "application/json; charset=utf-8"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            print(f"Sent {len(urls)} pages. Reply: {r.status} (200 or 202 means accepted)")
    except urllib.error.HTTPError as e:
        print(f"Not accepted: {e.code}. 403 means the key file isn't live yet: deploy first, then try again.")


if __name__ == "__main__":
    main()

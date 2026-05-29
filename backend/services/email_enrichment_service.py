import httpx
import hashlib

DISPOSABLE_DOMAINS = {
    "mailinator.com", "tempmail.com", "guerrillamail.com", "10minutemail.com",
    "yopmail.com", "throwam.com", "sharklasers.com", "trashmail.com",
    "spam4.me", "maildrop.cc", "dispostable.com", "fakeinbox.com",
    "mailnull.com", "spamgourmet.com", "one-time.email", "1secmail.com",
    "1secmail.net", "1secmail.org", "tempinbox.com", "throwaway.email",
    "discard.email", "mailbox.in.ua", "spamd.de", "binkmail.com",
    "bobmail.info", "clrmail.com", "dingbone.com", "dump-email.info",
    "etranquil.com", "fakemail.net", "filzmail.com", "fly-log.com",
    "fuelservice.org", "getairmail.com", "girlsundertheinfluence.com",
    "gowikibooks.com", "gowikicampus.com", "gowikicars.com", "gowikifilms.com",
    "gowikigames.com", "gowikimusic.com", "gowikinetwork.com", "gowikitravel.com",
    "gowikitv.com", "hide.biz.st", "ieatspam.eu", "ieatspam.info",
    "jetable.fr.nf", "jnxjn.com", "jourrapide.com", "kasmail.com",
    "koszmail.pl", "lifebyfood.com", "link2mail.net", "litedrop.com",
    "lol.ovpn.to", "lolfreak.net", "lookugly.com", "lortemail.dk",
    "m21.cc", "mail.by", "mail.mezimages.net", "mail.zserv.com",
    "mail4trash.com", "mailbidon.com", "mailbiz.biz", "mailblocks.com",
    "mailbucket.org", "mailcat.biz", "mailcatch.com", "maildrop.cc",
    "maileater.com", "mailempty.com", "mailexpire.com", "mailf5.com",
    "mailfall.com", "mailfreeonline.com", "mailguard.me", "mailin8r.com",
    "mailinater.com", "mailinator2.com", "mailincubator.com", "mailismagic.com",
    "mailme.ir", "mailme24.com", "mailmetrash.com", "mailmoat.com",
    "mailna.me", "mailnew.com", "mailnull.com", "mailorg.org",
    "mailpick.biz", "mailproxsy.com", "mailquack.com", "mailrock.biz",
    "mailscrap.com", "mailseal.de", "mailshell.com", "mailsiphon.com",
    "mailslite.com", "mailslurping.com", "mailsnull.com", "mailspam.me",
}


async def enrich_email(email: str) -> dict:
    email = email.strip().lower()
    result = {"email": email}

    domain = email.split("@")[-1] if "@" in email else ""
    result["domain"] = domain
    result["is_disposable"] = domain in DISPOSABLE_DOMAINS

    # Extract username for social lookups
    username = email.split("@")[0] if "@" in email else email
    result["username"] = username

    # Gravatar (completely free)
    gravatar = await _check_gravatar(email)
    result["gravatar"] = gravatar

    # EmailRep.io (free tier: 10 req/day without key, 1000/month with free key)
    reputation = await _check_emailrep(email)
    if reputation:
        result["reputation"] = reputation

    return result


async def _check_gravatar(email: str) -> dict:
    email_hash = hashlib.md5(email.strip().lower().encode()).hexdigest()
    avatar_url = f"https://www.gravatar.com/avatar/{email_hash}?d=404&s=200"
    profile_url = f"https://gravatar.com/{email_hash}"

    try:
        async with httpx.AsyncClient(timeout=8, follow_redirects=False) as client:
            r = await client.get(avatar_url)
            has_account = r.status_code == 200
    except Exception:
        has_account = False

    if not has_account:
        return {"has_account": False}

    # Try to get profile JSON
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            pr = await client.get(f"https://www.gravatar.com/{email_hash}.json")
            if pr.status_code == 200:
                entry = pr.json().get("entry", [{}])[0]
                return {
                    "has_account": True,
                    "display_name": entry.get("displayName"),
                    "username": entry.get("preferredUsername"),
                    "location": entry.get("currentLocation"),
                    "about": entry.get("aboutMe"),
                    "avatar_url": f"https://www.gravatar.com/avatar/{email_hash}?s=200",
                    "profile_url": profile_url,
                    "linked_accounts": [
                        {"platform": a.get("shortname"), "url": a.get("url")}
                        for a in entry.get("accounts", [])
                    ],
                    "verified_accounts": entry.get("verified_accounts", []),
                }
    except Exception:
        pass

    return {
        "has_account": True,
        "avatar_url": f"https://www.gravatar.com/avatar/{email_hash}?s=200",
        "profile_url": profile_url,
    }


async def _check_emailrep(email: str) -> dict:
    try:
        async with httpx.AsyncClient(
            timeout=10,
            headers={"User-Agent": "AURA-OPS/1.0", "Key": ""}
        ) as client:
            r = await client.get(f"https://emailrep.io/{email}")
            if r.status_code == 200:
                data = r.json()
                attrs = data.get("details", {})
                return {
                    "reputation": data.get("reputation", "none"),
                    "suspicious": data.get("suspicious", False),
                    "references": data.get("references", 0),
                    "blacklisted": attrs.get("blacklisted", False),
                    "malicious_activity": attrs.get("malicious_activity", False),
                    "malicious_activity_recent": attrs.get("malicious_activity_recent", False),
                    "credentials_leaked": attrs.get("credentials_leaked", False),
                    "credentials_leaked_recent": attrs.get("credentials_leaked_recent", False),
                    "data_breach": attrs.get("data_breach", False),
                    "spam": attrs.get("spam", False),
                    "free_provider": attrs.get("free_provider", False),
                    "disposable": attrs.get("disposable", False),
                    "deliverable": attrs.get("deliverable"),
                    "accept_all": attrs.get("accept_all", False),
                    "valid_mx": attrs.get("valid_mx", False),
                    "profiles": attrs.get("profiles", []),
                    "first_seen": attrs.get("first_seen"),
                    "last_seen": attrs.get("last_seen"),
                    "domain_reputation": attrs.get("domain_reputation"),
                    "days_since_domain_creation": attrs.get("days_since_domain_creation"),
                }
            elif r.status_code == 429:
                return {"error": "Rate limit EmailRep.io (10/día sin key) — regístrate en emailrep.io para key gratuita"}
    except Exception as e:
        return {"error": str(e)}
    return {}

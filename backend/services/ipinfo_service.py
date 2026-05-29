import httpx


async def lookup(ip: str) -> dict:
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(f"https://ipinfo.io/{ip}/json")
            r.raise_for_status()
            data = r.json()
        loc = data.get("loc", ",").split(",")
        return {
            "ip": data.get("ip"),
            "hostname": data.get("hostname"),
            "city": data.get("city"),
            "region": data.get("region"),
            "country": data.get("country"),
            "org": data.get("org"),
            "timezone": data.get("timezone"),
            "lat": loc[0] if len(loc) >= 2 else None,
            "lon": loc[1] if len(loc) >= 2 else None,
        }
    except Exception as e:
        return {"error": str(e)}


async def lookup_abuseipdb(ip: str, key: str) -> dict:
    if not key:
        return {"error": "AbuseIPDB key not configured"}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                "https://api.abuseipdb.com/api/v2/check",
                headers={"Key": key, "Accept": "application/json"},
                params={"ipAddress": ip, "maxAgeInDays": 90}
            )
            r.raise_for_status()
            d = r.json().get("data", {})
        return {
            "abuse_confidence_score": d.get("abuseConfidenceScore", 0),
            "total_reports": d.get("totalReports", 0),
            "is_whitelisted": d.get("isWhitelisted", False),
            "country_code": d.get("countryCode"),
            "usage_type": d.get("usageType"),
            "isp": d.get("isp"),
            "domain": d.get("domain"),
            "last_reported": d.get("lastReportedAt"),
        }
    except Exception as e:
        return {"error": str(e)}

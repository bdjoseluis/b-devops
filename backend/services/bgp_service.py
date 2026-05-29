import httpx

BASE = "https://api.bgpview.io"
HEADERS = {"User-Agent": "AURA-OPS/1.0 OSINT Platform"}


async def lookup_ip(ip: str) -> dict:
    try:
        async with httpx.AsyncClient(timeout=15, headers=HEADERS) as client:
            r = await client.get(f"{BASE}/ip/{ip}")
            r.raise_for_status()
            data = r.json().get("data", {})
        prefixes = data.get("prefixes", [])
        rir = data.get("rir_allocation", {})
        return {
            "ip": ip,
            "ptr": data.get("ptr_record"),
            "rir": rir.get("rir_name"),
            "allocation_prefix": rir.get("prefix"),
            "allocation_date": rir.get("date_allocated"),
            "prefixes": [
                {
                    "prefix": p.get("prefix"),
                    "name": p.get("name"),
                    "description": p.get("description"),
                    "country": p.get("country_code"),
                    "asn": p.get("asn", {}).get("asn"),
                    "asn_name": p.get("asn", {}).get("name"),
                    "asn_description": p.get("asn", {}).get("description"),
                }
                for p in prefixes[:10]
            ],
        }
    except Exception as e:
        return {"error": str(e)}


async def lookup_asn(asn) -> dict:
    asn_num = str(asn).lstrip("ASas")
    try:
        async with httpx.AsyncClient(timeout=15, headers=HEADERS) as client:
            r = await client.get(f"{BASE}/asn/{asn_num}")
            r.raise_for_status()
            data = r.json().get("data", {})
        return {
            "asn": data.get("asn"),
            "name": data.get("name"),
            "description": data.get("description"),
            "country": data.get("country_code"),
            "rir": data.get("rir_allocation", {}).get("rir_name"),
            "website": data.get("website"),
            "email_contacts": data.get("email_contacts", [])[:5],
            "abuse_contacts": data.get("abuse_contacts", [])[:3],
            "looking_glass": data.get("looking_glass"),
            "traffic_estimation": data.get("traffic_estimation"),
        }
    except Exception as e:
        return {"error": str(e)}


async def get_asn_prefixes(asn) -> dict:
    asn_num = str(asn).lstrip("ASas")
    try:
        async with httpx.AsyncClient(timeout=15, headers=HEADERS) as client:
            r = await client.get(f"{BASE}/asn/{asn_num}/prefixes")
            r.raise_for_status()
            data = r.json().get("data", {})
        ipv4 = data.get("ipv4_prefixes", [])
        ipv6 = data.get("ipv6_prefixes", [])
        return {
            "asn": asn_num,
            "ipv4_count": len(ipv4),
            "ipv6_count": len(ipv6),
            "ipv4_prefixes": [
                {
                    "prefix": p.get("prefix"),
                    "name": p.get("name"),
                    "description": p.get("description"),
                    "country": p.get("country_code"),
                    "parent": p.get("parent", {}).get("prefix"),
                }
                for p in ipv4[:30]
            ],
            "ipv6_prefixes": [
                {
                    "prefix": p.get("prefix"),
                    "name": p.get("name"),
                    "country": p.get("country_code"),
                }
                for p in ipv6[:10]
            ],
        }
    except Exception as e:
        return {"error": str(e)}


async def get_asn_peers(asn) -> dict:
    asn_num = str(asn).lstrip("ASas")
    try:
        async with httpx.AsyncClient(timeout=15, headers=HEADERS) as client:
            r = await client.get(f"{BASE}/asn/{asn_num}/peers")
            r.raise_for_status()
            data = r.json().get("data", {})
        upstream = data.get("ipv4_upstreams", [])
        downstream = data.get("ipv4_downstreams", [])
        return {
            "asn": asn_num,
            "upstream_count": len(upstream),
            "downstream_count": len(downstream),
            "upstreams": [{"asn": p.get("asn"), "name": p.get("name"), "country": p.get("country_code")} for p in upstream[:15]],
            "downstreams": [{"asn": p.get("asn"), "name": p.get("name"), "country": p.get("country_code")} for p in downstream[:15]],
        }
    except Exception as e:
        return {"error": str(e)}

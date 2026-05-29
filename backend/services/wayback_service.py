import httpx
from datetime import datetime


async def check_availability(url: str) -> dict:
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                "https://archive.org/wayback/available",
                params={"url": url}
            )
            r.raise_for_status()
            data = r.json()
        snap = data.get("archived_snapshots", {}).get("closest", {})
        return {
            "url": url,
            "available": snap.get("available", False),
            "snapshot_url": snap.get("url"),
            "timestamp": snap.get("timestamp"),
            "status": snap.get("status"),
        }
    except Exception as e:
        return {"error": str(e)}


async def get_snapshots(url: str, limit: int = 20, from_year: int = None, to_year: int = None) -> dict:
    params = {
        "url": url,
        "output": "json",
        "limit": limit,
        "fl": "timestamp,statuscode,mimetype,length",
        "filter": "statuscode:200",
        "collapse": "timestamp:8",  # one per day
    }
    if from_year:
        params["from"] = f"{from_year}0101"
    if to_year:
        params["to"] = f"{to_year}1231"

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get("https://web.archive.org/cdx/search/cdx", params=params)
            r.raise_for_status()
            lines = r.text.strip().split("\n")

        snapshots = []
        for line in lines[1:]:  # skip header
            parts = line.split(" ")
            if len(parts) >= 4:
                ts = parts[0]
                try:
                    dt = datetime.strptime(ts, "%Y%m%d%H%M%S")
                    formatted = dt.strftime("%Y-%m-%d %H:%M")
                except Exception:
                    formatted = ts
                snapshots.append({
                    "timestamp": ts,
                    "date": formatted,
                    "status": parts[1],
                    "mimetype": parts[2],
                    "length": parts[3],
                    "url": f"https://web.archive.org/web/{ts}/{url}",
                })

        return {
            "url": url,
            "total": len(snapshots),
            "snapshots": snapshots,
            "first": snapshots[-1] if snapshots else None,
            "last": snapshots[0] if snapshots else None,
        }
    except Exception as e:
        return {"error": str(e)}


async def get_changes_timeline(url: str) -> dict:
    """Get yearly snapshot count to show activity timeline"""
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(
                "https://web.archive.org/cdx/search/cdx",
                params={
                    "url": url,
                    "output": "json",
                    "fl": "timestamp",
                    "filter": "statuscode:200",
                    "collapse": "timestamp:4",  # one per year
                    "limit": 50,
                }
            )
            r.raise_for_status()
            lines = r.text.strip().split("\n")

        yearly = {}
        for line in lines[1:]:
            year = line[:4]
            yearly[year] = yearly.get(year, 0) + 1

        return {
            "url": url,
            "years_active": sorted(yearly.keys()),
            "timeline": yearly,
            "total_years": len(yearly),
        }
    except Exception as e:
        return {"error": str(e)}

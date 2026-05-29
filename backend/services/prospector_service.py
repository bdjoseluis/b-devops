import httpx
import asyncio
import ssl
import socket
from config_manager import get_api_key

"""
Business Prospector — finds local businesses and evaluates their digital presence.
Sources: Google Places API (with key) + OpenStreetMap Overpass (free fallback)
"""


async def search_businesses(
    location: str,
    category: str = "empresa",
    radius_km: int = 10,
    limit: int = 30,
) -> dict:
    """Search businesses in an area"""
    key = get_api_key("google_places")
    if key:
        return await _search_google_places(location, category, radius_km, limit, key)
    else:
        return await _search_osm(location, category, radius_km, limit)


async def _search_google_places(location: str, category: str, radius_km: int, limit: int, key: str) -> dict:
    """Use Google Places API"""
    # First geocode the location
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            geo_r = await client.get(
                "https://maps.googleapis.com/maps/api/geocode/json",
                params={"address": location, "key": key}
            )
            geo_r.raise_for_status()
            geo_data = geo_r.json()

        if not geo_data.get("results"):
            return {"error": f"No se pudo geocodificar: {location}"}

        loc = geo_data["results"][0]["geometry"]["location"]
        lat, lng = loc["lat"], loc["lng"]
        formatted_address = geo_data["results"][0]["formatted_address"]

        # Search nearby businesses
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(
                "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
                params={
                    "location": f"{lat},{lng}",
                    "radius": radius_km * 1000,
                    "keyword": category,
                    "key": key,
                    "language": "es"
                }
            )
            r.raise_for_status()
            data = r.json()

        businesses = []
        for place in data.get("results", [])[:limit]:
            businesses.append({
                "name": place.get("name"),
                "address": place.get("vicinity"),
                "rating": place.get("rating"),
                "user_ratings_total": place.get("user_ratings_total"),
                "types": place.get("types", []),
                "place_id": place.get("place_id"),
                "lat": place.get("geometry", {}).get("location", {}).get("lat"),
                "lng": place.get("geometry", {}).get("location", {}).get("lng"),
                "website": None,  # Will be enriched
                "phone": None,
            })

        # Enrich top 10 with details
        top = businesses[:10]
        enriched = await asyncio.gather(*[_get_place_details(b, key) for b in top])
        businesses[:10] = list(enriched)

        # Analyze digital presence
        result = await _analyze_digital_presence(businesses)

        return {
            "location": formatted_address,
            "lat": lat,
            "lng": lng,
            "category": category,
            "radius_km": radius_km,
            "total": len(businesses),
            "businesses": result,
            "source": "Google Places",
        }
    except Exception as e:
        return {"error": str(e)}


async def _get_place_details(business: dict, key: str) -> dict:
    place_id = business.get("place_id")
    if not place_id:
        return business
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                "https://maps.googleapis.com/maps/api/place/details/json",
                params={
                    "place_id": place_id,
                    "fields": "website,formatted_phone_number,opening_hours,email",
                    "key": key,
                    "language": "es"
                }
            )
            r.raise_for_status()
            result = r.json().get("result", {})
        business["website"] = result.get("website")
        business["phone"] = result.get("formatted_phone_number")
        business["open_now"] = result.get("opening_hours", {}).get("open_now")
        return business
    except Exception:
        return business


async def _search_osm(location: str, category: str, radius_km: int, limit: int) -> dict:
    """Free fallback using OpenStreetMap Overpass API"""
    # First geocode with Nominatim
    try:
        async with httpx.AsyncClient(
            timeout=15,
            headers={"User-Agent": "AURA-OPS-Prospector/1.0"}
        ) as client:
            geo_r = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": location, "format": "json", "limit": 1}
            )
            geo_r.raise_for_status()
            geo_data = geo_r.json()

        if not geo_data:
            return {"error": f"No se pudo geocodificar: {location}"}

        lat = float(geo_data[0]["lat"])
        lng = float(geo_data[0]["lon"])
        display_name = geo_data[0]["display_name"]

        # Overpass query for businesses
        radius_m = radius_km * 1000
        # Build query based on category
        osm_tags = _category_to_osm_tags(category)
        tag_filter = "".join(f'node["{k}"="{v}"](around:{radius_m},{lat},{lng});' for k, v in osm_tags)

        overpass_query = f"""
        [out:json][timeout:25];
        ({tag_filter}
        way["shop"](around:{radius_m},{lat},{lng});
        way["office"](around:{radius_m},{lat},{lng});
        node["office"](around:{radius_m},{lat},{lng});
        node["shop"](around:{radius_m},{lat},{lng});
        );
        out body {limit};
        """

        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                "https://overpass-api.de/api/interpreter",
                content=overpass_query
            )
            r.raise_for_status()
            data = r.json()

        businesses = []
        for element in data.get("elements", [])[:limit]:
            tags = element.get("tags", {})
            name = tags.get("name") or tags.get("brand")
            if not name:
                continue
            businesses.append({
                "name": name,
                "address": _build_address(tags),
                "phone": tags.get("phone") or tags.get("contact:phone"),
                "website": tags.get("website") or tags.get("contact:website"),
                "email": tags.get("email") or tags.get("contact:email"),
                "types": [tags.get("shop", tags.get("office", tags.get("amenity", "empresa")))],
                "lat": element.get("lat"),
                "lng": element.get("lon"),
                "rating": None,
            })

        result = await _analyze_digital_presence(businesses)

        return {
            "location": display_name,
            "lat": lat,
            "lng": lng,
            "category": category,
            "radius_km": radius_km,
            "total": len(businesses),
            "businesses": result,
            "source": "OpenStreetMap",
        }
    except Exception as e:
        return {"error": str(e)}


def _category_to_osm_tags(category: str) -> list[tuple]:
    mapping = {
        "restaurante": [("amenity", "restaurant"), ("amenity", "cafe"), ("amenity", "fast_food")],
        "tienda": [("shop", "clothes"), ("shop", "electronics"), ("shop", "general")],
        "empresa": [("office", "company"), ("office", "it"), ("office", "consulting")],
        "medico": [("amenity", "clinic"), ("amenity", "doctors"), ("healthcare", "clinic")],
        "abogado": [("office", "lawyer"), ("office", "notary")],
        "hotel": [("tourism", "hotel"), ("tourism", "hostel")],
        "gym": [("leisure", "fitness_centre"), ("amenity", "gym")],
        "farmacia": [("amenity", "pharmacy")],
    }
    return mapping.get(category.lower(), [("office", "company")])


def _build_address(tags: dict) -> str:
    parts = []
    if tags.get("addr:street"):
        parts.append(tags["addr:street"])
        if tags.get("addr:housenumber"):
            parts[-1] += f" {tags['addr:housenumber']}"
    if tags.get("addr:city"):
        parts.append(tags["addr:city"])
    return ", ".join(parts) if parts else "Sin dirección"


async def _analyze_digital_presence(businesses: list[dict]) -> list[dict]:
    """Check website health, SSL, tech stack for each business"""
    tasks = [_check_business_online(b) for b in businesses]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    out = []
    for res in results:
        if isinstance(res, Exception):
            out.append({"error": str(res)})
        else:
            out.append(res)
    return out


async def _check_business_online(business: dict) -> dict:
    website = business.get("website")

    if not website:
        business["has_website"] = False
        business["opportunity_score"] = 90
        business["opportunity_label"] = "🔥 SIN WEB"
        business["web_analysis"] = None
        return business

    # Ensure URL has scheme
    if not website.startswith(("http://", "https://")):
        website = f"https://{website}"
        business["website"] = website

    try:
        async with httpx.AsyncClient(
            timeout=8,
            follow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0 (compatible; AURA-OPS/1.0)"}
        ) as client:
            r = await client.get(website)

        # Detect tech stack from headers and body
        server = r.headers.get("server", "")
        x_powered = r.headers.get("x-powered-by", "")
        content = r.text[:3000]

        tech = []
        if "wordpress" in content.lower() or "wp-content" in content.lower():
            tech.append("WordPress")
        if "joomla" in content.lower():
            tech.append("Joomla")
        if "drupal" in content.lower():
            tech.append("Drupal")
        if "wix.com" in content.lower():
            tech.append("Wix")
        if "squarespace" in content.lower():
            tech.append("Squarespace")
        if "shopify" in content.lower():
            tech.append("Shopify")
        if "jquery" in content.lower():
            tech.append("jQuery")
        if "bootstrap" in content.lower():
            tech.append("Bootstrap")
        if server:
            tech.append(f"Server: {server}")

        # Check SSL
        has_ssl = website.startswith("https://")
        ssl_days = None
        if has_ssl:
            try:
                domain = website.replace("https://", "").split("/")[0]
                ctx = ssl.create_default_context()
                with ctx.wrap_socket(socket.socket(), server_hostname=domain) as s:
                    s.settimeout(3)
                    s.connect((domain, 443))
                    cert = s.getpeercert()
                from datetime import datetime
                not_after = datetime.strptime(cert["notAfter"], "%b %d %H:%M:%S %Y %Z")
                ssl_days = (not_after - datetime.utcnow()).days
            except Exception:
                ssl_days = None

        # Mobile check (very basic)
        is_mobile_friendly = "viewport" in content.lower()

        # Score opportunity (lower is better website, higher = more opportunity for us)
        score = 0
        issues = []
        if not has_ssl:
            score += 30
            issues.append("Sin HTTPS")
        if ssl_days is not None and ssl_days < 30:
            score += 20
            issues.append(f"SSL expira en {ssl_days}d")
        if not is_mobile_friendly:
            score += 25
            issues.append("Sin diseño responsive")
        if "WordPress" in tech and len(tech) == 1:
            score += 15
            issues.append("WordPress desactualizado probable")
        if r.elapsed.total_seconds() > 3:
            score += 10
            issues.append(f"Web lenta ({r.elapsed.total_seconds():.1f}s)")

        if score >= 50:
            label = "🔥 ALTA OPORTUNIDAD"
        elif score >= 25:
            label = "⚡ OPORTUNIDAD MEDIA"
        else:
            label = "✅ Bien establecidos"

        business["has_website"] = True
        business["opportunity_score"] = score
        business["opportunity_label"] = label
        business["web_analysis"] = {
            "status_code": r.status_code,
            "has_ssl": has_ssl,
            "ssl_days": ssl_days,
            "is_mobile_friendly": is_mobile_friendly,
            "tech_stack": tech,
            "load_time_s": round(r.elapsed.total_seconds(), 2),
            "issues": issues,
        }
        return business

    except Exception as e:
        business["has_website"] = True
        business["opportunity_score"] = 70
        business["opportunity_label"] = "⚠️ WEB CON PROBLEMAS"
        business["web_analysis"] = {"error": str(e), "issues": ["Web inaccesible"]}
        return business


async def analyze_single(website: str) -> dict:
    """Analyze a single website for opportunity"""
    b = {"website": website, "name": website}
    result = await _check_business_online(b)
    return result

import asyncio
from fastapi import APIRouter
from services import prospector_service

router = APIRouter(prefix="/api/prospector", tags=["prospector"])

PROVINCE_CITIES = {
    "alicante": [
        "Alicante", "Elche", "Torrevieja", "Orihuela", "Benidorm",
        "Alcoy", "Villena", "San Vicente del Raspeig", "Elda", "Petrer",
        "Dénia", "Calpe", "Ibi", "Crevillent", "Guardamar del Segura",
        "Novelda", "Jávea", "Altea", "Santa Pola", "Mutxamel",
    ],
    "murcia": [
        "Murcia", "Cartagena", "Lorca", "Molina de Segura", "Alcantarilla",
        "Yecla", "Cieza", "Caravaca de la Cruz", "Totana", "Águilas",
        "Mazarrón", "San Javier", "Torre-Pacheco", "Jumilla", "Cehegín",
        "San Pedro del Pinatar", "Alhama de Murcia", "Santomera", "Las Torres de Cotillas",
    ],
    "valencia": [
        "Valencia", "Gandia", "Torrent", "Paterna", "Sagunto",
        "Mislata", "Burjassot", "Alzira", "Manises", "Ontinyent",
        "Cullera", "Sueca", "Xàtiva", "Llíria", "Quart de Poblet",
        "Xirivella", "Aldaia", "Benifaió", "Paiporta", "Catarroja",
    ],
    "barcelona": [
        "Barcelona", "Badalona", "Hospitalet de Llobregat", "Terrassa", "Sabadell",
        "Mataró", "Santa Coloma de Gramenet", "Cornellà de Llobregat", "Sant Boi de Llobregat", "Rubí",
        "Manresa", "Vilanova i la Geltrú", "Viladecans", "El Prat de Llobregat", "Mollet del Vallès",
        "Granollers", "Gavà", "Esplugues de Llobregat", "Castelldefels", "Cerdanyola del Vallès",
    ],
    "madrid": [
        "Madrid", "Móstoles", "Alcalá de Henares", "Fuenlabrada", "Leganés",
        "Getafe", "Alcorcón", "Torrejón de Ardoz", "Parla", "Alcobendas",
        "Las Rozas de Madrid", "Pozuelo de Alarcón", "San Sebastián de los Reyes", "Majadahonda", "Collado Villalba",
        "Arganda del Rey", "Coslada", "Valdemoro", "Aranjuez", "Galapagar",
    ],
    "sevilla": [
        "Sevilla", "Dos Hermanas", "Alcalá de Guadaíra", "Jerez de la Frontera", "Utrera",
        "Mairena del Aljarafe", "La Rinconada", "Écija", "Camas", "Carmona",
        "San Juan de Aznalfarache", "Marchena", "Morón de la Frontera", "Lebrija", "Osuna",
    ],
    "malaga": [
        "Málaga", "Marbella", "Vélez-Málaga", "Mijas", "Fuengirola",
        "Torremolinos", "Benalmádena", "Estepona", "Antequera", "Ronda",
        "Nerja", "Alhaurín de la Torre", "Alhaurín el Grande", "Coín", "Cártama",
    ],
    "zaragoza": [
        "Zaragoza", "Calatayud", "Ejea de los Caballeros", "Tarazona", "Caspe",
        "Utebo", "Cuarte de Huerva", "María de Huerva", "La Muela", "Zuera",
    ],
    "bilbao": [
        "Bilbao", "Barakaldo", "Getxo", "Leioa", "Basauri",
        "Santurtzi", "Portugalete", "Sestao", "Galdakao", "Durango",
        "Erandio", "Ermua", "Amorebieta-Etxano", "Mungia", "Gernika-Lumo",
    ],
    "granada": [
        "Granada", "Motril", "Almuñécar", "Loja", "Guadix",
        "Maracena", "Armilla", "Albolote", "Peligros", "La Zubia",
        "Baza", "Huétor Tájar", "Pulianas", "Atarfe", "Ogíjares",
    ],
}


@router.post("/search")
async def search(body: dict):
    return await prospector_service.search_businesses(
        location=body.get("location", ""),
        category=body.get("category", "empresa"),
        radius_km=body.get("radius_km", 10),
        limit=body.get("limit", 30),
    )


@router.post("/analyze")
async def analyze_website(body: dict):
    return await prospector_service.analyze_single(body.get("website", ""))


@router.post("/province")
async def province_scan(body: dict):
    """Scan all major cities in a province for business opportunities."""
    province = body.get("province", "alicante").lower()
    category = body.get("category", "empresa")
    radius_km = body.get("radius_km", 5)
    limit_per_city = body.get("limit_per_city", 15)
    max_cities = body.get("max_cities", 8)

    cities = PROVINCE_CITIES.get(province, PROVINCE_CITIES["alicante"])[:max_cities]

    async def search_city(city: str) -> dict:
        result = await prospector_service.search_businesses(
            location=f"{city}, {province.capitalize()}, España",
            category=category,
            radius_km=radius_km,
            limit=limit_per_city,
        )
        return {"city": city, "data": result}

    # Run all cities in parallel (batches of 3 to avoid rate limits)
    all_results = []
    for i in range(0, len(cities), 3):
        batch = cities[i:i+3]
        batch_results = await asyncio.gather(*[search_city(c) for c in batch], return_exceptions=True)
        for r in batch_results:
            if isinstance(r, Exception):
                all_results.append({"city": "Error", "data": {"error": str(r)}})
            else:
                all_results.append(r)

    # Aggregate stats
    total_businesses = sum(r["data"].get("total", 0) for r in all_results if not r["data"].get("error"))
    high_opportunities = []
    for r in all_results:
        for b in r["data"].get("businesses", []):
            if b.get("opportunity_score", 0) >= 50:
                b["city"] = r["city"]
                high_opportunities.append(b)

    high_opportunities.sort(key=lambda x: x.get("opportunity_score", 0), reverse=True)

    return {
        "province": province.capitalize(),
        "category": category,
        "cities_scanned": len(all_results),
        "total_businesses": total_businesses,
        "high_opportunity_count": len(high_opportunities),
        "top_opportunities": high_opportunities[:20],
        "cities": all_results,
    }


@router.get("/provinces")
async def list_provinces():
    labels = {
        "alicante": "Alicante", "murcia": "Murcia", "valencia": "Valencia",
        "barcelona": "Barcelona", "madrid": "Madrid", "sevilla": "Sevilla",
        "malaga": "Málaga", "zaragoza": "Zaragoza", "bilbao": "Bilbao (Vizcaya)",
        "granada": "Granada",
    }
    return {
        "provinces": [
            {"id": k, "name": labels.get(k, k.capitalize()), "cities": len(v)}
            for k, v in PROVINCE_CITIES.items()
        ]
    }

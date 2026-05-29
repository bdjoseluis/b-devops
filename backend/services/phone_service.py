import httpx
import re
from config_manager import get_api_key

try:
    import phonenumbers
    from phonenumbers import geocoder, carrier as pn_carrier, timezone as pn_tz
    HAS_PHONENUMBERS = True
except ImportError:
    HAS_PHONENUMBERS = False


async def lookup_phone(phone: str) -> dict:
    cleaned = re.sub(r'[\s\-\.\(\)]', '', phone.strip())
    result = {"raw": phone, "cleaned": cleaned}

    # Free: phonenumbers library (parses format, carrier, country)
    if HAS_PHONENUMBERS:
        try:
            # Try with +34 prefix if no country code
            parse_target = cleaned if cleaned.startswith('+') else f'+{cleaned}'
            parsed = phonenumbers.parse(parse_target, None)
            result.update({
                "valid": phonenumbers.is_valid_number(parsed),
                "possible": phonenumbers.is_possible_number(parsed),
                "country_code": str(parsed.country_code),
                "national_number": str(parsed.national_number),
                "international_format": phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.INTERNATIONAL),
                "e164_format": phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164),
                "country": geocoder.description_for_number(parsed, "es"),
                "carrier_name": pn_carrier.name_for_number(parsed, "es"),
                "number_type": _get_number_type(phonenumbers.number_type(parsed)),
                "timezones": list(pn_tz.time_zones_for_number(parsed)),
            })
        except Exception as e:
            # Try again with Spain prefix
            try:
                parsed = phonenumbers.parse(cleaned, "ES")
                result.update({
                    "valid": phonenumbers.is_valid_number(parsed),
                    "country": geocoder.description_for_number(parsed, "es"),
                    "carrier_name": pn_carrier.name_for_number(parsed, "es"),
                    "number_type": _get_number_type(phonenumbers.number_type(parsed)),
                    "international_format": phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.INTERNATIONAL),
                })
            except Exception:
                result["parse_error"] = str(e)
    else:
        result["note"] = "Instala 'phonenumbers' para análisis avanzado: pip install phonenumbers"

    # NumVerify API (paid, key in config)
    key = get_api_key("numverify")
    if key:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get(
                    "http://apilayer.net/api/validate",
                    params={"access_key": key, "number": cleaned, "format": 1}
                )
                data = r.json()
            if not data.get("error"):
                result["numverify"] = {
                    "valid": data.get("valid"),
                    "local_format": data.get("local_format"),
                    "international_format": data.get("international_format"),
                    "country_prefix": data.get("country_prefix"),
                    "country_code": data.get("country_code"),
                    "country_name": data.get("country_name"),
                    "location": data.get("location"),
                    "carrier": data.get("carrier"),
                    "line_type": data.get("line_type"),
                }
        except Exception as e:
            result["numverify_error"] = str(e)

    # Generate OSINT dorks for the number
    result["osint_dorks"] = _generate_phone_dorks(cleaned)

    # LeakCheck: search in DeHashed if key available
    from config_manager import load_config
    cfg = load_config()
    dehashed_key = cfg.get("apis", {}).get("dehashed", "")
    dehashed_email = cfg.get("apis", {}).get("dehashed_email", "")
    if dehashed_key and dehashed_email:
        try:
            from services import dehashed_service
            leaks = await dehashed_service.search(query=cleaned, query_type="phone", size=5)
            if not leaks.get("error"):
                result["breach_check"] = {
                    "found": leaks.get("total", 0) > 0,
                    "total": leaks.get("total", 0),
                    "entries": leaks.get("entries", [])[:5],
                }
        except Exception:
            pass

    return result


def _get_number_type(num_type) -> str:
    if not HAS_PHONENUMBERS:
        return "Desconocido"
    import phonenumbers
    types = {
        phonenumbers.PhoneNumberType.MOBILE: "Móvil",
        phonenumbers.PhoneNumberType.FIXED_LINE: "Fijo",
        phonenumbers.PhoneNumberType.FIXED_LINE_OR_MOBILE: "Fijo o Móvil",
        phonenumbers.PhoneNumberType.TOLL_FREE: "Gratuito (800)",
        phonenumbers.PhoneNumberType.PREMIUM_RATE: "Tarifa Premium",
        phonenumbers.PhoneNumberType.VOIP: "VoIP",
        phonenumbers.PhoneNumberType.PERSONAL_NUMBER: "Personal",
        phonenumbers.PhoneNumberType.PAGER: "Pager",
        phonenumbers.PhoneNumberType.UNKNOWN: "Desconocido",
    }
    return types.get(num_type, "Desconocido")


def _generate_phone_dorks(phone: str) -> list:
    variants = set()
    variants.add(phone)
    if phone.startswith('+'):
        variants.add(phone[1:])
        variants.add(phone[1:].replace(" ", ""))
    # Remove non-digits for additional variant
    digits_only = re.sub(r'\D', '', phone)
    if digits_only:
        variants.add(digits_only)

    dorks = []
    for v in list(variants)[:2]:
        dorks.extend([
            f'"{v}"',
            f'"{v}" site:linkedin.com',
            f'"{v}" site:facebook.com OR site:instagram.com',
            f'"{v}" "whatsapp" OR "telegram"',
            f'"{v}" filetype:xls OR filetype:csv OR filetype:pdf',
            f'site:truecaller.com "{v}"',
        ])
    return dorks[:10]

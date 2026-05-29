import dns.resolver
import dns.reversename
import asyncio
import socket


async def lookup_all(domain: str) -> dict:
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, _do_dns_lookup, domain)
    return result


def _do_dns_lookup(domain: str) -> dict:
    records = {}
    resolver = dns.resolver.Resolver()
    resolver.timeout = 5
    resolver.lifetime = 8

    for rtype in ["A", "AAAA", "MX", "NS", "TXT", "SOA", "CNAME"]:
        try:
            answers = resolver.resolve(domain, rtype)
            if rtype == "MX":
                records[rtype] = [
                    {"priority": r.preference, "exchange": str(r.exchange).rstrip(".")}
                    for r in answers
                ]
            elif rtype == "SOA":
                r = answers[0]
                records[rtype] = {
                    "mname": str(r.mname).rstrip("."),
                    "rname": str(r.rname).rstrip("."),
                    "serial": r.serial,
                    "refresh": r.refresh,
                    "retry": r.retry,
                    "expire": r.expire,
                    "minimum": r.minimum,
                }
            else:
                records[rtype] = [str(r) for r in answers]
        except Exception:
            records[rtype] = []

    # SPF / DMARC from TXT
    spf = [t for t in records.get("TXT", []) if "v=spf1" in t.lower()]
    records["SPF"] = spf[0] if spf else None

    try:
        dmarc = resolver.resolve(f"_dmarc.{domain}", "TXT")
        records["DMARC"] = [str(r) for r in dmarc]
    except Exception:
        records["DMARC"] = []

    # Reverse DNS for first A record
    a_records = records.get("A", [])
    if a_records:
        records["PTR"] = _reverse_dns(a_records[0])
        records["resolved_ip"] = a_records[0]
    else:
        records["PTR"] = None
        records["resolved_ip"] = None

    return records


def _reverse_dns(ip: str) -> str | None:
    try:
        rev = dns.reversename.from_address(ip)
        result = dns.resolver.resolve(rev, "PTR")
        return str(result[0]).rstrip(".")
    except Exception:
        try:
            return socket.gethostbyaddr(ip)[0]
        except Exception:
            return None

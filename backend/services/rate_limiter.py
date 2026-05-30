"""
Rate limiter en memoria — sin dependencias externas.
Uso: añadir Depends(RateLimiter(calls=10, period=60)) al endpoint.
"""
import time
from collections import defaultdict
from fastapi import Request, HTTPException


class RateLimiter:
    def __init__(self, calls: int = 20, period: int = 60):
        self.calls  = calls
        self.period = period
        self._store: dict[str, list[float]] = defaultdict(list)
        self._last_gc: float = 0.0

    async def __call__(self, request: Request):
        ip  = request.client.host if request.client else "unknown"
        key = f"{ip}:{request.url.path}"
        now = time.time()
        window = now - self.period

        self._store[key] = [t for t in self._store[key] if t > window]
        if len(self._store[key]) >= self.calls:
            raise HTTPException(
                status_code=429,
                detail=f"Límite de {self.calls} llamadas por {self.period}s superado. Espera un momento."
            )
        self._store[key].append(now)

        # Purge empty keys every 5 minutes to prevent unbounded growth
        if now - self._last_gc > 300:
            self._last_gc = now
            stale = [k for k, v in self._store.items() if not v]
            for k in stale:
                del self._store[k]


# Instancias reutilizables por tipo de endpoint
osint_limiter   = RateLimiter(calls=30, period=60)   # 30 req/min por IP para OSINT
scan_limiter    = RateLimiter(calls=5,  period=60)   # 5 req/min para escaneos (nmap, etc.)
ai_limiter      = RateLimiter(calls=20, period=60)   # 20 req/min para IA
report_limiter  = RateLimiter(calls=10, period=60)   # 10 req/min para reportes

-- ─────────────────────────────────────────────────────────────────
-- B-DEVOPS — ClickHouse schema inicial
-- Se ejecuta automáticamente al primer arranque del contenedor
-- ─────────────────────────────────────────────────────────────────

CREATE DATABASE IF NOT EXISTS bdev_analytics;

-- Resultados de auditorías OSINT
CREATE TABLE IF NOT EXISTS bdev_analytics.audit_results (
    id           UUID DEFAULT generateUUIDv4(),
    target       String,
    target_type  LowCardinality(String),
    risk_level   LowCardinality(String),
    modules_run  UInt8,
    findings     UInt16,
    created_at   DateTime DEFAULT now(),
    data_json    String   -- JSON completo del resultado
) ENGINE = MergeTree()
ORDER BY (created_at, target_type)
TTL created_at + INTERVAL 1 YEAR;

-- Eventos de scan individual (Nmap, Nikto, etc.)
CREATE TABLE IF NOT EXISTS bdev_analytics.scan_events (
    id          UUID DEFAULT generateUUIDv4(),
    tool        LowCardinality(String),
    target      String,
    status      LowCardinality(String),
    duration_ms UInt32,
    created_at  DateTime DEFAULT now(),
    result_json String
) ENGINE = MergeTree()
ORDER BY (created_at, tool)
TTL created_at + INTERVAL 6 MONTH;

-- Métricas de uso de APIs externas
CREATE TABLE IF NOT EXISTS bdev_analytics.api_calls (
    api          LowCardinality(String),
    endpoint     String,
    status_code  UInt16,
    latency_ms   UInt32,
    success      UInt8,
    created_at   DateTime DEFAULT now()
) ENGINE = MergeTree()
ORDER BY (created_at, api)
TTL created_at + INTERVAL 3 MONTH;

-- Vista: resumen diario de auditorías
CREATE VIEW IF NOT EXISTS bdev_analytics.daily_summary AS
SELECT
    toDate(created_at)  AS day,
    target_type,
    risk_level,
    count()             AS total,
    avg(findings)       AS avg_findings
FROM bdev_analytics.audit_results
GROUP BY day, target_type, risk_level
ORDER BY day DESC;

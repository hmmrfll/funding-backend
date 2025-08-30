SELECT
	f1.symbol,
	f1.rate as extended_rate,
	f1.timestamp,
	f2.rate as hyperliquid_rate
FROM funding_rates f1
LEFT JOIN funding_rates f2 ON (
	f1.symbol = f2.symbol
	AND f1.timestamp = f2.timestamp
	AND f2.exchange = 'hyperliquid'
)
WHERE f1.exchange = 'extended'
	AND f1.symbol = $1
	AND f1.timestamp >= $2
	AND f1.timestamp <= $3
ORDER BY f1.timestamp DESC

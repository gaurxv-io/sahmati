# Sahmati
DPDP compliance for Indian schools: parent consent on WhatsApp, a tamper-evident consent ledger, parent-rights requests, and the DPDP Ready School badge.
Routes: / (site), /login, /app (console: students, requests, ledger, report, settings), /c/:studentId (parent consent, EN/HI), /verify/:receipt (public receipt check).
Demo data lives in localStorage and syncs across tabs; "Reset demo" restores the sample school. Not real yet: OTP is shown on screen instead of SMS, and WhatsApp buttons open a pre-filled chat instead of the WhatsApp Business API.

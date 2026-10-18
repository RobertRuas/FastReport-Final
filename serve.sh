#!/bin/sh
# Serve o protótipo na rede local para abrir no iPhone.
cd "$(dirname "$0")/dist" || exit 1
PORT=${PORT:-4173}
IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}')
echo ""
echo "  FastReport Mobile a correr."
echo "  No iPhone (mesma rede Wi-Fi), abre no Safari:  http://$IP:$PORT"
echo "  Ctrl+C para parar."
echo ""
exec python3 -m http.server "$PORT" --bind 0.0.0.0

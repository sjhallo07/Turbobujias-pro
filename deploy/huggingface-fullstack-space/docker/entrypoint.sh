#!/usr/bin/env bash
set -euo pipefail

mkdir -p /var/log/supervisor /run/nginx
exec /usr/bin/supervisord -c /etc/supervisor/supervisord.conf -n

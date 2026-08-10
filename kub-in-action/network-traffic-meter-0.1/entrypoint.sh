#!/bin/sh

echo "[traffic-meter] Starting traffic meter..."

INTERFACE="eth0"

read_counters() {
  awk -v iface="$1:" '$1 == iface {print $2, $10}' /proc/net/dev
}

read rx1 tx1 <<EOF
$(read_counters "$INTERFACE")
EOF

while true; do
  sleep 10

  read rx2 tx2 <<EOF
$(read_counters "$INTERFACE")
EOF

  rx_diff=$((rx2 - rx1))
  tx_diff=$((tx2 - tx1))

  echo "[traffic-meter] Inbound: $rx_diff bytes, Outbound: $tx_diff bytes (last 10s)"

  rx1=$rx2
  tx1=$tx2
done
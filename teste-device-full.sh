#!/usr/bin/env bash
# Testes completos para DEVICE e SERVER (cURL + jq)
# Ajuste DEVICE_IP, SERVER_IP, SERVER_PORT, LOGIN, PASSWORD, TEST_IMAGE conforme necessário.

set -eo pipefail

DEVICE_IP="${DEVICE_IP:-192.168.10.62}"
SERVER_IP="${SERVER_IP:-192.168.10.18}"
SERVER_PORT="${SERVER_PORT:-3001}"
LOGIN="${LOGIN:-admin}"
PASSWORD="${PASSWORD:-admin}"
TEST_IMAGE="${TEST_IMAGE:-./test-photo.jpg}"
TMP=$(mktemp -d)

print() { printf "\n====== %s ======\n" "$1"; }

run_cmd() {
  echo "-> $*"
  "$@" 2>/dev/null | sed 's/^/    /' || true
}

curl_json() {
  local url="$1" method="${2:-GET}" data="${3:-}"
  if [ -n "$data" ]; then
    curl -s -w "\n__STATUS__:%{http_code}\n" -X "$method" "$url" -H "Content-Type: application/json" -d "$data" || true
  else
    curl -s -w "\n__STATUS__:%{http_code}\n" -X "$method" "$url" || true
  fi
}

# 1) Login
print "LOGIN (device)"
RESP=$(curl_json "http://$DEVICE_IP/login.fcgi" POST "{\"login\":\"$LOGIN\",\"password\":\"$PASSWORD\"}")
echo "$RESP" | sed 's/^/    /'
SESSION=$(echo "$RESP" | sed -n 's/.*"session":"\([^"]*\)".*/\1/p' || true)
if [ -z "$SESSION" ]; then
  echo "    [ERRO] Falha ao obter session."
else
  echo "    Session: $SESSION"
fi

# 2) System info
print "SYSTEM INFO (device)"
run_cmd curl -s "http://$DEVICE_IP/system_information.fcgi?session=$SESSION"

# 3) get_catra_info (may be unsupported)
print "GET_CATRA_INFO (device)"
run_cmd curl -s "http://$DEVICE_IP/get_catra_info.fcgi?session=$SESSION"

# 4) Users create/list/update/delete
print "LIST USERS (device)"
run_cmd curl -s -X POST "http://$DEVICE_IP/load_objects.fcgi?session=$SESSION" -H "Content-Type: application/json" -d '{"object":"users","limit":5}'

print "CREATE USER (device)"
CREG='{"object":"users","values":[{"name":"TEST_SCRIPT","registration":"'$(date +%s)'"}]}'
run_cmd curl -s -X POST "http://$DEVICE_IP/create_objects.fcgi?session=$SESSION" -H "Content-Type: application/json" -d "$CREG"

# Find created user
REG=$(echo "$CREG" | sed -n 's/.*"registration":"\([^"]*\)".*/\1/p')
print "FIND CREATED USER by registration=$REG"
FOUND=$(curl -s -X POST "http://$DEVICE_IP/load_objects.fcgi?session=$SESSION" -H "Content-Type: application/json" \
  -d "{\"object\":\"users\",\"where\":[{\"object\":\"users\",\"field\":\"registration\",\"value\":\"$REG\"}]}" )
echo "$FOUND" | sed 's/^/    /'
CREATED_ID=$(echo "$FOUND" | sed -n 's/.*"id":[[:space:]]*\([0-9]*\).*/\1/p' || true)

if [ -n "$CREATED_ID" ]; then
  echo "    Created user id: $CREATED_ID"
  print "UPDATE CREATED USER (device)"
  run_cmd curl -s -X POST "http://$DEVICE_IP/modify_objects.fcgi?session=$SESSION" -H "Content-Type: application/json" \
    -d "{\"object\":\"users\",\"values\":{\"name\":\"TEST_SCRIPT_UPDATED\"},\"where\":{\"users\":{\"id\":$CREATED_ID}}}"
  print "DESTROY CREATED USER (device)"
  run_cmd curl -s -X POST "http://$DEVICE_IP/destroy_objects.fcgi?session=$SESSION" -H "Content-Type: application/json" \
    -d "{\"object\":\"users\",\"where\":{\"users\":{\"id\":$CREATED_ID}}}"
else
  echo "    [WARN] Não localizou usuário criado."
fi

# 5) Server API
print "LIST USERS (server API)"
run_cmd curl -s "http://$SERVER_IP:$SERVER_PORT/api/users"

# 6) Groups
print "CREATE + LIST GROUP (device)"
run_cmd curl -s -X POST "http://$DEVICE_IP/create_objects.fcgi?session=$SESSION" -H "Content-Type: application/json" \
   -d '{"object":"groups","values":[{"name":"TEST_GROUP"}]}'
run_cmd curl -s -X POST "http://$DEVICE_IP/load_objects.fcgi?session=$SESSION" -H "Content-Type: application/json" -d '{"object":"groups","limit":5}'

# 7) Access rules
print "CREATE ACCESS_RULE (device)"
run_cmd curl -s -X POST "http://$DEVICE_IP/create_objects.fcgi?session=$SESSION" -H "Content-Type: application/json" \
   -d '{"object":"access_rules","values":[{"name":"TEST_RULE","type":0}]}'

# 8) Time zones / time spans
print "CREATE TIME_ZONE + TIME_SPAN (device)"
run_cmd curl -s -X POST "http://$DEVICE_IP/create_objects.fcgi?session=$SESSION" -H "Content-Type: application/json" \
  -d '{"object":"time_zones","values":[{"name":"TZ_TEST"}]}'
run_cmd curl -s -X POST "http://$DEVICE_IP/create_objects.fcgi?session=$SESSION" -H "Content-Type: application/json" \
  -d '{"object":"time_spans","values":[{"time_zone_id":1,"day":1,"start":28800,"end":61200}]}'

# 9) Access logs
print "LOAD ACCESS_LOGS (device)"
run_cmd curl -s -X POST "http://$DEVICE_IP/load_objects.fcgi?session=$SESSION" -H "Content-Type: application/json" -d '{"object":"access_logs","limit":5}'

# 10) Execute action (may vary)
print "EXECUTE ACTION (device)"
run_cmd curl -s -X POST "http://$DEVICE_IP/execute_actions.fcgi?session=$SESSION" -H "Content-Type: application/json" \
  -d '{"actions":[{"action":"door","parameters":"door=1"}]}'

# 11) Facial image tests (if TEST_IMAGE exists)
if [ -f "$TEST_IMAGE" ]; then
  print "USER IMAGE UPLOAD"
  target_user="${CREATED_ID:-10}"
  run_cmd curl -s -X POST "http://$DEVICE_IP/user_set_image.fcgi?user_id=${target_user}&match=1&session=${SESSION}" \
      -H "Content-Type: application/octet-stream" --data-binary @"$TEST_IMAGE"
  print "USER IMAGE GET (device)"
  run_cmd curl -s -X POST "http://$DEVICE_IP/user_get_image.fcgi?user_id=${target_user}&session=${SESSION}" --output "$TMP/user_${target_user}.jpg" && echo "    saved $TMP/user_${target_user}.jpg"
else
  echo "    [SKIP] TEST_IMAGE not found: $TEST_IMAGE"
fi


# 13) Report generate
print "REPORT GENERATE (device)"
run_cmd curl -s -X POST "http://$DEVICE_IP/report_generate.fcgi?session=$SESSION" -H "Content-Type: application/json" \
  -d '{"object":"users","order":["ascending","name"],"where":{},"delimiter":";"}'

# 14) Hash password
print "HASH PASSWORD"
run_cmd curl -s -X POST "http://$DEVICE_IP/user_hash_password.fcgi?session=$SESSION" -H "Content-Type: application/json" -d '{"password":"abc123"}'

print "DONE - Temporary files at $TMP"

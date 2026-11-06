# shellcheck shell=bash
# Sourced by deploy.sh and sync-secrets.sh. Not executable on its own.
#
# The Worker secrets the deploy scripts manage. GitHub's secrets context holds
# every secret the job can see (repo, environment and org level), so only the
# names listed here are ever set on, or deleted from, the Worker. Any other
# Worker secret is left alone.
#
# To add a secret: declare it in astro.config.mjs (env.schema), add it here,
# then set it in the GitHub environment.
MANAGED_SECRETS=(
  RESEND_API_KEY
)

# The managed names as a JSON array.
managed_secrets_names_json() {
  printf '%s\n' "${MANAGED_SECRETS[@]}" | jq -R . | jq -sc .
}

# Reads a secrets context (JSON object) on stdin and prints the managed
# secrets that have a non-empty value, as a JSON object.
managed_secrets_from_context() {
  jq -c --argjson managed "$(managed_secrets_names_json)" '
    with_entries(select(.key as $k | $managed | index($k)))
    | with_entries(select(.value | type == "string" and length > 0))
  '
}

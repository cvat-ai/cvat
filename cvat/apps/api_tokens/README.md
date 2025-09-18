# API Tokens

This application implements support for Personal API Access Tokens (PAT).

## Configuration

Check `default_settings.py` for the list of configurable variables.

### OPA Rules

This component introduces new elements that can be used in OPA permission checks. For each
base permission package (typically defined in `apps/*/rules/`) there can now be
a set of extension packages (a set of drop-in plugin files) that add extra permission logic.
Each extension has to use the following name pattern:

`rules/api_token_plugin.<any name>.rego`

and define a package with the `api_token_plugin.<base package name>` name.
Each plugin extends the base permission package, which name is determined by
the plugin package name after the prefix. Plugins receive the base permission package
input and also an extended part that includes:

- `input.auth.token`
  - `.id` - the id of the API Token used for the client authentication.
  - `.read_only` - the `read_only` property of the API Token.

Additionally, plugins can use the `data.utils.api_token.is_api_token` variable to check
if the client is using an API token.

Such plugins are expected to include rules that allow or disallow operations
for API token-authenticated clients. if the default behavior doesn't fit the component needs.
Default rules for API token-authenticated clients:
- if the token is not `read_only`, all endpoints are allowed
- if the token is `read_only`, only "safe" operations are permitted
  (i.e. `GET`, `OPTIONS`, `HEAD` endpoint methods)

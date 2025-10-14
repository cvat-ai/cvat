# API Access Tokens

This application implements support for Personal API Access Tokens (PAT).

## Configuration

Check `default_settings.py` for the list of configurable variables.

### OPA Rules

This component introduces new elements that can be used in OPA permission checks. For each
base permission package (typically defined in `apps/*/rules/`) there can now be
a set of extension packages (a set of drop-in plugin files) that add extra permission logic.
Each extension has to use the following filename pattern:

`rules/[optional_prefix.]access_token_plugin.<any name>.rego`

and define a package with the `[optional_prefix.]access_token_plugin.<base package name>` name.
Each plugin extends the base permission package, which name is determined by
the plugin package name after the `access_token_plugin.` prefix.
Plugins receive the base permission package input and also an extended part that includes:

- `input.auth.token`
  - `.id` - the id of the API Access Token used for the client authentication.
  - `.read_only` - the `read_only` property of the API Access Token.

Such plugins are expected to include rules that allow or disallow operations
for token-authenticated clients, if the default behavior doesn't fit the component needs.
Default rules for token-authenticated clients:
- if the token is not `read_only`, all endpoints are allowed
- if the token is `read_only`, only "safe" operations are permitted
  (i.e. `GET`, `OPTIONS`, `HEAD` endpoint methods)

Rules defined in the access token permission plugins are checked only if the client
uses an access token in the request.

Permission plugins follow the same rules as the other permission packages, which means it's
impossible to allow something, if it's prohibited by the rules in the base package.

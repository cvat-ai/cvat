## Problem

Currently, CLI supports 2 authentication options \- with the *\--auth* argument and with the *CVAT\_ACCESS\_TOKEN* environment variable. It means that for each command, the user has to specify at least one of these values. It has the following problems:

* Extra typing for each invocation adds more friction and slows down the workflow. This becomes annoying quite fast.
* The values can get saved in the command history in the user command shell, reducing security.
* If the user types the values, they can be recorded or photographed, and stolen, which also reduces security.

### Possible solutions

1. Interactive mode for CLI
- If you need to run several commands, you can enter a special mode, which will use the same configuration
- Examples: psql, bash, python
- Cons: a whole interactive mode is going to be hard to implement. The potential benefits of such a mode can be achieved cheaper.
2. Remembering configuration, default configuration, remembered authentication
- Examples:
  - awscli can remember authentication per bucket
  - docker \--login
  - git config \--local/global user.name/user.email per repository and per remote, also in remote urls and repo urls
  - git/VS code can use system credential manager, if available
  - ssh can save hosts and allows passwordless auth
  - various password managers
  - many other apps can save credentials
- PoC: [https://github.com/cvat-ai/husqvarna/blob/165824dfb43045925772606f7440cc9a8e91baab/scripts/shared/cvat\_client.py\#L157](https://github.com/cvat-ai/husqvarna/blob/165824dfb43045925772606f7440cc9a8e91baab/scripts/shared/cvat_client.py#L157). Remembering the last auth and setting the default host to [app.cvat.ai](http://app.cvat.ai) is confirmed to work well. It significantly speeds up the workflow and allows the reuse of authentication from CLI in custom scripts.

## Changes

### Definitions:

* auth\_id \- the name of a remembered PAT authentication

### CLI:

* cvat-cli auth list
  * Lists the remembered authentications for all or specified hosts
  * Args:
    * \[--all\]
    * global \--server-host, \--server-port
  * Outputs:
    * A list of \<host:port\> \<auth\_id\> \<is\_default\> lines
* cvat-cli auth login
  * Adds a new remembered authentication for a host. Only a PAT can be used and remembered.
  * Args:
    * \[*CVAT\_ACCESS\_TOKEN*\] or requests PAT input
    * global \--server-host, \--server-port
    * \[--set-default\] \- sets the new auth to be the host default. The only host auth is selected to be the default automatically.
    * \[--name\] \- can be used to define a custom auth\_id for the new remembered PAT. By default, requests from the server via the */auth/api\_tokens/self* endpoint (the *.name* field).
    * \[--file\] \- can be used to read the PAT from the file instead of requesting input
* cvat-cli auth logout
  * Removes an authentication for the specified host
  * Args:
    * global \--server-host, \--server-port
    * \[\<auth\_id\>\] \- auth\_id to remove
* cvat-cli auth default
  * Prints or sets the default auth for the host
  * Args:
    * global \--server-host, \--server-port
    * \[\<auth\_id\>\] \- auth to be used by default
  * Outputs:
    * \<auth\_id\> or an error code if no entries
* cvat-cli
  * Args:
    * \--auth
      * Value “\<auth\_id\>”
        * Can be used to specify a remembered PAT for the command execution
      * Can be passed via the *CVAT\_AUTH* env var (the value format is “\<token\>” or “\<username\>:\<password\>”)
        * Can be used to specify a PAT for the command execution
        * Should be remembered for the host as if it was called via cvat-cli auth login
  * Commands that require login should try to use the remembered default auth for the host first if global \--auth is not specified

### Storage:

A new local data storage is introduced for CVAT SDK and CLI. It can include saved settings, cache etc.

* Location: \<user\>/cvat/auth.json
* Access permissions:
  * SSH-like 600
  * If the file or the parent directory have wrong permissions, they must not be used.

### SDK

* A new function to add standard global parameters to an argument parser
* A new function to create a Client instance from standard CLI parameters
* A new function to create a Client instance bound to a given saved CVAT server instance
* Interfaces to manage the user profile directory

Interface example:
def main(args: Optional[list[str]] = None) -> int:
   parser = ArgumentParser()
   add_cli_parser_args(parser)
   parsed_args = parser.parse_args(args)

   with make_client_from_cli(parsed_args) as client:

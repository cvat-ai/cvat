ARG OPA_VERSION=0.34.2-rootless
FROM openpolicyagent/opa:${OPA_VERSION}
COPY --chown=${USER} ./cvat/apps/iam/rules /rules
CMD ["run", "--server", "--addr", ":8181", "--set=decision_logs.console=true", "/rules"]

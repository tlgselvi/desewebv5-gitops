package kubernetes.admission

# Deny privileged containers for security best practices
deny[msg] {
    input.request.kind.kind == "Pod"
    container := input.request.object.spec.containers[_]
    container.securityContext.privileged == true
    msg := sprintf("Privileged container '%v' is not allowed. Security context disabled.", [container.name])
}

deny[msg] {
    input.request.kind.kind == "Pod"
    container := input.request.object.spec.initContainers[_]
    container.securityContext.privileged == true
    msg := sprintf("Privileged init container '%v' is not allowed. Security context disabled.", [container.name])
}

# Deny containers running as root user
deny[msg] {
    input.request.kind.kind == "Pod"
    container := input.request.object.spec.containers[_]
    container.securityContext.runAsUser == 0
    msg := sprintf("Container '%v' cannot run as root (UID 0). Use a non-root user.", [container.name])
}

# Deny containers running as root user (init containers)
deny[msg] {
    input.request.kind.kind == "Pod"
    container := input.request.object.spec.initContainers[_]
    container.securityContext.runAsUser == 0
    msg := sprintf("Init container '%v' cannot run as root (UID 0). Use a non-root user.", [container.name])
}

# Require readOnlyRootFilesystem
deny[msg] {
    input.request.kind.kind == "Pod"
    container := input.request.object.spec.containers[_]
    not container.securityContext.readOnlyRootFilesystem
    msg := sprintf("Container '%v' must use readOnlyRootFilesystem for enhanced security.", [container.name])
}

# Deny hostPath mounts (security risk)
deny[msg] {
    input.request.kind.kind == "Pod"
    volume := input.request.object.spec.volumes[_]
    volume.hostPath
    msg := sprintf("HostPath mount '%v' is not allowed for security reasons.", [volume.name])
}

# Require security context at pod level
deny[msg] {
    input.request.kind.kind == "Pod"
    not input.request.object.spec.securityContext
    msg := "Pod must define securityContext for enhanced security."
}


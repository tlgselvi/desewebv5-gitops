package kubernetes.namespace

# Define allowed namespaces for production deployment
allowed_namespaces := {"production", "dese-ea-plan-v5", "dese-ea-plan-v5-staging", "monitoring", "argocd"}

# Deny resources created in unallowed namespaces
deny[msg] {
    # Check if namespace is not in the allowed list
    namespace := input.request.object.metadata.namespace
    not contains(allowed_namespaces, namespace)
    msg := sprintf("Namespace '%v' is not allowed. Allowed namespaces: %v", [namespace, concat(", ", allowed_namespaces)])
}

# Allow all resources in system namespaces
allow {
    namespace := input.request.object.metadata.namespace
    system_namespaces := {"kube-system", "kube-public", "kube-node-lease"}
    contains(system_namespaces, namespace)
}

# Allow resources in explicitly allowed namespaces
allow {
    namespace := input.request.object.metadata.namespace
    contains(allowed_namespaces, namespace)
}

# Helper function to check if value is in set
contains(set, elem) {
    set[_] == elem
}

# Deny if namespace is explicitly blocked
blocked_namespaces := {"default", "test", "dev"}
deny[msg] {
    namespace := input.request.object.metadata.namespace
    contains(blocked_namespaces, namespace)
    msg := sprintf("Namespace '%v' is blocked for security reasons. Use one of the allowed namespaces: %v", [namespace, concat(", ", allowed_namespaces)])
}


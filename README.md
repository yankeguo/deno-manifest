# deno-manifest

A GitOps tool that aggregates all default TypeScript exports from a directory into a Kubernetes resource list (JSON format) for streamlined GitOps workflows.

> [!WARNING]
>
> Due to the limitation of `deno`'s dynamic import, this project uses child process to evaluate `.ts` files.

## Features

- 🔄 **Automatic Discovery**: Recursively finds all `.ts` and `.mts` files in your project
- 📦 **Smart Aggregation**: Combines default exports into a single Kubernetes List resource
- 🚀 **Function Support**: Automatically calls exported functions to generate dynamic resources
- 🎯 **GitOps Ready**: Outputs valid Kubernetes manifests in JSON format for direct use in GitOps workflows
- 🛡️ **Safe Filtering**: Excludes test files, definition files, and hidden files automatically

## Why TypeScript?

Unlike other manifest generation approaches like Jsonnet, Kustomize, or plain YAML templating, our TypeScript-based solution offers significant advantages:

### 🎯 **Type Safety with Official Kubernetes Types**

- Leverage official Kubernetes NPM packages (e.g., `@kubernetes/client-node`) for complete type definitions
- Get compile-time validation of resource schemas
- Catch configuration errors before deployment, not during runtime

### 💡 **Superior Developer Experience**

- **IDE Intelligence**: Full IntelliSense support with auto-completion for all Kubernetes resource fields
- **Immediate Feedback**: See errors as you type - misspelled fields, wrong types, or invalid configurations are highlighted instantly
- **Documentation at Your Fingertips**: Hover over any field to see its documentation from the official Kubernetes API

### 🔧 **Powerful Language Features**

- Use the full power of TypeScript: conditionals, loops, functions, and modules
- Import and reuse common configurations across manifests
- Leverage npm ecosystem for utility libraries
- Write unit tests for your manifest generation logic

### 📝 **Example: Type Safety in Action**

With TypeScript and Kubernetes types:

```typescript
import { V1Deployment } from "@kubernetes/client-node";

// TypeScript catches errors immediately!
const deployment: V1Deployment = {
  apiVersion: "apps/v1",
  kind: "Deployment",
  metadata: {
    name: "my-app",
    // TypeScript error: 'lables' does not exist. Did you mean 'labels'?
    lables: { app: "my-app" },
  },
  spec: {
    // TypeScript error: Type 'string' is not assignable to type 'number'
    replicas: "3",
    selector: {
      matchLabels: { app: "my-app" },
    },
    template: {
      // Full auto-completion for all nested fields!
      metadata: { labels: { app: "my-app" } },
      spec: {
        containers: [
          {
            name: "app",
            image: "my-app:latest",
            // TypeScript knows this should be an array of objects
            ports: [{ containerPort: 8080 }],
          },
        ],
      },
    },
  },
};
```

Compare this to Jsonnet or plain YAML where:

- ❌ No immediate feedback on typos or wrong field names
- ❌ No type checking for values (strings vs numbers vs objects)
- ❌ No auto-completion or IntelliSense
- ❌ Errors only discovered at deployment time

## Installation

```bash
# Install directly from source
deno install -A --name deno-manifest https://raw.githubusercontent.com/yankeguo/deno-manifest/main/main.ts

# Or run directly without installation
deno run -A https://raw.githubusercontent.com/yankeguo/deno-manifest/main/main.ts

# Or use my short link
deno run -A https://gyk.me/r/deno-manifest.ts
```

## Usage

### Basic Usage

Navigate to your directory containing TypeScript files and run:

```bash
# Output JSON to stdout
deno-manifest

# Save JSON output to file
deno-manifest > manifests.json

# Convert to YAML if needed (requires yq)
deno-manifest | yq eval -P > manifests.yaml
```

### Example Project Structure

```
my-app/
├── deployment.ts
├── service.ts
├── configmap.ts
├── components/
│   ├── redis.ts
│   └── postgres.ts
└── _test.ts          # Ignored (starts with _)
```

### Example TypeScript Files

**deployment.ts**:

```typescript
export default {
  apiVersion: "apps/v1",
  kind: "Deployment",
  metadata: {
    name: "my-app",
    namespace: "default",
  },
  spec: {
    replicas: 3,
    selector: {
      matchLabels: { app: "my-app" },
    },
    template: {
      metadata: {
        labels: { app: "my-app" },
      },
      spec: {
        containers: [
          {
            name: "app",
            image: "my-app:latest",
            ports: [{ containerPort: 8080 }],
          },
        ],
      },
    },
  },
};
```

**service.ts**:

```typescript
export default {
  apiVersion: "v1",
  kind: "Service",
  metadata: {
    name: "my-app-service",
    namespace: "default",
  },
  spec: {
    selector: { app: "my-app" },
    ports: [
      {
        port: 80,
        targetPort: 8080,
      },
    ],
    type: "ClusterIP",
  },
};
```

**configmap.ts** (Dynamic generation):

```typescript
export default function () {
  return {
    apiVersion: "v1",
    kind: "ConfigMap",
    metadata: {
      name: "my-app-config",
      namespace: "default",
    },
    data: {
      "config.yaml": `
env: ${Deno.env.get("NODE_ENV") || "development"}
timestamp: ${new Date().toISOString()}
      `.trim(),
    },
  };
}
```

**components/redis.ts** (Multiple resources):

```typescript
const namespace = "default";

export default [
  {
    apiVersion: "apps/v1",
    kind: "Deployment",
    metadata: {
      name: "redis",
      namespace,
    },
    spec: {
      replicas: 1,
      selector: { matchLabels: { app: "redis" } },
      template: {
        metadata: { labels: { app: "redis" } },
        spec: {
          containers: [
            {
              name: "redis",
              image: "redis:7-alpine",
              ports: [{ containerPort: 6379 }],
            },
          ],
        },
      },
    },
  },
  {
    apiVersion: "v1",
    kind: "Service",
    metadata: {
      name: "redis",
      namespace,
    },
    spec: {
      selector: { app: "redis" },
      ports: [{ port: 6379, targetPort: 6379 }],
    },
  },
];
```

### Generated Output

Running `deno-manifest` on the above structure produces:

```json
{
  "apiVersion": "v1",
  "kind": "List",
  "items": [
    {
      "apiVersion": "apps/v1",
      "kind": "Deployment",
      "metadata": {
        "name": "my-app",
        "namespace": "default"
      },
      "spec": {
        "replicas": 3,
        "selector": {
          "matchLabels": { "app": "my-app" }
        },
        "template": {
          "metadata": {
            "labels": { "app": "my-app" }
          },
          "spec": {
            "containers": [
              {
                "name": "app",
                "image": "my-app:latest",
                "ports": [{ "containerPort": 8080 }]
              }
            ]
          }
        }
      }
    },
    {
      "apiVersion": "v1",
      "kind": "Service",
      "metadata": {
        "name": "my-app-service",
        "namespace": "default"
      },
      "spec": {
        "selector": { "app": "my-app" },
        "ports": [
          {
            "port": 80,
            "targetPort": 8080
          }
        ],
        "type": "ClusterIP"
      }
    },
    {
      "apiVersion": "v1",
      "kind": "ConfigMap",
      "metadata": {
        "name": "my-app-config",
        "namespace": "default"
      },
      "data": {
        "config.yaml": "env: development\ntimestamp: 2024-01-15T10:30:00.000Z"
      }
    },
    {
      "apiVersion": "apps/v1",
      "kind": "Deployment",
      "metadata": {
        "name": "redis",
        "namespace": "default"
      },
      "spec": {
        "replicas": 1,
        "selector": { "matchLabels": { "app": "redis" } },
        "template": {
          "metadata": { "labels": { "app": "redis" } },
          "spec": {
            "containers": [
              {
                "name": "redis",
                "image": "redis:7-alpine",
                "ports": [{ "containerPort": 6379 }]
              }
            ]
          }
        }
      }
    },
    {
      "apiVersion": "v1",
      "kind": "Service",
      "metadata": {
        "name": "redis",
        "namespace": "default"
      },
      "spec": {
        "selector": { "app": "redis" },
        "ports": [{ "port": 6379, "targetPort": 6379 }]
      }
    }
  ]
}
```

## Use Cases

### 1. GitOps Workflows

```bash
# Generate manifests and apply to cluster (JSON format)
deno-manifest | kubectl apply -f -

# Save JSON to file for GitOps repository
deno-manifest > k8s-manifests.json
git add k8s-manifests.json
git commit -m "feat: update kubernetes manifests"

# Convert to YAML if your GitOps workflow prefers YAML
deno-manifest | yq eval -P > k8s-manifests.yaml
```

### 2. Environment-Specific Configurations

Create different directories for different environments:

```
environments/
├── development/
│   ├── deployment.ts
│   └── service.ts
├── staging/
│   ├── deployment.ts
│   └── service.ts
└── production/
    ├── deployment.ts
    └── service.ts
```

```bash
# Generate manifests for specific environment
cd environments/production
deno-manifest > ../../manifests/production.json
```

### 3. Dynamic Resource Generation

Use TypeScript's power for dynamic configurations:

```typescript
// scaling.ts
export default function () {
  const replicas = Deno.env.get("REPLICAS") || "3";
  const environment = Deno.env.get("ENVIRONMENT") || "development";

  return {
    apiVersion: "apps/v1",
    kind: "Deployment",
    metadata: {
      name: `app-${environment}`,
      labels: {
        environment,
        "managed-by": "deno-manifest",
      },
    },
    spec: {
      replicas: parseInt(replicas),
      // ... rest of deployment spec
    },
  };
}
```

## File Patterns

### Included Files

- `*.ts` - TypeScript files
- `*.mts` - TypeScript module files

### Excluded Files

- Files starting with `.` or `_` (hidden/private files)
- `*.d.ts`, `*.d.mts` - TypeScript definition files
- `*_test.ts`, `*_test.mts` - Test files
- Files in directories starting with `.`, `_`, or `node_modules`

## Export Types

### Object Export

```typescript
export default {
  /* Kubernetes resource */
};
```

### Function Export (Evaluated at runtime)

```typescript
export default function () {
  return {
    /* Kubernetes resource */
  };
}
```

### Array Export (Items are spread into the list)

```typescript
export default [
  {
    /* Resource 1 */
  },
  {
    /* Resource 2 */
  },
];
```

## ArgoCD Integration

`deno-manifest` integrates seamlessly with [ArgoCD](https://argo-cd.readthedocs.io/) as a Config Management Plugin (CMP), enabling you to use TypeScript for generating Kubernetes manifests in your GitOps workflows.

### How It Works

ArgoCD automatically detects TypeScript files in your repository and uses `deno-manifest` to generate Kubernetes resources. No manual configuration or plugin name specification required - it just works!

### Setup

1. **Create the plugin configuration**:

```yaml
# argocd-cm-plugin.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: deno-manifest-plugin
  namespace: argocd
data:
  plugin.yaml: |
    apiVersion: argoproj.io/v1alpha1
    kind: ConfigManagementPlugin
    metadata:
      name: deno-manifest
    spec:
      discover:
        find:
          glob: "**/*.ts"
      generate:
        command:
          - deno
          - run
          - -A
          - https://raw.githubusercontent.com/yankeguo/deno-manifest/main/main.ts
```

2. **Patch the ArgoCD repo server** to add the plugin sidecar:

```yaml
# argocd-repo-server-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
        - name: deno-manifest-plugin
          image: denoland/deno:latest
          command: [/var/run/argocd/argocd-cmp-server]
          securityContext:
            runAsNonRoot: true
            runAsUser: 999
            allowPrivilegeEscalation: false
            capabilities:
              drop:
                - ALL
            readOnlyRootFilesystem: true
            seccompProfile:
              type: RuntimeDefault
          volumeMounts:
            - mountPath: /var/run/argocd
              name: var-files
            - mountPath: /home/argocd/cmp-server/plugins
              name: plugins
            - mountPath: /home/argocd/cmp-server/config/plugin.yaml
              subPath: plugin.yaml
              name: deno-manifest-plugin
            - mountPath: /tmp
              name: tmp
      volumes:
        - configMap:
            name: deno-manifest-plugin
          name: deno-manifest-plugin
        - emptyDir: {}
          name: tmp
```

3. **Apply the configuration**:

```bash
kubectl apply -f argocd-cm-plugin.yaml
kubectl apply -f argocd-repo-server-patch.yaml

# Restart repo server to load the plugin
kubectl rollout restart deployment/argocd-repo-server -n argocd
```

### Usage with ArgoCD Applications

Once the plugin is installed, ArgoCD will automatically use `deno-manifest` for any repository containing TypeScript files:

```yaml
# example-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/yourorg/your-repo
    targetRevision: main
    path: manifests/ # Directory containing your .ts files
    # No plugin specification needed - auto-discovered!
  destination:
    server: https://kubernetes.default.svc
    namespace: default
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

### Environment Variables

You can pass environment variables to your TypeScript manifests through ArgoCD:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
spec:
  source:
    plugin:
      env:
        - name: ENVIRONMENT
          value: production
        - name: REPLICAS
          value: "5"
```

### Advanced: Using a Short URL

For convenience, you can use the short URL in your plugin configuration:

```yaml
generate:
  command:
    - deno
    - run
    - -A
    - https://gyk.me/r/deno-manifest.ts
```

### Benefits

- ✅ **Zero Configuration**: Automatic discovery of TypeScript files
- ✅ **Native Integration**: Uses official Deno image, no custom builds required
- ✅ **Dynamic Manifests**: Full TypeScript runtime for generating manifests
- ✅ **GitOps Ready**: Outputs standard Kubernetes resources compatible with ArgoCD
- ✅ **Environment Support**: Access environment variables for dynamic configurations

## Credits

GUO YANKE, MIT License
